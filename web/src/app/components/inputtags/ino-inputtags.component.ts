import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
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

export interface InoInputTagsOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoInputTagsTag {
  value: string;
  label: string;
  invalid?: boolean;
}

let idCounter = 0;

const SEARCH_DEBOUNCE_MS = 250;

/**
 * `<ino-inputtags>` — free-entry tag/chip input with autocomplete suggestions (INO-418, INO-31 Phase B1).
 *
 * A hybrid of `<ino-autocomplete>` (for the suggestion mechanism) and chip management: users can type
 * free-form tags and press Enter/comma/blur to add them, or pick from a filtered suggestion list.
 * Each tag renders as a removable chip; Backspace removes the last one when the input is empty.
 *
 * **Variants/Structure:**
 * - Free-entry tags: type any text, press Enter/comma/blur to add
 * - Suggestions: autocomplete dropdown while typing (reuses the overlay pattern from ino-autocomplete)
 * - Max tags: hard cap via `maxTags` — once reached, input dims and becomes non-interactive
 * - Per-tag validation: `validateTag` callback marks individual chips invalid
 *
 * **States (beyond §2 standard set):**
 * - `tag-invalid`: when `validateTag` returns false for a tag
 * - `at-max`: when `value.length >= maxTags`
 *
 * **A11y:**
 * - `role="combobox"` on input with `aria-expanded` tracking dropdown state
 * - Chip list has `role="list"` with each chip as `role="listitem"`
 * - Backspace removal announces "Removed {tag}" via live region
 * - Keyboard: Enter/comma to add, Backspace to remove last, Escape to close suggestions, Arrow keys for navigation
 *
 * **Mobile:** Ports to React Native and Flutter with the same tag-add/remove/validate contract.
 *
 * WCAG 2.2 AA: proper label association, error announcement, focus-visible ring, sufficient contrast.
 */
@Component({
  selector: 'ino-inputtags',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-inputtags.component.html',
  styleUrl: './ino-inputtags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-inputtags',
    '[attr.data-size]': 'size',
    '[class.ino-inputtags--at-max]': 'isAtMax',
    '[class.ino-inputtags--has-tags]': 'value.length > 0',
  },
})
export class InoInputTagsComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() label = '';
  @Input() value: InoInputTagsTag[] = [];
  @Input() suggestions: InoInputTagsOption[] = [];
  @Input() placeholder = 'Add tags…';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) allowDuplicates = false;
  @Input({ transform: booleanAttribute }) addOnBlur = true;
  @Input({ transform: numberAttribute }) maxTags: number | null = null;
  /** Optional per-tag validation. Return true if valid, false if invalid. Invalid tags get
   *  marked with `invalid: true` and styled with `--ino-color-error`. */
  @Input() validateTag: ((tag: string) => boolean) | null = null;
  /** Separator characters that trigger tag addition (beyond Enter). Default: comma. */
  @Input() separators = ',';

  @Output() readonly valueChange = new EventEmitter<InoInputTagsTag[]>();
  @Output() readonly tagAdd = new EventEmitter<InoInputTagsTag>();
  @Output() readonly tagRemove = new EventEmitter<InoInputTagsTag>();
  @Output() readonly search = new EventEmitter<string>();

  /** Custom rendering for one suggestion row. Context: `$implicit` = `InoInputTagsOption`. */
  @ContentChild('suggestionTemplate') suggestionTemplate: TemplateRef<{ $implicit: InoInputTagsOption }> | null = null;
  /** Custom rendering for one chip. Context: `$implicit` = `InoInputTagsTag`. */
  @ContentChild('chipTemplate') chipTemplate: TemplateRef<{ $implicit: InoInputTagsTag }> | null = null;

  @ViewChild('input') private readonly inputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('announcer') private readonly announcerRef?: ElementRef<HTMLDivElement>;

  protected readonly inputId = `ino-inputtags-${++idCounter}`;
  protected readonly listboxId = `${this.inputId}-listbox`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;
  protected readonly announcerId = `${this.inputId}-announcer`;

  protected inputValue = '';
  protected open = false;
  protected activeIndex = -1;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private filteredCache: InoInputTagsOption[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['suggestions']) {
      this.recomputeFiltered();
    }
  }

  ngAfterViewInit(): void {
    this.recomputeFiltered();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  get isAtMax(): boolean {
    return this.maxTags !== null && this.value.length >= this.maxTags;
  }

  get filteredSuggestions(): InoInputTagsOption[] {
    return this.filteredCache;
  }

  get shouldShowSuggestions(): boolean {
    return this.open && this.filteredSuggestions.length > 0 && !this.isAtMax;
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

  onInput(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;

    if (!this.open && !this.isAtMax) {
      this.openPanel();
    }

    this.recomputeFiltered();
    this.activeIndex = this.filteredSuggestions.length > 0 ? 0 : -1;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const query = this.inputValue;
    this.searchTimer = setTimeout(() => this.search.emit(query), SEARCH_DEBOUNCE_MS);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) {
      return;
    }

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (this.open && this.activeIndex >= 0) {
          this.selectSuggestion(this.filteredSuggestions[this.activeIndex]);
        } else if (this.inputValue.trim()) {
          this.addTag(this.inputValue.trim());
        }
        break;
      case 'Backspace':
        if (!this.inputValue && this.value.length > 0) {
          event.preventDefault();
          this.removeLastTag();
        }
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.closePanel();
        }
        break;
      case 'ArrowDown':
        if (this.open) {
          event.preventDefault();
          this.moveActive(1);
        }
        break;
      case 'ArrowUp':
        if (this.open) {
          event.preventDefault();
          this.moveActive(-1);
        }
        break;
      default:
        if (this.separators.includes(event.key)) {
          event.preventDefault();
          if (this.inputValue.trim()) {
            this.addTag(this.inputValue.trim());
          }
        }
        break;
    }
  }

  onBlur(): void {
    if (this.addOnBlur && this.inputValue.trim() && !this.isAtMax) {
      this.addTag(this.inputValue.trim());
    }
    this.closePanel();
  }

  onChipRemove(tag: InoInputTagsTag, event: Event): void {
    event.stopPropagation();
    if (this.disabled || this.readonly) {
      return;
    }
    this.removeTag(tag);
  }

  onSuggestionClick(suggestion: InoInputTagsOption): void {
    this.selectSuggestion(suggestion);
  }

  private addTag(text: string): void {
    if (this.isAtMax) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    if (!this.allowDuplicates && this.value.some((t) => t.value === trimmed)) {
      this.inputValue = '';
      this.cdr.markForCheck();
      return;
    }

    const isValid = this.validateTag ? this.validateTag(trimmed) : true;
    const newTag: InoInputTagsTag = {
      value: trimmed,
      label: trimmed,
      invalid: !isValid,
    };

    const nextValue = [...this.value, newTag];
    this.value = nextValue;
    this.valueChange.emit(nextValue);
    this.tagAdd.emit(newTag);

    this.inputValue = '';
    this.closePanel();
    this.cdr.markForCheck();
  }

  private removeTag(tag: InoInputTagsTag): void {
    const nextValue = this.value.filter((t) => t !== tag);
    this.value = nextValue;
    this.valueChange.emit(nextValue);
    this.tagRemove.emit(tag);
    this.announce(`Removed ${tag.label}`);
    this.cdr.markForCheck();

    setTimeout(() => this.inputRef?.nativeElement.focus(), 0);
  }

  private removeLastTag(): void {
    if (this.value.length > 0) {
      const lastTag = this.value[this.value.length - 1];
      this.removeTag(lastTag);
    }
  }

  private selectSuggestion(suggestion: InoInputTagsOption): void {
    if (suggestion.disabled) {
      return;
    }
    this.addTag(suggestion.value);
  }

  private openPanel(): void {
    if (this.disabled || this.readonly || this.isAtMax) {
      return;
    }
    this.open = true;
    this.recomputeFiltered();
    this.cdr.markForCheck();
  }

  private closePanel(): void {
    this.open = false;
    this.activeIndex = -1;
    this.cdr.markForCheck();
  }

  private moveActive(delta: number): void {
    const enabled = this.filteredSuggestions
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((i) => i >= 0);

    if (!enabled.length) {
      return;
    }

    const currentPos = enabled.indexOf(this.activeIndex);
    const nextPos = clamp(currentPos + delta, 0, enabled.length - 1);
    this.activeIndex = enabled[nextPos];
    this.cdr.markForCheck();
  }

  private recomputeFiltered(): void {
    const query = this.inputValue.trim().toLowerCase();
    this.filteredCache = query
      ? this.suggestions.filter((option) => option.label.toLowerCase().includes(query))
      : this.suggestions;
  }

  private announce(message: string): void {
    if (this.announcerRef) {
      this.announcerRef.nativeElement.textContent = message;
      setTimeout(() => {
        if (this.announcerRef) {
          this.announcerRef.nativeElement.textContent = '';
        }
      }, 1000);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
