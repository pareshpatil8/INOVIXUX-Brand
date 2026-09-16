import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

/**
 * `<ino-icon-field>` — the sanctioned icon-slot mechanism for Tier-1 form controls (INO-138,
 * INO-31 T-16). A pure layout WRAPPER around a projected control, not an `@Input() icon` bolted
 * onto every control — that is the whole point of the issue: one audited, token-driven place to
 * put a leading/trailing icon instead of every future form component (InputGroup, T-17; the
 * ino-input uplift, U-2/INO-157; etc.) re-inventing its own icon padding/positioning.
 *
 * Usage:
 * ```html
 * <ino-icon-field>
 *   <svg iconLeading>…</svg>
 *   <ino-input />
 *   <svg iconTrailing>…</svg>
 * </ino-icon-field>
 * ```
 * The projected control goes in the DEFAULT slot (no attribute); `[iconLeading]` / `[iconTrailing]`
 * are plain attribute selectors on `ng-content` — not components of their own — so any element
 * (typically an inline `<svg>`) can be dropped in. Both are optional; supplying neither, one, or
 * both are the three variants DoD row 6 asks for (see SPEC.md §1).
 *
 * Layout is side-by-side (icon | control | icon) in a 3-column CSS Grid, NOT icon-overlapping-
 * inside the control the way PrimeNG's `IconField` does. See SPEC.md §1 for why: every control
 * this repo wraps (`ino-input`, `ino-select`, …) is already a fully self-styled leaf component
 * with its own border/background/height — overlapping an icon inside its box would mean reaching
 * into a sibling component's internal padding, which breaks the exact encapsulation this component
 * exists to preserve. Because the icons sit outside the control's own box, this wrapper never
 * needs `overflow: hidden` and never touches the control's own focus ring (DoD row 5) — the
 * control's native `:focus-visible` renders completely unclipped, exactly as it would unwrapped.
 *
 * CSS Grid, specifically, rather than flexbox: this repo's `check-ds-adherence.mjs` bans
 * `::ng-deep` (no sanctioned override mechanism yet — doc 16 §4.3 Layer 4 / N-11), and under
 * Angular's Emulated encapsulation a plain selector can never reach the projected control/icon to
 * give it `flex-grow` (flexbox's stretch mechanism is a property of the ITEM). Grid's
 * `justify-items`/`align-items: stretch` (both left at their default) apply to every grid item by
 * structural position alone — the projected control and icon stretch to fill their tracks without
 * this stylesheet ever needing a selector that matches them. See SPEC.md §2.
 *
 * Grid column order, like flexbox row order, is inline-axis (not physical), so under `dir="rtl"`
 * the `iconLeading` slot — column 1, first in template order — automatically renders at the
 * trailing edge of the reversed row with zero extra CSS; no `inset-inline-*` juggling is needed for
 * ordering (DoD row 8).
 *
 * `size` is a bare adoption of the Wave 0 control-size scale (INO-124) — it re-points only the two
 * aliases this component actually needs (`--ino-control-icon-size`, `--ino-control-gap`); density
 * (`[data-density="dense"|"fluid"]`) falls out for free because those aliases are themselves
 * re-resolved per density in tokens.css §12 — this component adds no density logic of its own
 * (same pattern as `ino-button`/`ino-tag`).
 *
 * `disabled` is a caller-supplied mirror of the wrapped control's own `disabled` state (this
 * wrapper has no native control of its own to read `disabled` from) — it only dims the icons and
 * sets `aria-disabled` for AT that walks the wrapper; it does not (and cannot) disable the
 * projected control itself. Callers set `[disabled]` on both the control and the field.
 */
@Component({
  selector: 'ino-icon-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-icon-field.component.html',
  styleUrl: './ino-icon-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-icon-field',
    '[class.ino-icon-field--sm]': "size === 'sm'",
    '[class.ino-icon-field--lg]': "size === 'lg'",
    '[class.ino-icon-field--disabled]': 'disabled',
    '[attr.aria-disabled]': 'disabled || null',
  },
})
export class InoIconFieldComponent {
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) disabled = false;
}
