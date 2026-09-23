import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoRadioComponent } from './ino-radio.component';

export interface InoRadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

let idCounter = 0;

/**
 * `<ino-radio-group>` — N `<ino-radio>`s sharing one `name` inside a `<fieldset>`/`<legend>`, the
 * WCAG/WAI-ARIA APG pattern for a radio group. Composes `<ino-radio>` per row (INO-159 uplift)
 * rather than re-implementing native inputs inline — the same "compose the standalone control"
 * call `<ino-checkbox-group>` already made for `<ino-checkbox>`, for the same reason: every
 * state/size `<ino-radio>` carries applies per-row for free instead of drifting from a second
 * copy. See SPEC.md §5.
 *
 * Group-level `disabled` relies on the native `fieldset:disabled` cascade (every `<ino-radio>`'s
 * native `<input>` is a real light-DOM descendant of this `<fieldset>` — Angular's default
 * `ViewEncapsulation.Emulated` scopes CSS, not the DOM tree) *and* is passed down explicitly,
 * because the cascade only flips the native `:disabled` pseudo-class, not `<ino-radio>`'s own
 * `disabled`-driven dimming class.
 */
@Component({
  selector: 'ino-radio-group',
  standalone: true,
  imports: [CommonModule, InoRadioComponent],
  templateUrl: './ino-radio-group.component.html',
  styleUrl: './ino-radio-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoRadioGroupComponent {
  @Input() legend = '';
  @Input() name = `ino-radio-group-${++idCounter}`;
  @Input() options: InoRadioOption[] = [];
  @Input() value = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() error = '';

  @Output() valueChange = new EventEmitter<string>();

  protected readonly errorId = `${this.name}-error`;

  /** `<ino-radio>`'s `checkedChange` only ever fires `true` for a user click (native radios can't
   *  be unchecked by clicking the checked one), but the guard is explicit rather than assumed. */
  onChange(value: string, checked: boolean): void {
    if (!checked) {
      return;
    }
    this.value = value;
    this.valueChange.emit(value);
  }
}
