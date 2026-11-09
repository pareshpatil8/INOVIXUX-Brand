import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';

/** One actionable row. `id` is the value carried by `select` — label/description are the only
 *  text the client-side filter matches against (SPEC.md §6). */
export interface InoCommandMenuItem {
  id: string;
  label: string;
  description?: string;
  /** Right-aligned hint text (e.g. `'⌘S'`), decorative only — never the real binding, same
   *  "text, not a live accelerator" convention as every other shortcut-hint field in this repo. */
  shortcutLabel?: string;
  disabled?: boolean;
}

/** A curated section of the command catalog (e.g. "Navigation", "Actions"). `heading` is
 *  optional — an un-headed group still renders its items, just with no heading row above them.
 *  See SPEC.md §1 for why this is a nested array rather than `ino-select`'s flat `group` field. */
export interface InoCommandMenuGroup {
  heading?: string;
  items: InoCommandMenuItem[];
}

interface InoCommandMenuRow {
  item: InoCommandMenuItem;
  /** Absolute index into the flattened row list — the value `aria-activedescendant` tracks. */
  index: number;
  groupHeading: string | null;
}

let idCounter = 0;

/** Debounce window for the `search` output — same value and rationale as `ino-autocomplete`'s
 *  own `SEARCH_DEBOUNCE_MS`. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * `<ino-command-menu>` — ⌘K command palette: a dialog containing a search box, grouped results,
 * and a "recent" section shown only while the query is empty. Doc 26 §5 row `ino-command-menu`
 * (rev-2 amendment `a21a93c`). Board approval `f55baa72` on INO-377. Issue: INO-433. Web-only,
 * flagship portal feature per the spec row's Notes column — no mobile port.
 *
 * Contract: docs/brand/06-angular-components/command-menu.md. Decisions record: `SPEC.md`.
 *
 * **Dialog shell.** Reuses `[inoFocusTrap]` directly (T-11) rather than wrapping `<ino-modal>` —
 * a command palette has no header/footer/drag/maximize chrome to inherit, and it anchors near the
 * top of the viewport rather than centering, matching every reference ⌘K implementation (VS Code,
 * Linear, GitHub, Raycast). See SPEC.md §4.
 *
 * **Combobox, not listbox.** The search input stays focused for the whole interaction and rows
 * are tracked via `aria-activedescendant` (`ino-autocomplete`'s model), not `ino-listbox`'s
 * roving-`tabindex` — the input must stay the only tabbable element inside the trap so Tab has
 * nothing to cycle through except itself. See SPEC.md §3.
 *
 * **Global hotkey.** The host element is always in the DOM (only the dialog markup is `*ngIf`'d),
 * so a document-level ⌘K/Ctrl+K listener can open (or close, toggling) the palette regardless of
 * what currently has focus. Set `[hotkey]="false"` to opt out — e.g. a host app that wires its own
 * keybinding layer to `openMenu()`/`requestClose()`, or a second instance that must not compete
 * for the same shortcut. See SPEC.md §5.
 */
@Component({
  selector: 'ino-command-menu',
  standalone: true,
  imports: [CommonModule, InoFocusTrapDirective],
  templateUrl: './ino-command-menu.component.html',
  styleUrl: './ino-command-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoCommandMenuComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  /** Accessible name for the `dialog` landmark. */
  @Input() label = 'Command menu';
  /** Accessible name for the search `combobox` — the spec row's "search label". */
  @Input() searchLabel = 'Search commands';
  @Input() placeholder = 'Type a command or search…';
  @Input() groups: InoCommandMenuGroup[] = [];
  /** Shown as a leading, unfiltered group while the query is empty; hidden entirely once the
   *  user starts typing. See SPEC.md §2. */
  @Input() recentItems: InoCommandMenuItem[] = [];
  @Input() recentHeading = 'Recent';
  @Input() emptyMessage = 'No results found.';
  /** Async-datasource hook (mirrors `ino-autocomplete`'s `loading`): suppresses nothing by
   *  itself, just swaps the empty-state message to "Searching…" while a `search`-triggered fetch
   *  is in flight. */
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) closeOnSelect = true;
  @Input({ transform: booleanAttribute }) closeOnBackdrop = true;
  @Input({ transform: booleanAttribute }) closeOnEscape = true;
  /** Registers the document-level ⌘K/Ctrl+K open/close toggle. See the class doc comment. */
  @Input({ transform: booleanAttribute }) hotkey = true;

  @Output() readonly openChange = new EventEmitter<boolean>();
  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();
  /** Fires when a row is activated (click, or Enter while active) — payload is the full item, not
   *  just its `id`, so the caller never has to re-look it up. */
  @Output() readonly select = new EventEmitter<InoCommandMenuItem>();
  /** Fires `SEARCH_DEBOUNCE_MS` after the last keystroke in the query — the async-datasource hook,
   *  same contract as `ino-autocomplete`'s `search` output. */
  @Output() readonly search = new EventEmitter<string>();

  protected readonly commandMenuId = `ino-command-menu-${++idCounter}`;
  protected readonly listboxId = `${this.commandMenuId}-listbox`;

  protected queryText = '';
  protected activeIndex = -1;
  protected rows: InoCommandMenuRow[] = [];

  /** Tracks the actual open/closed state, independent of the `open` @Input — same "fire events
   *  exactly once per real transition" rationale as `ino-modal`'s own `isOpenState`. */
  private isOpenState = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['groups'] || changes['recentItems']) {
      this.recomputeRows();
    }
    if (changes['open']) {
      this.setOpen(this.open);
    }
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  /** ⌘K/Ctrl+K toggles the palette from anywhere in the document — see the class doc comment for
   *  why this listener can live on an element that may currently be rendering nothing. */
  @HostListener('document:keydown', ['$event'])
  protected onGlobalKeydown(event: KeyboardEvent): void {
    if (!this.hotkey || event.altKey || event.shiftKey) {
      return;
    }
    if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
      return;
    }
    event.preventDefault();
    this.setOpen(!this.open);
  }

  openMenu(): void {
    this.setOpen(true);
  }

  requestClose(): void {
    this.setOpen(false);
  }

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.requestClose();
    }
  }

  /** The single choke point every path that can change `open` funnels through, mirroring
   *  `ino-modal`'s `setOpen`. Resets the query on every real open so the palette always starts on
   *  "Recent" rather than a stale search from the previous time it was shown. */
  private setOpen(next: boolean): void {
    this.open = next;
    if (this.isOpenState === next) {
      return;
    }
    this.isOpenState = next;
    this.openChange.emit(next);
    if (next) {
      this.queryText = '';
      this.recomputeRows();
      this.activeIndex = this.firstEnabledIndex();
      this.opened.emit();
    } else {
      this.closed.emit();
    }
  }

  // ── Query / filtering (SPEC.md §2) ─────────────────────────────────────────────────────────

  protected onQueryInput(event: Event): void {
    this.queryText = (event.target as HTMLInputElement).value;
    this.recomputeRows();
    this.activeIndex = this.firstEnabledIndex();

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const query = this.queryText;
    this.searchTimer = setTimeout(() => this.search.emit(query), SEARCH_DEBOUNCE_MS);
  }

  protected get isEmpty(): boolean {
    return this.rows.length === 0;
  }

  protected get emptyStateMessage(): string {
    return this.loading ? 'Searching…' : this.emptyMessage;
  }

  private recomputeRows(): void {
    const query = this.queryText.trim().toLowerCase();
    const sourceGroups = query ? this.filterGroups(query) : this.restingGroups();
    this.rows = flattenGroups(sourceGroups);
  }

  /** Query is empty: "Recent" (if any) leads, followed by every configured group, as-is. */
  private restingGroups(): InoCommandMenuGroup[] {
    const recent = this.recentItems.length ? [{ heading: this.recentHeading, items: this.recentItems }] : [];
    return [...recent, ...this.groups].filter((group) => group.items.length > 0);
  }

  /** Query is non-empty: "Recent" drops out entirely (SPEC.md §2); every group's items are
   *  filtered independently and an emptied-out group disappears rather than rendering a heading
   *  over nothing. */
  private filterGroups(query: string): InoCommandMenuGroup[] {
    return this.groups
      .map((group) => ({ heading: group.heading, items: group.items.filter((item) => matchesQuery(item, query)) }))
      .filter((group) => group.items.length > 0);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  protected activateRow(row: InoCommandMenuRow): void {
    if (row.item.disabled) {
      return;
    }
    this.select.emit(row.item);
    if (this.closeOnSelect) {
      this.requestClose();
    }
  }

  private activateActive(): void {
    const row = this.rows[this.activeIndex];
    if (row) {
      this.activateRow(row);
    }
  }

  // ── Keyboard (combobox + listbox-in-dialog — SPEC.md §3) ──────────────────────────────────

  protected onInputKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        if (this.rows.length) {
          event.preventDefault();
          this.activeIndex = this.firstEnabledIndex();
        }
        break;
      case 'End':
        if (this.rows.length) {
          event.preventDefault();
          this.activeIndex = this.lastEnabledIndex();
        }
        break;
      case 'Enter':
        event.preventDefault();
        this.activateActive();
        break;
      case 'Escape':
        if (this.closeOnEscape) {
          event.preventDefault();
          this.requestClose();
        }
        break;
      default:
        // No Tab handling here, deliberately unlike `ino-autocomplete`'s trigger: Tab must stay
        // inside the dialog (the focus trap owns it), never close the palette. See SPEC.md §3.
        break;
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.rows.map((row, index) => (row.item.disabled ? -1 : index)).filter((index) => index >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.activeIndex = enabled[nextPos];
  }

  private firstEnabledIndex(): number {
    return this.rows.findIndex((row) => !row.item.disabled);
  }

  private lastEnabledIndex(): number {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (!this.rows[i].item.disabled) {
        return i;
      }
    }
    return -1;
  }

  // ── Template helpers ────────────────────────────────────────────────────────────────────────

  protected optionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  protected activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }

  protected isActive(index: number): boolean {
    return index === this.activeIndex;
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}

function matchesQuery(item: InoCommandMenuItem, query: string): boolean {
  return item.label.toLowerCase().includes(query) || (item.description ?? '').toLowerCase().includes(query);
}

function flattenGroups(groups: InoCommandMenuGroup[]): InoCommandMenuRow[] {
  const rows: InoCommandMenuRow[] = [];
  let index = 0;
  for (const group of groups) {
    group.items.forEach((item, position) => {
      rows.push({ item, index, groupHeading: position === 0 ? group.heading ?? null : null });
      index++;
    });
  }
  return rows;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
