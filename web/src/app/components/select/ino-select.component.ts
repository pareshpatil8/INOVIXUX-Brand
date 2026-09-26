import {
  AfterViewInit,
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
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';
import { InoVirtualScrollerComponent } from '../virtual-scroller/ino-virtual-scroller.component';
import { InoVirtualScrollerItemDirective } from '../virtual-scroller/ino-virtual-scroller.templates';

export interface InoSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Groups consecutive options under one `role="group"` heading. Ungrouped options may be
   *  interleaved with grouped ones; each run of equal `group` values renders as one group. */
  group?: string;
}

interface InoSelectRow {
  option: InoSelectOption;
  /** Absolute index into the filtered option list — the value `aria-activedescendant` tracks. */
  index: number;
  groupHeading: string | null;
}

let idCounter = 0;

/** Typeahead buffer resets if the next keystroke arrives more than this long after the last one. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * `<ino-select>` — custom listbox rewrite of the Tier-1 combobox (INO-152, INO-31 T-9).
 *
 * Replaces the native `<select>` because a native control makes 4 of PrimeNG's 5 `Select`-family
 * variants (Select, MultiSelect, AutoComplete, Listbox) structurally impossible — there is no way
 * to put arbitrary markup, a filter box, or option groups inside a native `<option>`. This
 * component builds the shared overlay + option-list + typeahead core that `MultiSelect`,
 * `AutoComplete` and `Listbox` (separate, not-yet-filed follow-up tickets) will each extend.
 *
 * **Scope of this issue: single-selection `Select` only.** `MultiSelect` (checkbox options,
 * chip-list value display), `AutoComplete` (server-side suggestion source, multiple free-text
 * tokens) and standalone `Listbox` (always-visible, no trigger/overlay) are deliberately **not**
 * built here — see SPEC.md §1. Building all four in one issue would mean no single variant gets a
 * reviewable, ship-ready implementation; the shared core this component establishes (keyboard
 * contract, ARIA combobox wiring, virtual scroll integration, filter panel) is what makes the
 * other three a much smaller follow-up each.
 *
 * ARIA: WAI-ARIA APG "Collapsible Dropdown Listbox" (`role="combobox"` trigger +
 * `role="listbox"` popup), using the `aria-activedescendant` model throughout — DOM focus never
 * leaves the trigger (or the in-panel filter input, when `filter` is on), and the active option is
 * communicated by id reference. This is the APG-sanctioned alternative to roving `tabindex` and is
 * the only model that also works cleanly through `<ino-virtual-scroller>`, where most options are
 * not present in the DOM at all. See SPEC.md §2 for the full keyboard map.
 *
 * `@Input() value` / `@Output() valueChange` (banana-in-a-box), matching every other Tier-1 form
 * control in this repo — no `ControlValueAccessor` (see `ino-input`'s doc comment).
 */
@Component({
  selector: 'ino-select',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoVirtualScrollerComponent, InoVirtualScrollerItemDirective],
  templateUrl: './ino-select.component.html',
  styleUrl: './ino-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-select',
    '[attr.data-size]': 'size',
    '[class.ino-select--open]': 'open',
  },
})
export class InoSelectComponent implements OnChanges, AfterViewInit {
  @Input() label = '';
  @Input() options: InoSelectOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Select an option';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) clearable = false;
  /** Trigger becomes a text `<input>`; typed text that matches no option becomes the value as-is. */
  @Input({ transform: booleanAttribute }) editable = false;
  /** Adds an in-panel search box that narrows the visible options without touching `value`. */
  @Input({ transform: booleanAttribute }) filter = false;
  @Input() filterPlaceholder = 'Search…';
  /** Options at or above this count render through `<ino-virtual-scroller>` (reuses T-3) instead
   *  of a plain `*ngFor`. `0` forces virtual scrolling always; a very large number effectively
   *  disables it. */
  @Input({ transform: numberAttribute }) virtualScrollThreshold = 100;

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly filterChange = new EventEmitter<string>();
  @Output() readonly openChange = new EventEmitter<boolean>();
  @Output() readonly clear = new EventEmitter<void>();

  /** Custom rendering for one option row. Context: `$implicit` = `InoSelectOption`. */
  @ContentChild('optionTemplate') optionTemplate: TemplateRef<{ $implicit: InoSelectOption }> | null = null;
  /** Custom rendering for the selected-value display on the trigger. Same context as above. */
  @ContentChild('selectedTemplate') selectedTemplate: TemplateRef<{ $implicit: InoSelectOption }> | null = null;

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLButtonElement | HTMLInputElement>;
  @ViewChild('filterInput') private readonly filterInputRef?: ElementRef<HTMLInputElement>;

  protected readonly selectId = `ino-select-${++idCounter}`;
  protected readonly listboxId = `${this.selectId}-listbox`;
  protected readonly hintId = `${this.selectId}-hint`;
  protected readonly errorId = `${this.selectId}-error`;

  protected open = false;
  protected activeIndex = -1;
  protected filterText = '';
  /** Live text in the trigger when `editable` — separate from `value` until commit. */
  protected editableText = '';

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: InoSelectRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filter']) {
      this.recomputeFiltered();
    }
    if (changes['value']) {
      this.editableText = this.selectedOption?.label ?? this.value;
    }
  }

  ngAfterViewInit(): void {
    this.editableText = this.selectedOption?.label ?? this.value;
    this.recomputeFiltered();
  }

  get selectedOption(): InoSelectOption | null {
    return this.options.find((option) => option.value === this.value) ?? null;
  }

  get filteredRows(): InoSelectRow[] {
    return this.filteredCache;
  }

  get useVirtualScroll(): boolean {
    return this.filteredRows.length >= this.virtualScrollThreshold;
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

  protected isSelected(option: InoSelectOption): boolean {
    return option.value === this.value;
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
    const selected = this.filteredRows.findIndex((row) => row.option.value === this.value);
    this.activeIndex = selected >= 0 ? selected : this.filteredRows.findIndex((row) => !row.option.disabled);
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
    return !!this.triggerRef?.nativeElement.closest('.ino-select')?.contains(node) ||
      !!this.filterInputRef?.nativeElement.closest('.ino-select')?.contains(node);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  selectOption(option: InoSelectOption): void {
    if (option.disabled) {
      return;
    }
    this.value = option.value;
    this.editableText = option.label;
    this.valueChange.emit(option.value);
    this.close(true);
  }

  selectActive(): void {
    const row = this.filteredRows[this.activeIndex];
    if (row) {
      this.selectOption(row.option);
    } else if (this.editable) {
      this.commitEditableText();
    }
  }

  onClear(event: Event): void {
    event.stopPropagation();
    this.value = '';
    this.editableText = '';
    this.valueChange.emit('');
    this.clear.emit();
  }

  // ── Filter (in-panel search) ────────────────────────────────────────────────────────────────

  onFilterInput(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.filterChange.emit(this.filterText);
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !row.option.disabled);
  }

  // ── Editable trigger ────────────────────────────────────────────────────────────────────────

  onEditableInput(event: Event): void {
    this.editableText = (event.target as HTMLInputElement).value;
    if (!this.open) {
      this.openPanel(false);
    }
    this.filterText = this.editableText;
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !row.option.disabled);
  }

  private commitEditableText(): void {
    const match = this.options.find(
      (option) => option.label.toLowerCase() === this.editableText.trim().toLowerCase(),
    );
    this.value = match ? match.value : this.editableText.trim();
    this.valueChange.emit(this.value);
    this.close(true);
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
          this.activeIndex = this.filteredRows.findIndex((row) => !row.option.disabled);
        }
        break;
      case 'End':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = findLastIndex(this.filteredRows, (row) => !row.option.disabled);
        }
        break;
      case 'Enter':
      case ' ':
        if (this.editable && event.key === ' ') {
          return;
        }
        event.preventDefault();
        this.open ? this.selectActive() : this.openPanel();
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
        if (!this.editable && !this.filter && event.key.length === 1) {
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
        this.selectActive();
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

  private moveActive(delta: number): void {
    const enabled = this.filteredRows.map((row, index) => (row.option.disabled ? -1 : index)).filter((i) => i >= 0);
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
      if (!row.option.disabled && row.option.label.toLowerCase().startsWith(this.typeaheadBuffer)) {
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
