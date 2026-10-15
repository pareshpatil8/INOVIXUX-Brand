import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

let idCounter = 0;

export type InoInputNumberMode = 'decimal' | 'currency' | 'percent';
export type InoInputNumberVariant = 'outline' | 'filled';

/**
 * `<ino-inputnumber>` — numeric input with spinner buttons, locale formatting, and specialized modes.
 * Contract: INO-402 (INO-31 Phase B1, build to doc 26 §2 contract).
 *
 * Promotes from `<ino-input type="number">` with:
 * - Spinner buttons (increment/decrement) — hideable via `showButtons={false}`
 * - Currency/percent/decimal modes with locale-aware formatting
 * - Prefix/suffix slots
 * - Locale digit grouping (including Indic scripts)
 * - Min/max constraints with at-min/at-max visual states
 * - Full a11y: `role=spinbutton`, `aria-valuemin/max/now`, keyboard support
 *
 * Keyboard contract (APG spinbutton pattern):
 * - Up/Down arrows: increment/decrement by step
 * - PageUp/PageDown: increment/decrement by step * 10
 * - Home/End: jump to min/max (if set)
 *
 * WCAG 2.2 AA: proper label association, error announcement via `aria-describedby`,
 * spinner buttons labeled with `aria-label`, focus-visible ring.
 */
@Component({
  selector: 'ino-inputnumber',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-inputnumber.component.html',
  styleUrl: './ino-inputnumber.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-inputnumber',
    '[attr.data-size]': 'size',
    '[class.ino-inputnumber--filled]': "variant === 'filled'",
    '[class.ino-inputnumber--at-min]': 'isAtMin()',
    '[class.ino-inputnumber--at-max]': 'isAtMax()',
    '[class.ino-inputnumber--no-buttons]': '!showButtons',
  },
})
export class InoInputNumberComponent {
  @Input() label = '';
  @Input() value: number | null = null;
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input() variant: InoInputNumberVariant = 'outline';
  @Input() mode: InoInputNumberMode = 'decimal';
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() locale = 'en-US';
  @Input() currency = 'USD';
  @Input({ transform: numberAttribute }) min: number | null = null;
  @Input({ transform: numberAttribute }) max: number | null = null;
  @Input({ transform: numberAttribute }) step = 1;
  @Input({ transform: numberAttribute }) minFractionDigits = 0;
  @Input({ transform: numberAttribute }) maxFractionDigits = 3;
  @Input({ transform: booleanAttribute }) useGrouping = true;
  @Input({ transform: booleanAttribute }) showButtons = true;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() valueChange = new EventEmitter<number | null>();

  protected readonly inputId = `ino-inputnumber-${++idCounter}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;
  protected readonly incrementBtnId = `${this.inputId}-increment`;
  protected readonly decrementBtnId = `${this.inputId}-decrement`;

  protected focused = false;
  protected inputText = '';

  protected get formattedValue(): string {
    if (this.value === null || this.value === undefined) return '';

    try {
      const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: this.minFractionDigits,
        maximumFractionDigits: this.maxFractionDigits,
        useGrouping: this.useGrouping,
      };

      if (this.mode === 'currency') {
        options.style = 'currency';
        options.currency = this.currency;
      } else if (this.mode === 'percent') {
        options.style = 'percent';
      }

      return new Intl.NumberFormat(this.locale, options).format(this.value);
    } catch {
      return String(this.value);
    }
  }

  protected get displayValue(): string {
    if (this.focused) {
      return this.inputText;
    }
    return this.formattedValue;
  }

  protected isAtMin(): boolean {
    return this.value !== null && this.min !== null && this.value <= this.min;
  }

  protected isAtMax(): boolean {
    return this.value !== null && this.max !== null && this.value >= this.max;
  }

  onFocus(event: FocusEvent): void {
    this.focused = true;
    this.inputText = this.value !== null && this.value !== undefined ? String(this.value) : '';
  }

  onBlur(event: FocusEvent): void {
    this.focused = false;
  }

  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const rawValue = inputElement.value;
    this.inputText = rawValue;

    if (rawValue === '' || rawValue === '-') {
      this.value = null;
      this.valueChange.emit(null);
      return;
    }

    const parsed = parseFloat(rawValue);
    if (!isNaN(parsed)) {
      this.updateValue(parsed);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.increment(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.decrement(1);
        break;
      case 'PageUp':
        event.preventDefault();
        this.increment(10);
        break;
      case 'PageDown':
        event.preventDefault();
        this.decrement(10);
        break;
      case 'Home':
        if (this.min !== null) {
          event.preventDefault();
          this.updateValue(this.min);
        }
        break;
      case 'End':
        if (this.max !== null) {
          event.preventDefault();
          this.updateValue(this.max);
        }
        break;
    }
  }

  increment(multiplier = 1): void {
    if (this.disabled || this.readonly) return;

    const currentValue = this.value ?? 0;
    const newValue = currentValue + (this.step * multiplier);
    this.updateValue(newValue);
    if (this.focused) {
      this.inputText = String(this.value);
    }
  }

  decrement(multiplier = 1): void {
    if (this.disabled || this.readonly) return;

    const currentValue = this.value ?? 0;
    const newValue = currentValue - (this.step * multiplier);
    this.updateValue(newValue);
    if (this.focused) {
      this.inputText = String(this.value);
    }
  }

  protected updateValue(value: number): void {
    let clampedValue = value;

    if (this.min !== null && clampedValue < this.min) {
      clampedValue = this.min;
    }
    if (this.max !== null && clampedValue > this.max) {
      clampedValue = this.max;
    }

    this.value = clampedValue;
    this.valueChange.emit(clampedValue);
  }
}
