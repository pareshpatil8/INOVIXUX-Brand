import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';
import { InoVirtualScrollerComponent } from '../virtual-scroller/ino-virtual-scroller.component';
import { InoVirtualScrollerItemDirective } from '../virtual-scroller/ino-virtual-scroller.templates';

export interface InoMultiSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Same run-boundary grouping model as `InoSelectOption.group` — see
   *  `web/src/app/components/select/ino-select.component.ts` §3 / this component's SPEC.md §1. */
  group?: string;
}

interface InoMultiSelectRow {
  /** `null` only for the synthetic "select all" row. */
  option: InoMultiSelectOption | null;
  /** Absolute index into the rendered row list (select-all row included) — the value
   *  `aria-activedescendant` tracks. */
  index: number;
  groupHeading: string | null;
  isSelectAll: boolean;
}

let idCounter = 0;

/** Typeahead buffer resets if the next keystroke arrives more than this long after the last one. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * `<ino-multiselect>` — checkbox-listbox / chip-list follow-up to `<ino-select>` (INO-153,
 * INO-31 T-10), built on the shared overlay + `aria-activedescendant` core `ino-select`
 * established (INO-152, T-9). See `web/src/app/components/select/ino-select.component.ts`'s own
 * doc comment for why that core exists and what it deliberately left for this component.
 *
 * Differs from `ino-select` in exactly the ways SPEC.md §1 says it must: `value`/`valueChange` are
 * `string[]`, selecting a row toggles membership without closing the panel, the trigger renders a
 * chip list or a comma-joined summary instead of one label, and the option list gets a checkbox
 * mark plus an optional "select all" row. Grouping (`group`), filter, virtual scrolling, overlay
 * open/close semantics, and the `aria-activedescendant` keyboard model are reused verbatim.
 *
 * **Not built here** (see SPEC.md §1 for the full reasoning): the editable free-text trigger — that
 * is `ino-select`'s (and AutoComplete's) territory, not applicable to a checkbox listbox.
 *
 * `@Input() value: string[]` / `@Output() valueChange` (banana-in-a-box), matching `ino-select` and
 * every other Tier-1 form control in this repo — no `ControlValueAccessor`.
 */
@Component({
  selector: 'ino-multiselect',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoVirtualScrollerComponent, InoVirtualScrollerItemDirective],
  templateUrl: './ino-multiselect.component.html',
  styleUrl: './ino-multiselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-multiselect',
    '[attr.data-size]': 'size',
    '[class.ino-multiselect--open]': 'open',
  },
})
export class InoMultiSelectComponent implements OnChanges, AfterViewInit {
  @Input() label = '';
  @Input() options: InoMultiSelectOption[] = [];
  @Input() value: string[] = [];
  @Input() placeholder = 'Select options';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) clearable = false;
  /** Adds an in-panel search box that narrows the visible options without touching `value`. */
  @Input({ transform: booleanAttribute }) filter = false;
  @Input() filterPlaceholder = 'Search…';
  /** `'chip'` (default) renders each selected option as a dismissible chip on the trigger;
   *  `'comma'` renders one truncated `"A, B, C"` text summary. See SPEC.md §2. */
  @Input() display: 'chip' | 'comma' = 'chip';
  /** Chip mode only — chips beyond this count collapse into a `"+K more"` indicator. Named after
   *  PrimeNG's `maxSelectedLabels` (the closest existing precedent for this exact knob) rather
   *  than inventing a new name for the same concept. See SPEC.md §2. */
  @Input({ transform: numberAttribute }) maxSelectedLabels = 3;
  /** Renders a "select all visible" row at the top of the panel; indeterminate when some but not
   *  all filtered, enabled options are selected. See SPEC.md §3. */
  @Input({ transform: booleanAttribute }) selectAll = false;
  /** Hard cap on `value.length`. Once reached, unselected rows become non-interactive (dimmed,
   *  `aria-disabled`) until a selection is removed — `null` (default) means no limit. See SPEC.md §4. */
  @Input({ transform: numberAttribute }) selectionLimit: number | null = null;
  /** Options at or above this count render through `<ino-virtual-scroller>` (reuses T-3) instead
   *  of a plain `*ngFor`. `0` forces virtual scrolling always; a very large number effectively
   *  disables it. */
  @Input({ transform: numberAttribute }) virtualScrollThreshold = 100;

  @Output() readonly valueChange = new EventEmitter<string[]>();
  @Output() readonly filterChange = new EventEmitter<string>();
  @Output() readonly openChange = new EventEmitter<boolean>();
  @Output() readonly clear = new EventEmitter<void>();

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLElement>;
  @ViewChild('filterInput') private readonly filterInputRef?: ElementRef<HTMLInputElement>;

  protected readonly selectId = `ino-multiselect-${++idCounter}`;
  protected readonly listboxId = `${this.selectId}-listbox`;
  protected readonly hintId = `${this.selectId}-hint`;
  protected readonly errorId = `${this.selectId}-error`;

  protected open = false;
  protected activeIndex = -1;
  protected filterText = '';

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: InoMultiSelectRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filter'] || changes['selectAll'] || changes['value']) {
      this.recomputeFiltered();
    }
  }

  ngAfterViewInit(): void {
    this.recomputeFiltered();
  }

  get selectedOptions(): InoMultiSelectOption[] {
    return this.options.filter((option) => this.value.includes(option.value));
  }

  /** First `maxSelectedLabels` selected options, chip-mode display order (follows `options`, not
   *  selection order — see SPEC.md §2). */
  get visibleChips(): InoMultiSelectOption[] {
    return this.selectedOptions.slice(0, this.maxSelectedLabels);
  }

  get overflowCount(): number {
    return Math.max(0, this.selectedOptions.length - this.maxSelectedLabels);
  }

  get commaSummary(): string {
    return this.selectedOptions.map((option) => option.label).join(', ');
  }

  get filteredRows(): InoMultiSelectRow[] {
    return this.filteredCache;
  }

  get useVirtualScroll(): boolean {
    return this.filteredRows.length >= this.virtualScrollThreshold;
  }

  get isAtLimit(): boolean {
    return this.selectionLimit != null && this.value.length >= this.selectionLimit;
  }

  /** Visible (filtered), enabled option values — the set "select all" operates over. */
  private get visibleEnabledValues(): string[] {
    return this.filteredRows
      .filter((row): row is InoMultiSelectRow & { option: InoMultiSelectOption } => !row.isSelectAll && !!row.option && !row.option.disabled)
      .map((row) => row.option.value);
  }

  get selectAllChecked(): boolean {
    const values = this.visibleEnabledValues;
    return values.length > 0 && values.every((value) => this.value.includes(value));
  }

  get selectAllIndeterminate(): boolean {
    const values = this.visibleEnabledValues;
    const selectedCount = values.filter((value) => this.value.includes(value)).length;
    return selectedCount > 0 && selectedCount < values.length;
  }

  protected activeOptionId(): string | null {
    return this.activeIndex >= 0 ? `${this.listboxId}-opt-${this.activeIndex}` : null;
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  protected isActive(index: number): boolean {
    return index === this.activeIndex;
  }

  protected isSelected(option: InoMultiSelectOption): boolean {
    return this.value.includes(option.value);
  }

  /** A row is non-interactive when its own option is `disabled`, or when `selectionLimit` is
   *  reached and the option is not itself already selected (§4 — removal always stays available). */
  protected isRowNonInteractive(row: InoMultiSelectRow): boolean {
    if (row.isSelectAll || !row.option) {
      return false;
    }
    return !!row.option.disabled || (this.isAtLimit && !this.isSelected(row.option));
  }

  // ── Open / close ────────────────────────────────────────────────────────────────────────────

  toggle(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.open ? this.close(true) : this.openPanel();
  }

  openPanel(focusFilter = true): void {
    if (this.disabled || this.readonly || this.loading || this.open) {
      return;
    }
    this.open = true;
    this.openChange.emit(true);
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row));
    if (this.filter && focusFilter) {
      queueMicrotask(() => this.filterInputRef?.nativeElement.focus());
    }
  }

  close(restoreFocus: boolean): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    this.filterText = '';
    this.recomputeFiltered();
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
    return !!this.triggerRef?.nativeElement.closest('.ino-multiselect')?.contains(node) ||
      !!this.filterInputRef?.nativeElement.closest('.ino-multiselect')?.contains(node);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  /** Toggles one option's membership in `value`. Does not close the panel (§2) — multi-select
   *  panels stay open across selections, unlike `ino-select`'s select-and-close. Silently refuses
   *  (no event emitted) when the option is disabled or the panel is at `selectionLimit` and the
   *  option is not already selected (§4). */
  toggleOption(option: InoMultiSelectOption): void {
    if (option.disabled) {
      return;
    }
    const selected = this.isSelected(option);
    if (!selected && this.isAtLimit) {
      return;
    }
    const next = selected ? this.value.filter((v) => v !== option.value) : [...this.value, option.value];
    this.value = next;
    this.valueChange.emit(next);
  }

  /** Removes one chip. `stopPropagation` keeps the click from also toggling the trigger's open
   *  state (§2/§8) — chip removal must never reopen or close the panel as a side effect. */
  removeChip(option: InoMultiSelectOption, event: Event): void {
    event.stopPropagation();
    this.toggleOption(option);
  }

  /** Toggles all currently visible, enabled options at once (§3). Adding respects
   *  `selectionLimit` — only as many as remain under the cap are added, the rest are silently
   *  left unselected, same "refuse, don't explain" contract as `toggleOption`. */
  toggleSelectAll(): void {
    const values = this.visibleEnabledValues;
    if (!values.length) {
      return;
    }
    let next: string[];
    if (this.selectAllChecked) {
      next = this.value.filter((v) => !values.includes(v));
    } else {
      const toAdd = values.filter((v) => !this.value.includes(v));
      const remaining = this.selectionLimit != null ? Math.max(0, this.selectionLimit - this.value.length) : toAdd.length;
      next = [...this.value, ...toAdd.slice(0, remaining)];
    }
    this.value = next;
    this.valueChange.emit(next);
  }

  onClear(event: Event): void {
    event.stopPropagation();
    this.value = [];
    this.valueChange.emit([]);
    this.clear.emit();
  }

  // ── Filter (in-panel search) ────────────────────────────────────────────────────────────────

  onFilterInput(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.filterChange.emit(this.filterText);
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row));
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
      case 'Home':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row));
        }
        break;
      case 'End':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = findLastIndex(this.filteredRows, (row) => !this.isRowNonInteractive(row));
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open ? this.activateRow() : this.openPanel();
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
        if (!this.filter && event.key.length === 1) {
          this.typeahead(event.key);
        }
    }
  }

  onFilterKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault();
        this.activateRow();
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  /** `Enter`/`Space` on the active row toggles membership (option row) or runs "select all" (the
   *  synthetic select-all row) — never closes the panel, matching click behavior (§2). */
  private activateRow(): void {
    const row = this.filteredRows[this.activeIndex];
    if (!row) {
      return;
    }
    if (row.isSelectAll) {
      this.toggleSelectAll();
    } else if (row.option) {
      this.toggleOption(row.option);
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.filteredRows
      .map((row, index) => (this.isRowNonInteractive(row) ? -1 : index))
      .filter((i) => i >= 0);
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
    const rows = this.filteredRows;
    for (let offset = 0; offset < rows.length; offset++) {
      const row = rows[(startIndex + offset) % rows.length];
      if (!row.option || this.isRowNonInteractive(row)) {
        continue;
      }
      if (row.option.label.toLowerCase().startsWith(this.typeaheadBuffer)) {
        this.activeIndex = row.index;
        if (!this.open) {
          this.openPanel(false);
        }
        return;
      }
    }
  }

  // ── Grouping / filtering ────────────────────────────────────────────────────────────────────

  private recomputeFiltered(): void {
    const query = this.filterText.trim().toLowerCase();
    const matches = query
      ? this.options.filter((option) => option.label.toLowerCase().includes(query))
      : this.options;

    let lastGroup: string | null | undefined = undefined;
    const optionRows: InoMultiSelectRow[] = matches.map((option) => {
      const groupHeading = option.group && option.group !== lastGroup ? option.group : null;
      lastGroup = option.group ?? null;
      return { option, groupHeading, isSelectAll: false, index: 0 };
    });

    const rows: InoMultiSelectRow[] =
      this.selectAll && optionRows.length
        ? [{ option: null, groupHeading: null, isSelectAll: true, index: 0 }, ...optionRows]
        : optionRows;

    rows.forEach((row, index) => (row.index = index));
    this.filteredCache = rows;
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
