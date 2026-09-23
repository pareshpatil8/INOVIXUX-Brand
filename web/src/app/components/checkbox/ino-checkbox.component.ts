import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

let idCounter = 0;

/**
 * `<ino-checkbox>` — labeled boolean/tri-state control, built on a real `<input type="checkbox">`
 * (restyled via the `accent-color` CSS property, which is itself bound to `--ino-color-accent`)
 * rather than a custom box + `<svg>` checkmark, so native check/indeterminate/keyboard behavior is
 * free and correct. The box sits inside a `<label>` row with `min-height:
 * var(--ino-row-min-height, --ino-target-comfortable)` — the *effective* click target is the full
 * label row (WCAG 2.2 §2.5.8 counts an associated label toward the target), not just the box.
 *
 * `indeterminate` binds straight to the native `HTMLInputElement.indeterminate` DOM property (a
 * real Angular property binding — no directive/ElementRef needed since Angular binds `[prop]` to
 * any DOM property the host element actually has). Browsers already expose that IDL property to
 * the accessibility tree as the mixed checked state (HTML-AAM); `aria-checked="mixed"` is also
 * bound explicitly here (DoD's literal wording) so the value is present in the rendered markup
 * for tooling that inspects attributes rather than the live a11y tree, not just implied by it.
 * Interacting with an indeterminate checkbox (click or Space) always resolves it to a concrete
 * `checked` value, same as native browser behavior — `onChange` clears `indeterminate` and emits
 * `indeterminateChange` so a caller bound with `[(indeterminate)]` doesn't fight the DOM back to
 * `true` on the next change-detection pass.
 *
 * Contract: docs/brand/06-angular-components/checkbox.md. Decisions record:
 * web/src/app/components/checkbox/SPEC.md.
 */
@Component({
  selector: 'ino-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-checkbox.component.html',
  styleUrl: './ino-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoCheckboxComponent {
  @Input() label = '';
  @Input() name = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) checked = false;
  @Input({ transform: booleanAttribute }) indeterminate = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() error = '';

  @Output() checkedChange = new EventEmitter<boolean>();
  @Output() indeterminateChange = new EventEmitter<boolean>();

  protected readonly controlId = `ino-checkbox-${++idCounter}`;
  protected readonly errorId = `${this.controlId}-error`;

  /** readonly blocks the native toggle outright (native `readonly` has no effect on checkboxes —
   *  it's a text-input-only IDL attribute per the HTML spec — so this is the only way to make a
   *  checkbox actually behave read-only rather than merely announce it). Space-triggered
   *  activation fires a `click` event in every evergreen browser, so intercepting `click` alone
   *  covers both mouse and keyboard without a separate keydown handler. */
  onClick(event: Event): void {
    if (this.readonly) {
      event.preventDefault();
    }
  }

  onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checked = checked;
    this.checkedChange.emit(checked);

    if (this.indeterminate) {
      this.indeterminate = false;
      this.indeterminateChange.emit(false);
    }
  }
}
