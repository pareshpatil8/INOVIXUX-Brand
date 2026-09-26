import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export type InoSkeletonShape = 'rectangle' | 'circle' | 'text';

/**
 * `<ino-skeleton>` — INO-131 (INO-31 T-14, Tier 1 / Misc group). Closes doc 16 finding E-4 (no
 * loading placeholder for `ino-card`/`ino-metric-panel`).
 *
 * Parity benchmark: PrimeNG 22.1.1 `Skeleton` (`specs/primeng/llms-22.1.1.txt` line 108,
 * `https://primeng.dev/skeleton`) — `shape`/`width`/`height`/`borderRadius` map directly; `size`
 * replaces PrimeNG's free-text `width`/`height` pair with the closed Wave 0 control-size scale so a
 * placeholder that stands in for a button/field/avatar reuses the exact geometry that control
 * renders at, rather than a hand-guessed pixel count. Contract: SPEC.md, full write-up:
 * `docs/brand/06-angular-components/skeleton.md`.
 *
 * A pure CSS placeholder, not a layout primitive: it never reserves space for content it hasn't
 * seen (that's the caller's job, same as PrimeNG) — it just paints the box the caller sizes via
 * `shape`/`size`/`width`/`height`.
 */
@Component({
  selector: 'ino-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-skeleton.component.html',
  styleUrl: './ino-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-skeleton',
    '[attr.data-shape]': 'shape',
    '[attr.data-size]': 'size',
    '[class.ino-skeleton--static]': '!animate',
    '[style.inline-size]': 'width || null',
    '[style.block-size]': 'height || null',
    '[style.border-radius]': 'borderRadius || null',
    '[attr.role]': "label ? 'status' : null",
    '[attr.aria-live]': "label ? 'polite' : null",
    '[attr.aria-busy]': "label ? 'true' : null",
    '[attr.aria-hidden]': "label ? null : 'true'",
  },
})
export class InoSkeletonComponent {
  @Input() shape: InoSkeletonShape = 'rectangle';
  @Input() size: InoControlSize = 'default';
  /** CSS length, e.g. `'12rem'` / `'60%'`. Unset falls back to the shape's own default (§ SPEC.md 3). */
  @Input() width = '';
  /** CSS length override. Unset falls back to the size-driven control-height (rectangle/circle) or 1em (text). */
  @Input() height = '';
  /** CSS length override. Unset falls back to the shape's own default radius. */
  @Input() borderRadius = '';
  @Input({ transform: booleanAttribute }) animate = true;
  /**
   * Optional accessible loading announcement (e.g. "Loading trades…"). Empty (default): the
   * placeholder is purely decorative and `aria-hidden`, since the real content it stands in for
   * will announce itself once it renders — see SPEC.md §5.
   */
  @Input() label = '';
}
