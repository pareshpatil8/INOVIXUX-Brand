import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InoRadioOption {
  label: string;
  value: string;
}

let idCounter = 0;

/**
 * `<ino-radio-group>` — a single option's worth of grouping logic wrapping N native
 * `<input type="radio">`s inside a `<fieldset>`/`<legend>`, the WCAG/WAI-ARIA APG pattern for
 * a radio group (not N independent `<ino-radio>` components each re-managing the shared `name`
 * attribute). Same `accent-color` restyle approach as `<ino-checkbox>`.
 */
@Component({
  selector: 'ino-radio-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-radio-group.component.html',
  styleUrl: './ino-radio-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoRadioGroupComponent {
  @Input() legend = '';
  @Input() name = `ino-radio-group-${++idCounter}`;
  @Input() options: InoRadioOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Input() error = '';

  @Output() valueChange = new EventEmitter<string>();

  protected readonly errorId = `${this.name}-error`;

  onChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
