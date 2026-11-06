import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

export interface InoCascadeSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Presence (non-empty) is what makes a row a drill target instead of a selectable leaf — see
   *  SPEC.md §2. */
  children?: InoCascadeSelectOption[];
}

interface InoCascadeSelectRow {
  option: InoCascadeSelectOption;
  /** Index into the *current level's* option array — the id `optionId()` derives from and the
   *  value `aria-activedescendant` tracks. Reset every time the level changes (drill in/out). */
  index: number;
}

let idCounter = 0;

/** Typeahead buffer resets if the next keystroke arrives more than this long after the last one.
 *  Same window every other Tier-1 combobox control in this repo uses. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * `<ino-cascade-select>` — nested option drill-down combobox (INO-422, INO-31 Phase B1, doc 26 §5
 * row `ino-cascade-select`).
 *
 * ARIA: WAI-ARIA APG "Collapsible Dropdown Listbox" combobox core (`role="combobox"` trigger,
 * `aria-activedescendant`), reused verbatim from `ino-select`
 * (`web/src/app/components/select/ino-select.component.ts`) — same reason: DOM focus never
 * leaves the trigger, so the active option is always a logical pointer, not real focus. What's
 * new here is that the popup is not one flat `role="listbox"`: it is exactly **one level of the
 * option tree at a time**, replaced in place as the user drills in/out, with a breadcrumb trail
 * above it recording the path of parent options chosen to get there. See SPEC.md §1-§3 for why a
 * replace-in-place single level (not a cascading flyout of simultaneous panels, which is what
 * PrimeNG's own `CascadeSelect` renders) is the right shape for a component that also has to work
 * as a phone-width stacked sheet.
 *
 * Selection model: **only leaf options (no `children`) are selectable values.** A parent option
 * (has `children`) is a drill target — activating it pushes onto the breadcrumb path and shows
 * its children, it never becomes `value` itself. See SPEC.md §2.
 *
 * `@Input() value: string` / `@Output() valueChange` (banana-in-a-box), matching every other
 * Tier-1 form control in this repo — no `ControlValueAccessor`.
 */
@Component({
  selector: 'ino-cascade-select',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-cascade-select.component.html',
  styleUrl: './ino-cascade-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-cascade-select',
    '[attr.data-size]': 'size',
    '[class.ino-cascade-select--open]': 'open',
    '[class.ino-cascade-select--level-open]': 'open && path.length > 0',
  },
})
export class InoCascadeSelectComponent implements OnChanges {
  @Input() label = '';
  @Input() options: InoCascadeSelectOption[] = [];
  /** Selected leaf's `value`. `''` = no selection. */
  @Input() value = '';
  @Input() placeholder = 'Select an option';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Spinner + `aria-busy`; same contract as every other Tier-1 control's `loading` input — see
   *  doc 26 §5's "loading" state row. */
  @Input({ transform: booleanAttribute }) loading = false;
  /** Label for the "go back one level" affordance, read by assistive tech. */
  @Input() backLabel = 'Back';

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly openChange = new EventEmitter<boolean>();

  /** Custom rendering for one option row (any level). Context: `$implicit` = option. */
  @ContentChild('optionTemplate') optionTemplate: TemplateRef<{ $implicit: InoCascadeSelectOption }> | null = null;

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLButtonElement>;

  protected readonly cascadeId = `ino-cascade-select-${++idCounter}`;
  protected readonly listboxId = `${this.cascadeId}-listbox`;
  protected readonly hintId = `${this.cascadeId}-hint`;
  protected readonly errorId = `${this.cascadeId}-error`;

  protected open = false;
  /** Breadcrumb trail of ancestor options chosen to reach the currently-displayed level. Empty =
   *  root level is showing. The displayed level's options are `path.at(-1).children` or, when
   *  empty, the root `options` input — see `currentOptions`. */
  protected path: InoCascadeSelectOption[] = [];
  protected activeIndex = -1;

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.open) {
      // The tree changed under an open panel — safest reset is back to root rather than holding
      // onto a `path` of options that may no longer exist in the new tree.
      this.path = [];
      this.activeIndex = this.currentRows.findIndex((row) => !row.option.disabled);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────────────────────

  /** The option list for whichever level is currently displayed. */
  get currentOptions(): InoCascadeSelectOption[] {
    return this.path.length ? this.path[this.path.length - 1].children ?? [] : this.options;
  }

  get currentRows(): InoCascadeSelectRow[] {
    return this.currentOptions.map((option, index) => ({ option, index }));
  }

  /** Full root-to-leaf path of the currently-selected `value`, or `null` when nothing matches
   *  (including `value === ''`). Walks the whole tree — these trees are geographic/categorical
   *  hierarchies, not virtual-scroller-scale lists, so no memoization is needed. */
  get selectedPath(): InoCascadeSelectOption[] | null {
    if (!this.value) {
      return null;
    }
    return findPath(this.options, this.value);
  }

  /** Breadcrumb of the chosen path (doc 26 §5 structure requirement), shown on the trigger in
   *  place of a plain selected-label. */
  get selectedLabel(): string {
    return this.selectedPath?.map((option) => option.label).join(' / ') ?? '';
  }

  /** `*ngFor` identity for the option rows. `currentRows` is a getter that builds a fresh array of
   *  fresh row objects on *every* change-detection pass, so without a key Angular destroys and
   *  recreates every `<li>` each pass. That is not just churn: the row's own `(mouseenter)`
   *  handler then fires again on the replacement node, which runs change detection, which replaces
   *  it again — a loop that leaves the row under the pointer permanently detached (measured on the
   *  docs page before this fix: one `mouseenter` recreated the level ~3× in a second, and a click
   *  on the hovered row could never land). Keying by level-index + option value keeps identity
   *  stable within a level while still replacing the whole list when a drill-in/go-back swaps the
   *  level under it. INO-731 (found by the INO-423 docs demo — the bug was invisible while the
   *  generic renderer fed this component an empty `options` tree). */
  protected trackRow(_index: number, row: InoCascadeSelectRow): string {
    return `${row.index}:${row.option.value}`;
  }

  protected hasChildren(option: InoCascadeSelectOption): boolean {
    return !!option.children?.length;
  }

  protected activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-${this.path.length}-opt-${index}`;
  }

  protected isActive(index: number): boolean {
    return index === this.activeIndex;
  }

  protected isSelected(option: InoCascadeSelectOption): boolean {
    return !this.hasChildren(option) && option.value === this.value;
  }

  // ── Open / close ────────────────────────────────────────────────────────────────────────────

  toggle(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.open ? this.close(true) : this.openPanel();
  }

  openPanel(): void {
    if (this.disabled || this.readonly || this.loading || this.open) {
      return;
    }
    this.open = true;
    this.openChange.emit(true);
    // Reopen at root every time (doc 26 §5 names this a "nested option drill-down" exploration
    // flow, not a combobox that must resume mid-tree) — but seed `activeIndex` on the root-level
    // ancestor of the current selection when there is one, so Arrow keys start from it.
    this.path = [];
    const ancestor = this.selectedPath?.[0];
    const seeded = ancestor ? this.options.findIndex((option) => option === ancestor) : -1;
    this.activeIndex = seeded >= 0 ? seeded : this.currentRows.findIndex((row) => !row.option.disabled);
  }

  close(restoreFocus: boolean): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.path = [];
    if (restoreFocus) {
      this.triggerRef?.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !(event.target instanceof Node && this.hostContains(event.target))) {
      this.close(false);
    }
  }

  private hostContains(node: Node): boolean {
    return !!this.triggerRef?.nativeElement.closest('.ino-cascade-select')?.contains(node);
  }

  // ── Navigation (drill in / go back) ────────────────────────────────────────────────────────

  /** Click/Enter/Space/ArrowRight on a row with children: push it onto the breadcrumb and show
   *  its children. Resets the roving pointer to the first enabled child of the new level. */
  drillInto(option: InoCascadeSelectOption): void {
    if (option.disabled || !this.hasChildren(option)) {
      return;
    }
    this.path = [...this.path, option];
    this.activeIndex = this.currentRows.findIndex((row) => !row.option.disabled);
  }

  /** ArrowLeft/back-button/breadcrumb-click: truncate the path back to `toIndex` (`0` = root).
   *  Omit `toIndex` to go up exactly one level. The roving pointer lands back on the option whose
   *  children we just left, matching the "where was I" expectation Arrow-key navigation sets up
   *  elsewhere in this repo. */
  goBack(toIndex?: number): void {
    if (!this.path.length) {
      return;
    }
    const leaving = this.path[this.path.length - 1];
    this.path = this.path.slice(0, toIndex ?? this.path.length - 1);
    const landedIndex = this.currentRows.findIndex((row) => row.option === leaving);
    this.activeIndex = landedIndex >= 0 ? landedIndex : this.currentRows.findIndex((row) => !row.option.disabled);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  selectOption(option: InoCascadeSelectOption): void {
    if (option.disabled || this.hasChildren(option)) {
      return;
    }
    this.value = option.value;
    this.valueChange.emit(option.value);
    this.close(true);
  }

  /** Click/Enter/Space on a row: drill in when it has children, select when it's a leaf — the one
   *  branch every activation path (mouse, keyboard) funnels through. */
  activateRow(row: InoCascadeSelectRow): void {
    if (row.option.disabled) {
      return;
    }
    this.hasChildren(row.option) ? this.drillInto(row.option) : this.selectOption(row.option);
  }

  private activateActive(): void {
    const row = this.currentRows[this.activeIndex];
    if (row) {
      this.activateRow(row);
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────────────────────

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open ? this.moveActive(1) : this.openPanel();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open ? this.moveActive(-1) : this.openPanel();
        break;
      case 'ArrowRight': {
        if (!this.open) {
          break;
        }
        event.preventDefault();
        const row = this.currentRows[this.activeIndex];
        if (row && this.hasChildren(row.option)) {
          this.drillInto(row.option);
        }
        break;
      }
      case 'ArrowLeft':
        if (this.open && this.path.length) {
          event.preventDefault();
          this.goBack();
        }
        break;
      case 'Home':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = this.currentRows.findIndex((row) => !row.option.disabled);
        }
        break;
      case 'End':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = findLastIndex(this.currentRows, (row) => !row.option.disabled);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open ? this.activateActive() : this.openPanel();
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close(true);
        }
        break;
      case 'Tab':
        this.close(false);
        break;
      default:
        if (event.key.length === 1) {
          this.typeahead(event.key);
        }
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.currentRows.map((row, index) => (row.option.disabled ? -1 : index)).filter((i) => i >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.activeIndex = enabled[nextPos];
  }

  private typeahead(char: string): void {
    if (this.typeaheadTimer) {
      clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadBuffer += char.toLowerCase();
    this.typeaheadTimer = setTimeout(() => (this.typeaheadBuffer = ''), TYPEAHEAD_RESET_MS);

    const startIndex = this.activeIndex + 1;
    const rows = this.currentRows;
    if (!rows.length) {
      return;
    }
    for (let offset = 0; offset < rows.length; offset++) {
      const row = rows[(startIndex + offset) % rows.length];
      if (!row.option.disabled && row.option.label.toLowerCase().startsWith(this.typeaheadBuffer)) {
        this.activeIndex = row.index;
        if (!this.open) {
          this.openPanel();
        }
        return;
      }
    }
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

/** Depth-first search for the root-to-leaf path of options ending in `value`. Returns `null` when
 *  no leaf in the tree matches — including when `value` only matches a non-leaf (parent) option,
 *  since parents are never valid values (SPEC.md §2). */
function findPath(options: InoCascadeSelectOption[], value: string): InoCascadeSelectOption[] | null {
  for (const option of options) {
    if (!option.children?.length) {
      if (option.value === value) {
        return [option];
      }
      continue;
    }
    const childPath = findPath(option.children, value);
    if (childPath) {
      return [option, ...childPath];
    }
  }
  return null;
}
