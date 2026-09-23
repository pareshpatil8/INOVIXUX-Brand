import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';
import { InoOverlayPosition } from '../confirm-popup/overlay-position';

/**
 * `<ino-tooltip>` — the floating panel half of Tooltip (INO-31 T-22 / INO-149). Never placed
 * directly by a caller; `[inoTooltip]` (`ino-tooltip.directive.ts`) creates exactly one instance
 * per trigger and drives its `open`/`text`/`position`/`size` inputs. Split this way — panel markup
 * here, hover/focus/delay/dismiss wiring in the directive — for the same reason a directive (not a
 * second element the caller has to remember to place) is the right shape for "annotate this
 * element with a hint," matching the PrimeNG `pTooltip` benchmark's own directive-first API
 * (`specs/primeng/llms-22.1.1.txt` line 126).
 *
 * `role="tooltip"` per WAI-ARIA APG — never focusable, never interactive. Content is plain text
 * (`text`, not `ng-content`) by design: WCAG 1.4.13 requires the tooltip not be the *only* carrier
 * of the information it conveys, and a plain-text input keeps that constraint visible at the call
 * site instead of inviting rich, form-field-bearing content that would need its own focus/hover
 * management to satisfy "hoverable." See SPEC.md §3.
 */
@Component({
  selector: 'ino-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-tooltip.component.html',
  styleUrl: './ino-tooltip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoTooltipComponent {
  @Input() open = false;
  @Input() text = '';
  @Input() position: InoOverlayPosition = 'top';
  @Input() size: InoControlSize = 'default';
  @Input() tooltipId = '';
  @Input() top = 0;
  @Input() left = 0;

  /** The pointer entered/left the panel itself — the "hoverable" leg of WCAG SC 1.4.13. */
  @Output() panelEnter = new EventEmitter<void>();
  @Output() panelLeave = new EventEmitter<void>();

  @HostListener('mouseenter')
  protected onMouseenter(): void {
    this.panelEnter.emit();
  }

  @HostListener('mouseleave')
  protected onMouseleave(): void {
    this.panelLeave.emit();
  }
}
