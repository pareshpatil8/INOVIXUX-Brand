import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-checkbox>` — labeled boolean control, built on a real `<input type="checkbox">` (restyled
 * via the `accent-color` CSS property, which is itself bound to `--ino-color-accent`) rather than
 * a custom box + `<svg>` checkmark, so native check/indeterminate/keyboard behavior is free and
 * correct. The 20px input sits inside a `<label>` row with `min-height: --ino-target-comfortable`
 * — the *effective* click target is the full label row (WCAG 2.2 §2.5.8 counts an associated
 * label toward the target), not just the 20px box.
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
  @Input() checked = false;
  @Input() disabled = false;
  @Input() error = '';

  @Output() checkedChange = new EventEmitter<boolean>();

  protected readonly controlId = `ino-checkbox-${++idCounter}`;
  protected readonly errorId = `${this.controlId}-error`;

  onChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checked = checked;
    this.checkedChange.emit(checked);
  }
}
