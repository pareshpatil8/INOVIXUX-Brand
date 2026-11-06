import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';
import { InoVirtualScrollerComponent } from '../virtual-scroller/ino-virtual-scroller.component';
import { InoVirtualScrollerItemDirective } from '../virtual-scroller/ino-virtual-scroller.templates';

export interface InoListboxOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Same run-boundary grouping model as `InoSelectOption.group` — see
   *  `web/src/app/components/select/ino-select.component.ts` §3 / this component's SPEC.md §1. */
  group?: string;
}

interface InoListboxRow {
  option: InoListboxOption;
  /** Absolute index into the filtered row list — the roving-`tabindex` target and the id
   *  `optionId()` derives from. */
  index: number;
  groupHeading: string | null;
}

let idCounter = 0;

/** Typeahead buffer resets if the next keystroke arrives more than this long after the last one.
 *  Same window `ino-select`'s own buffer uses (SPEC.md §keyboard). */
const TYPEAHEAD_RESET_MS = 500;

/**
 * `<ino-listbox>` — always-visible WAI-ARIA APG "Listbox" (INO-414, INO-31 Phase B1), the deferred
 * follow-up `<ino-select>`'s own doc comment named: "standalone `Listbox` (always-visible, no
 * trigger/overlay)".
 *
 * Reuses `ino-select`'s (INO-152) option grouping (`group` field, run-boundary headings), filter
 * logic (trim/lowercase/substring) and `<ino-virtual-scroller>` integration threshold, and
 * `ino-multiselect`'s (INO-153) `multiple` membership model — but builds neither component's
 * overlay/trigger/`aria-activedescendant` combobox core, because a listbox has no trigger button and
 * is never collapsed. See SPEC.md §1 for the full lineage.
 *
 * ARIA: WAI-ARIA APG **Listbox** pattern, roving-`tabindex` variant — `role="listbox"` on the
 * container is always in the DOM, real DOM focus moves between `role="option"` rows (exactly one
 * carries `tabindex="0"` at a time, every other row `tabindex="-1"`), and `aria-activedescendant` is
 * never used. This is deliberately the opposite choice from `ino-select`'s SPEC.md §2, which needed
 * `aria-activedescendant` specifically because most rows are absent from the DOM under
 * `<ino-virtual-scroller>`; that tension is resolved here by moving the virtual scroller's window
 * (via its public `scrollToIndex()`) ahead of moving focus — see SPEC.md §4 (a11y) for the full
 * keyboard map and why this is safe.
 *
 * `@Input() value: string | string[]` / `@Output() valueChange` (banana-in-a-box), matching every
 * other Tier-1 form control in this repo — no `ControlValueAccessor`. The type is a union rather
 * than two separate components (mirrors `ino-autocomplete`'s call, not `ino-select`/`ino-multiselect`'s
 * split) — see SPEC.md §2.
 */
@Component({
  selector: 'ino-listbox',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoVirtualScrollerComponent, InoVirtualScrollerItemDirective],
  templateUrl: './ino-listbox.component.html',
  styleUrl: './ino-listbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-listbox',
    '[attr.data-size]': 'size',
    '[class.ino-listbox--selected]': 'valuesArray.length > 0',
    '[class.ino-listbox--filtered-empty]': 'isFilteredEmpty',
  },
})
export class InoListboxComponent implements OnChanges {
  @Input() label = '';
  @Input() options: InoListboxOption[] = [];
  /** `string` when `multiple` is `false` (default), `string[]` when `true`. See SPEC.md §2. */
  @Input() value: string | string[] = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Multi-select membership model, reused from `ino-multiselect` (toggle without losing the other
   *  rows' state) — a listbox row click/`Space` toggles rather than replaces `value`. */
  @Input({ transform: booleanAttribute }) multiple = false;
  /** A listbox's filter box is always visible above the list (not gated behind an "open" panel the
   *  way `ino-select`'s in-panel filter is) — see SPEC.md §3. Defaults to `true`: doc 26 §5 lists
   *  "filter box" as part of this component's baseline structure, not an opt-in extra. */
  @Input({ transform: booleanAttribute }) filter = true;
  @Input() filterLabel = 'Filter';
  @Input() filterPlaceholder = 'Filter…';
  /** Options at or above this count render through `<ino-virtual-scroller>` (reuses T-3) instead of
   *  a plain `*ngFor`, same mechanism/default as `ino-select`/`ino-multiselect`/`ino-autocomplete`. */
  @Input({ transform: numberAttribute }) virtualScrollThreshold = 100;

  @Output() readonly valueChange = new EventEmitter<string | string[]>();
  @Output() readonly filterChange = new EventEmitter<string>();

  /** Custom rendering for one option row. Context: `$implicit` = `InoListboxOption`. */
  @ContentChild('optionTemplate') optionTemplate: TemplateRef<{ $implicit: InoListboxOption }> | null = null;

  @ViewChild('filterInput') private readonly filterInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild(InoVirtualScrollerComponent) private readonly virtualScrollerRef?: InoVirtualScrollerComponent;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly listboxId = `ino-listbox-${++idCounter}`;
  protected readonly hintId = `${this.listboxId}-hint`;
  protected readonly errorId = `${this.listboxId}-error`;

  /** Roving-`tabindex` target — the one row currently focusable via `Tab`. `-1` before the first
   *  render/interaction (no row has received focus yet). */
  protected activeIndex = -1;
  protected filterText = '';

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: InoListboxRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filter']) {
      // Resolved here rather than in `ngAfterViewInit` — both run on pure data (`options`/
      // `filterText`), not the rendered DOM, and `ngOnChanges` runs *before* the first template
      // render. Under `OnPush`, state set in `ngAfterViewInit` reaches the DOM only on some later
      // change-detection pass (there's no automatic one right after it), so the roving-tabindex
      // row would otherwise render as `-1` on everything until an unrelated interaction happened
      // to trigger change detection.
      this.recomputeFiltered();
      this.resetActiveIndex();
    }
  }

  // ── Value shape (SPEC.md §2) ────────────────────────────────────────────────────────────────

  /** Normalizes `value` to an array regardless of `multiple` — the single shared read path every
   *  selection/membership check below uses. Mirrors `ino-autocomplete`'s `valuesArray` getter. */
  get valuesArray(): string[] {
    if (Array.isArray(this.value)) {
      return this.value;
    }
    return this.value ? [this.value] : [];
  }

  get filteredRows(): InoListboxRow[] {
    return this.filteredCache;
  }

  get useVirtualScroll(): boolean {
    return this.filteredRows.length >= this.virtualScrollThreshold;
  }

  /** `filtered-empty` state (SPEC.md §5) — a non-empty query narrowed the list to nothing, distinct
   *  from the genuinely-empty-options starting state. */
  get isFilteredEmpty(): boolean {
    return this.filterText.trim().length > 0 && this.filteredRows.length === 0;
  }

  get emptyMessage(): string {
    return this.filterText.trim() ? 'No options match your filter.' : 'No options.';
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  protected isActiveTabStop(index: number): boolean {
    return index === this.activeIndex;
  }

  protected isSelected(option: InoListboxOption): boolean {
    return this.valuesArray.includes(option.value);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  /** Click/`Enter`/`Space` on a row. Single-selection: replaces `value` (never toggles off — a
   *  listbox always has exactly one selected row once a choice has been made, matching
   *  `ino-select`'s single-selection model). Multi-selection: toggles membership, reusing
   *  `ino-multiselect`'s toggle-and-stay-open model (there is no "stay open" concept here, but
   *  the toggle itself, and the "never lock out a currently-selected row" refusal rule, carry over
   *  verbatim). */
  activateOption(row: InoListboxRow): void {
    if (this.disabled || this.readonly || this.loading || row.option.disabled) {
      return;
    }
    this.activeIndex = row.index;
    if (this.multiple) {
      this.toggleOption(row.option);
    } else {
      this.selectOption(row.option);
    }
    this.focusActiveOption();
  }

  private selectOption(option: InoListboxOption): void {
    this.value = option.value;
    this.valueChange.emit(option.value);
  }

  private toggleOption(option: InoListboxOption): void {
    const values = this.valuesArray;
    const selected = values.includes(option.value);
    const next = selected ? values.filter((v) => v !== option.value) : [...values, option.value];
    this.value = next;
    this.valueChange.emit(next);
  }

  // ── Filter (always-visible search box, SPEC.md §3) ─────────────────────────────────────────

  onFilterInput(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.filterChange.emit(this.filterText);
    this.recomputeFiltered();
    this.resetActiveIndex();
  }

  onFilterKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      // Moves real DOM focus from the filter box into the list — the filter box itself has no
      // `aria-activedescendant` relationship to the rows (that model is deliberately not used
      // here, see the class doc comment), so "enter the list" has to be an explicit focus move.
      event.preventDefault();
      if (this.activeIndex < 0) {
        this.resetActiveIndex();
      }
      this.focusActiveOption();
    } else if (event.key === 'Escape' && this.filterText) {
      event.preventDefault();
      this.filterText = '';
      this.filterChange.emit('');
      this.recomputeFiltered();
      this.resetActiveIndex();
    }
  }

  // ── Keyboard (roving tabindex — SPEC.md §4) ────────────────────────────────────────────────

  onOptionKeydown(event: KeyboardEvent, row: InoListboxRow): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
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
        event.preventDefault();
        this.jumpActive(this.filteredRows.findIndex((r) => !r.option.disabled));
        break;
      case 'End':
        event.preventDefault();
        this.jumpActive(findLastIndex(this.filteredRows, (r) => !r.option.disabled));
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.activateOption(row);
        break;
      default:
        if (event.key.length === 1) {
          this.typeahead(event.key);
        }
    }
  }

  /** `ArrowUp`/`ArrowDown` — moves the roving `tabindex` (clamped, no wrap). Single-selection mode
   *  also updates `value` to the newly-focused row (APG: focus and selection move together for a
   *  single-select listbox using arrow keys); multi-selection mode moves focus only — `Space`
   *  toggles membership separately (SPEC.md §4). */
  private moveActive(delta: number): void {
    const enabled = this.filteredRows.map((r, i) => (r.option.disabled ? -1 : i)).filter((i) => i >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.jumpActive(enabled[nextPos]);
  }

  /** `Home`/`End`/typeahead landing — same focus+selection coupling `moveActive` documents. */
  private jumpActive(index: number): void {
    if (index < 0) {
      return;
    }
    this.activeIndex = index;
    if (!this.multiple) {
      const option = this.filteredRows[index]?.option;
      if (option) {
        this.selectOption(option);
      }
    }
    this.focusActiveOption();
  }

  private typeahead(char: string): void {
    if (this.typeaheadTimer) {
      clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadBuffer += char.toLowerCase();
    this.typeaheadTimer = setTimeout(() => (this.typeaheadBuffer = ''), TYPEAHEAD_RESET_MS);

    const startIndex = this.activeIndex + 1;
    const rows = this.filteredRows;
    for (let offset = 0; offset < rows.length; offset++) {
      const row = rows[(startIndex + offset) % rows.length];
      if (!row.option.disabled && row.option.label.toLowerCase().startsWith(this.typeaheadBuffer)) {
        this.jumpActive(row.index);
        return;
      }
    }
  }

  /** Sets `activeIndex` to the first selected row, or the first enabled row when nothing is
   *  selected yet — without emitting `valueChange` (this only seeds the roving tab stop, it must
   *  not silently select a row the caller never chose). */
  private resetActiveIndex(): void {
    const rows = this.filteredRows;
    const selectedIndex = rows.findIndex((r) => this.isSelected(r.option));
    this.activeIndex = selectedIndex >= 0 ? selectedIndex : rows.findIndex((r) => !r.option.disabled);
  }

  /** Moves real DOM focus to `activeIndex`'s row. When virtualized, the row may not be in the DOM
   *  yet — `scrollToIndex()` brings its window into range first, then a microtask (same idiom
   *  `ino-select` uses to focus its filter input after the panel opens) looks the element up by id
   *  once change detection has re-rendered the window. See SPEC.md §4 for why roving `tabindex`
   *  still works under `<ino-virtual-scroller>` despite most rows being absent from the DOM most of
   *  the time. */
  private focusActiveOption(): void {
    if (this.activeIndex < 0) {
      return;
    }
    if (this.useVirtualScroll) {
      this.virtualScrollerRef?.scrollToIndex(this.activeIndex);
    }
    // Attribute-selector form rather than `#${CSS.escape(id)}` — these generated ids are always
    // plain alphanumeric-and-hyphen strings, so no escaping is needed, and `CSS.escape` isn't
    // implemented in every test/runtime environment (e.g. jsdom).
    const id = this.optionId(this.activeIndex);
    queueMicrotask(() => {
      this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)?.focus();
    });
  }

  // ── Grouping / filtering (verbatim from `ino-select`) ──────────────────────────────────────

  private recomputeFiltered(): void {
    const query = this.filterText.trim().toLowerCase();
    const matches = query
      ? this.options.filter((option) => option.label.toLowerCase().includes(query))
      : this.options;

    let lastGroup: string | null | undefined = undefined;
    this.filteredCache = matches.map((option, index) => {
      const groupHeading = option.group && option.group !== lastGroup ? option.group : null;
      lastGroup = option.group ?? null;
      return { option, index, groupHeading };
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) {
      return i;
    }
  }
  return -1;
}
