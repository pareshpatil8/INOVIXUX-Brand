import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InoSelectOption {
  label: string;
  value: string;
}

let idCounter = 0;

/**
 * `<ino-select>` — labeled native `<select>`. Kept as a real `<select>` (not a custom listbox)
 * so keyboard/AT behavior is free and correct; `appearance: none` + a decorative chevron glyph
 * supply the visual restyle without touching semantics. Same label/hint/error contract as
 * `<ino-input>` — see that component's doc comment for the WCAG rationale.
 */
@Component({
  selector: 'ino-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-select.component.html',
  styleUrl: './ino-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoSelectComponent {
  @Input() label = '';
  @Input() options: InoSelectOption[] = [];
  @Input() value = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  protected readonly selectId = `ino-select-${++idCounter}`;
  protected readonly hintId = `${this.selectId}-hint`;
  protected readonly errorId = `${this.selectId}-error`;

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.value = value;
    this.valueChange.emit(value);
  }
}
