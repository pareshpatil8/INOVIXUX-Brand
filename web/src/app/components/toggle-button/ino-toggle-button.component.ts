import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

let idCounter = 0;

/**
 * `<ino-toggle-button>` — single on/off button with two faces (`onLabel`/`offLabel`, plus
 * optional `onIcon`/`offIcon`), WAI-ARIA "toggle button" pattern (`aria-pressed` on a native
 * `<button>`) — distinct from `<ino-toggle>`'s `role="switch"` pattern. A switch is "on/off,
 * takes effect immediately"; a toggle button is "pressed/not pressed," the same semantics a
 * bold/italic formatting button carries. Parity benchmark: PrimeNG `ToggleButton`.
 *
 * The button owns its own visible label — it swaps `onLabel`/`offLabel` (and `onIcon`/`offIcon`
 * when provided) as `pressed` flips, rather than taking projected content, so the two faces can
 * never drift out of sync with the pressed state the way a consumer-authored `<ng-content>` swap
 * could.
 *
 * `size` reads the full `--ino-control-height-*` / `-padding-inline-roomy-*` / `-font-size-*` /
 * `-icon-size-*` / `-gap-*` alias set `ino-button` reads (Wave 0 control-size scale, INO-124) —
 * a full-height pressable label, not the compact track/thumb shape `ino-toggle` reads.
 *
 * Contract: docs/brand/06-angular-components/toggle-button.md. Decisions record:
 * web/src/app/components/toggle-button/SPEC.md.
 */
@Component({
  selector: 'ino-toggle-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-toggle-button.component.html',
  styleUrl: './ino-toggle-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoToggleButtonComponent {
  @Input() onLabel = 'Yes';
  @Input() offLabel = 'No';
  @Input() onIcon = '';
  @Input() offIcon = '';
  @Input() ariaLabel = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) pressed = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() error = '';

  @Output() pressedChange = new EventEmitter<boolean>();

  protected readonly errorId = `ino-toggle-button-error-${++idCounter}`;

  get currentLabel(): string {
    return this.pressed ? this.onLabel : this.offLabel;
  }

  get currentIcon(): string {
    return this.pressed ? this.onIcon : this.offIcon;
  }

  onClick(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.pressed = !this.pressed;
    this.pressedChange.emit(this.pressed);
  }
}
