import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * `<ino-toggle>` — boolean switch, WAI-ARIA APG "switch" pattern (`role="switch"` on a native
 * `<button>`, not a checkbox skinned to look like a switch) since a toggle's semantics are
 * "on/off, takes effect immediately," distinct from a checkbox's "selected/not selected in a set."
 * Accessible name comes from the visible `label` text when provided; pass `ariaLabel` for a
 * label-less/icon-adjacent toggle instead of duplicating text.
 */
@Component({
  selector: 'ino-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-toggle.component.html',
  styleUrl: './ino-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoToggleComponent {
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() checked = false;
  @Input() disabled = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  onToggle(): void {
    if (this.disabled) {
      return;
    }
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
