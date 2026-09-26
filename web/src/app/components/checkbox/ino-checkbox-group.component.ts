import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoCheckboxComponent } from './ino-checkbox.component';

export interface InoCheckboxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

let idCounter = 0;

/**
 * `<ino-checkbox-group>` — N `<ino-checkbox>`s sharing one `name`, one `<fieldset>`/`<legend>`
 * grouping (the WCAG/WAI-ARIA APG pattern for a related set of checkboxes — same reasoning
 * `ino-radio-group` already documents for radios) and one validation message, with `value` bound
 * as a plain `string[]` of selected option values rather than N independent booleans.
 *
 * Group-level `disabled` relies on the native `fieldset:disabled` cascade to actually lock every
 * descendant `<input>` (each `<ino-checkbox>`'s native input is a real DOM descendant of this
 * `<fieldset>`, not hidden behind any shadow boundary), same as `ino-radio-group`. It is still
 * passed down explicitly too, because the cascade only flips the native `:disabled` pseudo-class —
 * it does not know about `ino-checkbox`'s own `disabled`-driven dimming class, which needs the
 * `@Input` set directly to render correctly.
 */
@Component({
  selector: 'ino-checkbox-group',
  standalone: true,
  imports: [CommonModule, InoCheckboxComponent],
  templateUrl: './ino-checkbox-group.component.html',
  styleUrl: './ino-checkbox-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoCheckboxGroupComponent {
  @Input() legend = '';
  @Input() name = `ino-checkbox-group-${++idCounter}`;
  @Input() options: InoCheckboxOption[] = [];
  @Input() value: string[] = [];
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() error = '';

  @Output() valueChange = new EventEmitter<string[]>();

  protected readonly errorId = `${this.name}-error`;

  isChecked(optionValue: string): boolean {
    return this.value.includes(optionValue);
  }

  onToggle(optionValue: string, checked: boolean): void {
    const next = checked
      ? [...this.value, optionValue]
      : this.value.filter((v) => v !== optionValue);
    this.value = next;
    this.valueChange.emit(next);
  }
}
