import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

let idCounter = 0;

/**
 * `<ino-radio>` — a single native `<input type="radio">` restyled via `accent-color`, matching
 * PrimeNG's `RadioButton` shape: usable standalone (a lone option outside any group) or as the row
 * `<ino-radio-group>` composes N of. `checked` is caller-managed (like `<ino-checkbox>`), not
 * internally toggled — the parent (or `<ino-radio-group>`) owns which option is selected and
 * re-binds `[checked]` down after `checkedChange` fires, the standard pattern for a non-CVA control
 * in this library.
 *
 * Roving tabindex is native, free behavior: every `<input type="radio">` sharing one `name`
 * attribute is a single tab stop with arrow-key cycling, in every evergreen browser, with no custom
 * `tabindex` management needed on either side (standalone or grouped) — see SPEC.md §1.
 *
 * Contract: docs/brand/06-angular-components/radio-group.md. Decisions record:
 * web/src/app/components/radio-group/SPEC.md.
 */
@Component({
  selector: 'ino-radio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-radio.component.html',
  styleUrl: './ino-radio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoRadioComponent {
  @Input() label = '';
  @Input() name = `ino-radio-${++idCounter}`;
  @Input() value = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) checked = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) invalid = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  protected readonly controlId = `ino-radio-${idCounter}-input`;

  /** readonly blocks the native selection outright (native `readonly` has no effect on radios — a
   *  text-input-only IDL attribute, same gap `<ino-checkbox>` documents — so this is the only way to
   *  make a radio actually behave read-only). Space/click-triggered activation fires a native
   *  `click` event, so intercepting `click` alone covers mouse and keyboard. */
  onClick(event: Event): void {
    if (this.readonly || this.loading) {
      event.preventDefault();
    }
  }

  onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checked = checked;
    this.checkedChange.emit(checked);
  }
}
