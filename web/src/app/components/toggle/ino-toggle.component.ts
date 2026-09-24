import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

let idCounter = 0;

/**
 * `<ino-toggle>` — boolean switch, WAI-ARIA APG "switch" pattern (`role="switch"` on a native
 * `<button>`, not a checkbox skinned to look like a switch) since a toggle's semantics are
 * "on/off, takes effect immediately," distinct from a checkbox's "selected/not selected in a set."
 * Accessible name comes from the visible `label` text when provided (the `<button>` is
 * self-labelling from its own text content); pass `ariaLabel` for a label-less/icon-adjacent
 * toggle instead of duplicating text.
 *
 * `size` reads the same `--ino-control-icon-size-*` / `-font-size-*` / `-gap-*` alias trio
 * `ino-checkbox` reads (Wave 0 control-size scale, INO-124) rather than `--ino-control-height` —
 * a track/thumb pair is a compact inline shape, not a full-height control. Track width and thumb
 * travel are `calc()` geometry off the single thumb-size alias, not new literals — see SCSS.
 *
 * The on/off icon inside the thumb is a glyph overlay, not a second icon fixed under the track:
 * it rides with the thumb and swaps with `checked`, same shape PrimeNG's ToggleSwitch handle-icon
 * template uses. `error` mirrors `ino-checkbox`'s contract: a non-empty string sets
 * `aria-invalid`, renders the message, and paints a ring on the track itself.
 *
 * Contract: docs/brand/06-angular-components/toggle.md. Decisions record:
 * web/src/app/components/toggle/SPEC.md.
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
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) checked = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() error = '';

  @Output() checkedChange = new EventEmitter<boolean>();

  protected readonly errorId = `ino-toggle-error-${++idCounter}`;

  onToggle(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
