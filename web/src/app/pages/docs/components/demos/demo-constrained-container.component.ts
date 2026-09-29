import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** The ancestor shapes a docs demo can wrap a trigger in — each reproduces a distinct way an
 *  overlay's positioning can break, so D1-class anchoring bugs (doc 26 §1/§4-A1) surface on the
 *  docs portal in dev instead of on published Pages:
 *
 * - `positioned` — a `position: relative` ancestor elsewhere on the page. This is the actual
 *   INO-364 bug shape: an overlay with no positioned ancestor *inside* its own component resolves
 *   `position: absolute` against whichever positioned ancestor happens to exist on the host page.
 * - `scroll` — a scrolling/clipping ancestor (`overflow: auto` + fixed height). Exercises
 *   `appendTo="self"` staying clipped vs `appendTo="body"` escaping via a body portal.
 * - `narrow` — a width-constrained ancestor near a viewport edge, for flip/clamp behavior when
 *   the overlay's default side has no room.
 */
export type DemoConstrainedContainerVariant = 'positioned' | 'scroll' | 'narrow';

/**
 * Reusable "constrained container" demo harness (doc 26 §6 C2). Generalizes the ad-hoc
 * `.demo-positioned-ancestor` / `.demo-scroll-ancestor` panes INO-364 hand-rolled for the
 * datepicker regression demos (`datepicker-time-demo.component.html`) into a component any
 * hand-authored `CUSTOM_DEMOS` entry can drop in around an overlay-based trigger:
 *
 * ```html
 * <app-demo-constrained-container variant="positioned">
 *   <ino-datepicker label="…" />
 * </app-demo-constrained-container>
 * ```
 *
 * Token-bound styling only (`demo-shared.scss`), same rule the rest of the hand-authored §2
 * contract demos follow.
 */
@Component({
  selector: 'app-demo-constrained-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-constrained" [ngClass]="'demo-constrained--' + variant">
      <div class="demo-constrained__spacer" *ngIf="variant === 'scroll'"></div>
      <ng-content></ng-content>
      <div class="demo-constrained__spacer" *ngIf="variant === 'scroll'"></div>
    </div>
  `,
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoConstrainedContainerComponent {
  @Input() variant: DemoConstrainedContainerVariant = 'positioned';
}
