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
  OnDestroy,
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

export interface InoAutocompleteOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Same run-boundary grouping model as `InoSelectOption.group` — see
   *  `web/src/app/components/select/ino-select.component.ts` §3 / this component's SPEC.md §3. */
  group?: string;
}

interface InoAutocompleteRow {
  option: InoAutocompleteOption;
  /** Absolute index into the filtered row list — the value `aria-activedescendant` tracks. */
  index: number;
  groupHeading: string | null;
}

let idCounter = 0;

/** Debounce window for the `search` output (INO-400 §4) — long enough to skip a fast typist's
 *  intermediate keystrokes, short enough to still feel live. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * `<ino-autocomplete>` — text-driven suggestion combobox (INO-400, INO-31 Phase B1), the deferred
 * follow-up `<ino-select>`'s own doc comment named: "AutoComplete — server-side/async suggestion
 * source, multiple free-text tokens, debounced fetch — a different data contract (`options` as a
 * live-filtered async result, not a static array) from this component's synchronous client-side
 * filter."
 *
 * Builds on the shared overlay + `aria-activedescendant` + option-grouping + virtual-scroll core
 * `ino-select` (INO-152, T-9) established, and reuses `ino-multiselect`'s (INO-153, T-10)
 * toggle-and-stay-open / chip-list pattern for `multiple`. See SPEC.md §1 for the full lineage.
 *
 * **Async datasource contract (SPEC.md §4).** This repo's convention is plain
 * `@Input()`/`@Output()` banana-in-a-box, never an Observable/Promise baked into a component (see
 * `ino-select`'s own doc comment, §6 there). `options` stays a static, synchronous array exactly
 * like `ino-select`'s — the "live-filtered async result" is achieved by a parent listening to the
 * debounced `search` output, running its own fetch, and pushing results back in via `options`
 * (toggling `loading` around the fetch). Nothing here imports `rxjs` beyond what's already a
 * transitive Angular dependency, and no operator is used.
 *
 * ARIA: WAI-ARIA APG combobox pattern, `aria-activedescendant` variant (same rationale as
 * `ino-select`'s SPEC.md §2 — the only model that also works through `<ino-virtual-scroller>`).
 * Unlike `ino-select`, the trigger is *always* a text `<input>` — an autocomplete has no
 * non-editable mode — so there is no `editable` input here; see SPEC.md §5 for how `forceSelection`
 * replaces it.
 *
 * `@Input() value: string | string[]` / `@Output() valueChange` (banana-in-a-box), matching every
 * other Tier-1 form control in this repo — no `ControlValueAccessor`. The type is a union rather
 * than two separate components (unlike `ino-select`/`ino-multiselect`) because the issue's own
 * variant matrix specifies `multiple` as a boolean flag on one component — see SPEC.md §2 for why
 * that call is different here than it was for MultiSelect.
 */
@Component({
  selector: 'ino-autocomplete',
  standalone: true,
  imports: [CommonModule, InoLabelComponent, InoVirtualScrollerComponent, InoVirtualScrollerItemDirective],
  templateUrl: './ino-autocomplete.component.html',
  styleUrl: './ino-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-autocomplete',
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    '[class.ino-autocomplete--open]': 'open',
  },
})
export class InoAutocompleteComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() label = '';
  @Input() options: InoAutocompleteOption[] = [];
  /** `string` when `multiple` is `false` (default), `string[]` when `true`. See SPEC.md §2. */
  @Input() value: string | string[] = '';
  @Input() placeholder = 'Type to search…';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Suppresses selection (click/Enter on a row) while an async fetch triggered by `search` is in
   *  flight. Typing and the panel itself stay live — only committing a row is blocked. See
   *  SPEC.md §7 (states). */
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) clearable = false;
  /** `true` renders a checkbox-style multi-value listbox with chip display on the trigger (reuses
   *  `ino-multiselect`'s toggle-and-stay-open model); `false` (default) is single-selection with
   *  select-and-close, mirroring `ino-select`. See SPEC.md §2. */
  @Input({ transform: booleanAttribute }) multiple = false;
  /** `'dropdown'` (default) is the standard anchored overlay panel, matching `ino-select`.
   *  `'inline'` renders the same listbox directly below the input, in flow, with no absolute
   *  positioning or overlay chrome (border/shadow/z-index) — a minimal "always in the layout"
   *  variant. See SPEC.md §6. */
  @Input() mode: 'dropdown' | 'inline' = 'dropdown';
  /** When `true`, committing (Enter, blur-via-outside-click, `Tab`) with typed text that matches no
   *  option's label discards the text and clears the value — a real option must be picked. When
   *  `false` (default), unmatched text becomes the committed value verbatim, same as `ino-select`'s
   *  `editable` commit behavior. Single-selection only — see SPEC.md §5 for why `multiple` never has
   *  a free-text commit path to force in the first place. */
  @Input({ transform: booleanAttribute }) forceSelection = false;
  /** `multiple` only. Hard cap on `value.length`; once reached, unselected rows dim and become
   *  non-interactive (never disables removing an existing chip) — same "dim, don't lock in" rule
   *  `ino-multiselect`'s `selectionLimit` uses. `null` (default) means no limit. See SPEC.md §7. */
  @Input({ transform: numberAttribute }) maxSelected: number | null = null;
  /** Rows at or above this count render through `<ino-virtual-scroller>` (reuses T-3) instead of a
   *  plain `*ngFor`, same mechanism as `ino-select`/`ino-multiselect`. */
  @Input({ transform: numberAttribute }) virtualScrollThreshold = 100;

  @Output() readonly valueChange = new EventEmitter<string | string[]>();
  /** Fires `SEARCH_DEBOUNCE_MS` after the last keystroke in the query text — the async-datasource
   *  hook (SPEC.md §4). Does not fire on selection, only on text changes. */
  @Output() readonly search = new EventEmitter<string>();
  @Output() readonly openChange = new EventEmitter<boolean>();
  @Output() readonly clear = new EventEmitter<void>();

  /** Custom rendering for one option row. Context: `$implicit` = `InoAutocompleteOption`. */
  @ContentChild('optionTemplate') optionTemplate: TemplateRef<{ $implicit: InoAutocompleteOption }> | null = null;
  /** Custom rendering for a selected chip's/single value's label. Same context as above. */
  @ContentChild('selectedTemplate') selectedTemplate: TemplateRef<{ $implicit: InoAutocompleteOption }> | null = null;

  @ViewChild('trigger') private readonly triggerRef?: ElementRef<HTMLInputElement>;

  protected readonly autocompleteId = `ino-autocomplete-${++idCounter}`;
  protected readonly listboxId = `${this.autocompleteId}-listbox`;
  protected readonly hintId = `${this.autocompleteId}-hint`;
  protected readonly errorId = `${this.autocompleteId}-error`;
  protected readonly statusId = `${this.autocompleteId}-status`;

  protected open = false;
  protected activeIndex = -1;
  /** Live text in the trigger — the query driving both the client-side filter (§3) and the
   *  debounced `search` output (§4). Never itself `value` in `multiple` mode (SPEC.md §5). */
  protected queryText = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: InoAutocompleteRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['multiple'] || changes['maxSelected']) {
      this.recomputeFiltered();
    }
    if (changes['value'] && !this.multiple) {
      this.queryText = this.selectedOption?.label ?? (typeof this.value === 'string' ? this.value : '');
    }
  }

  ngAfterViewInit(): void {
    if (!this.multiple) {
      this.queryText = this.selectedOption?.label ?? (typeof this.value === 'string' ? this.value : '');
    }
    this.recomputeFiltered();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  // ── Value shape (SPEC.md §2) ────────────────────────────────────────────────────────────────

  /** Normalizes `value` to an array regardless of `multiple` — the single shared read path every
   *  selection/membership check below uses. */
  get valuesArray(): string[] {
    if (Array.isArray(this.value)) {
      return this.value;
    }
    return this.value ? [this.value] : [];
  }

  get selectedOption(): InoAutocompleteOption | null {
    if (this.multiple) {
      return null;
    }
    return this.options.find((option) => option.value === this.value) ?? null;
  }

  get selectedOptions(): InoAutocompleteOption[] {
    const values = this.valuesArray;
    return this.options.filter((option) => values.includes(option.value));
  }

  get isAtMax(): boolean {
    return this.multiple && this.maxSelected != null && this.valuesArray.length >= this.maxSelected;
  }

  get filteredRows(): InoAutocompleteRow[] {
    return this.filteredCache;
  }

  get useVirtualScroll(): boolean {
    return this.filteredRows.length >= this.virtualScrollThreshold;
  }

  /** Message for the empty-listbox state (SPEC.md §7) — distinguishes "still fetching" from a
   *  genuine no-results outcome so the panel never just looks stuck. */
  get emptyMessage(): string {
    if (this.loading) {
      return 'Searching…';
    }
    return this.queryText.trim() ? 'No results found.' : 'No options.';
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

  protected isSelected(option: InoAutocompleteOption): boolean {
    return this.valuesArray.includes(option.value);
  }

  /** A row is non-interactive when its own option is `disabled`, or (`multiple` only) when
   *  `maxSelected` is reached and the option is not itself already selected — same "dim, don't
   *  disable" rule as `ino-multiselect`'s `isRowNonInteractive`. */
  protected isRowNonInteractive(option: InoAutocompleteOption): boolean {
    return !!option.disabled || (this.isAtMax && !this.isSelected(option));
  }

  // ── Open / close ────────────────────────────────────────────────────────────────────────────

  openPanel(focusTrigger = true): void {
    if (this.disabled || this.readonly || this.open) {
      return;
    }
    this.open = true;
    this.openChange.emit(true);
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row.option));
    if (focusTrigger) {
      queueMicrotask(() => this.triggerRef?.nativeElement.focus());
    }
  }

  /** Closes the panel. Never reverts `queryText`/`value` itself — commit (Enter, see
   *  `selectActive`/`commitQueryText`) is the only path that changes `value`, matching
   *  `ino-select`'s own "Escape/outside-click close without changing value" contract. */
  close(restoreFocus: boolean): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.openChange.emit(false);
    if (restoreFocus) {
      this.triggerRef?.nativeElement.focus();
    }
  }

  onFocus(): void {
    if (!this.open) {
      this.openPanel(false);
    }
  }

  onBlur(): void {
    // Native blur closes the panel; forceSelection's "clear on no match" (§5) runs here too, not
    // only on Enter, so tabbing/clicking away without a matching option also enforces the
    // constraint rather than leaving a dangling free-text value that looks committed.
    if (!this.multiple && this.forceSelection) {
      this.enforceForceSelection();
    }
    this.close(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !(event.target instanceof Node && this.hostContains(event.target))) {
      if (!this.multiple && this.forceSelection) {
        this.enforceForceSelection();
      }
      this.close(false);
    }
  }

  private hostContains(node: Node): boolean {
    return !!this.triggerRef?.nativeElement.closest('.ino-autocomplete')?.contains(node);
  }

  // ── Selection ───────────────────────────────────────────────────────────────────────────────

  selectOption(option: InoAutocompleteOption): void {
    if (this.loading || this.isRowNonInteractive(option)) {
      return;
    }
    if (this.multiple) {
      this.toggleMultiValue(option);
    } else {
      this.commitSingleSelection(option);
    }
  }

  private commitSingleSelection(option: InoAutocompleteOption): void {
    this.value = option.value;
    this.queryText = option.label;
    this.valueChange.emit(option.value);
    this.close(true);
  }

  /** Toggles one option's membership in `value` — same "refuse silently" contract as
   *  `ino-multiselect`'s `toggleOption`. Clears `queryText` after adding so the next character
   *  starts a fresh search rather than re-matching the just-added chip's own label; the panel
   *  stays open, matching `ino-multiselect`'s "toggle, not select-and-close" model. */
  private toggleMultiValue(option: InoAutocompleteOption): void {
    const values = this.valuesArray;
    const selected = values.includes(option.value);
    if (!selected && this.isAtMax) {
      return;
    }
    const next = selected ? values.filter((v) => v !== option.value) : [...values, option.value];
    this.value = next;
    this.valueChange.emit(next);
    this.queryText = '';
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row.option));
  }

  /** Removes one chip (`multiple` only). `stopPropagation` keeps the click from also focusing/
   *  reopening the trigger as a side effect, same idiom as `ino-multiselect`'s `removeChip`. */
  removeChip(option: InoAutocompleteOption, event: Event): void {
    event.stopPropagation();
    if (this.disabled || this.readonly) {
      return;
    }
    this.toggleMultiValue(option);
  }

  onClear(event: Event): void {
    event.stopPropagation();
    this.value = this.multiple ? [] : '';
    this.queryText = '';
    this.valueChange.emit(this.value);
    this.clear.emit();
    this.recomputeFiltered();
  }

  selectActive(): void {
    const row = this.filteredRows[this.activeIndex];
    if (row) {
      this.selectOption(row.option);
      return;
    }
    if (!this.multiple) {
      this.commitQueryText();
    }
    // `multiple` with no active row: Enter is a no-op — there is no free-text token to commit
    // (SPEC.md §5), same as typing into an empty filtered list on `ino-select`'s editable trigger.
  }

  /** Single-selection commit for typed text with no matching row (Enter key path). Mirrors
   *  `ino-select`'s `commitEditableText`: an exact case-insensitive label match becomes that
   *  option; otherwise `forceSelection` decides whether the raw text is accepted (§5). */
  private commitQueryText(): void {
    const match = this.options.find(
      (option) => option.label.toLowerCase() === this.queryText.trim().toLowerCase(),
    );
    if (match) {
      this.commitSingleSelection(match);
      return;
    }
    if (this.forceSelection) {
      this.queryText = '';
      this.value = '';
      this.valueChange.emit('');
    } else {
      this.value = this.queryText.trim();
      this.valueChange.emit(this.value);
    }
    this.close(true);
  }

  /** Blur/outside-click path for `forceSelection` (§5) — same match-or-clear rule as
   *  `commitQueryText`, without the `close(true)` (the caller already closes). */
  private enforceForceSelection(): void {
    const match = this.options.find(
      (option) => option.label.toLowerCase() === this.queryText.trim().toLowerCase(),
    );
    if (match) {
      this.value = match.value;
      this.queryText = match.label;
      this.valueChange.emit(match.value);
    } else if (this.queryText.trim() && this.queryText.trim() !== (this.selectedOption?.label ?? '')) {
      this.queryText = '';
      this.value = '';
      this.valueChange.emit('');
    }
  }

  // ── Query text / async datasource hook (SPEC.md §4) ────────────────────────────────────────

  onQueryInput(event: Event): void {
    this.queryText = (event.target as HTMLInputElement).value;
    if (!this.open) {
      this.openPanel(false);
    }
    this.recomputeFiltered();
    this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row.option));

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const query = this.queryText;
    this.searchTimer = setTimeout(() => this.search.emit(query), SEARCH_DEBOUNCE_MS);
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────────────────────

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open ? this.moveActive(1) : this.openPanel(false);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open ? this.moveActive(-1) : this.openPanel(false);
        break;
      case 'Home':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = this.filteredRows.findIndex((row) => !this.isRowNonInteractive(row.option));
        }
        break;
      case 'End':
        if (this.open) {
          event.preventDefault();
          this.activeIndex = findLastIndex(this.filteredRows, (row) => !this.isRowNonInteractive(row.option));
        }
        break;
      case 'Enter':
        event.preventDefault();
        this.open ? this.selectActive() : this.openPanel(false);
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close(true);
        }
        break;
      case 'Tab':
        if (!this.multiple && this.forceSelection) {
          this.enforceForceSelection();
        }
        this.close(false);
        break;
      default:
        // No typeahead buffer (unlike `ino-select`): this trigger is always a live text input, so
        // every printable character is already driving `onQueryInput`'s filter — see SPEC.md §8.
        break;
    }
  }

  private moveActive(delta: number): void {
    const enabled = this.filteredRows
      .map((row, index) => (this.isRowNonInteractive(row.option) ? -1 : index))
      .filter((i) => i >= 0);
    if (!enabled.length) {
      return;
    }
    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.activeIndex = enabled[nextPos];
  }

  // ── Grouping / filtering ────────────────────────────────────────────────────────────────────

  private recomputeFiltered(): void {
    const query = this.queryText.trim().toLowerCase();
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
