import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InoControlSize } from '../control-size';

/**
 * `<ino-card>` — generic surface container: bento-grid tiles, KYB report/finding cards,
 * mobile app list cards, dashboard widgets. NOT a replacement for `<ino-tier-card>` or
 * `<ino-metric-panel>`, which carry their own required semantics (INO-14 disclaimer,
 * closed RAG status union) — this is the un-opinionated shell those two, and any future
 * card-shaped component, could be built on top of.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
 * PrimeNG parity benchmark (INO-161 / INO-31 U-6): `Card` — header/media, body, footer.
 *
 * `variant` binds to one of the three surface roles in tokens.css §2 — never a raw
 * background value:
 *   - `default` (--ino-color-surface-raised) — normal card on a page/section background.
 *   - `sunken`  (--ino-color-surface-sunken)  — inset panel, e.g. a card nested inside
 *               another card or a code/data block; never the topmost surface.
 *   - `overlay` (--ino-color-surface-raised + --ino-elevation-2) — modal/sheet/popover
 *               body; pair with `<ino-color-overlay-scrim>` as the backdrop, not this
 *               component (the scrim is a separate full-viewport element).
 * `interactive` adds hover/focus elevation and a pointer affordance for cards that are
 * themselves a click/tap target (e.g. wrapped in an `<a>` or bound to `(click)`); it does
 * NOT make the card a `<button>` — callers own the actual interactive element/role/
 * keyboard handling, this only supplies the visual state.
 *
 * `padding` (pre-existing) sizes the body content's own breathing room — orthogonal to the
 * new `size` input below, which sizes the header/footer chrome. See SPEC.md §3 for why these
 * stay two separate knobs instead of collapsing into one.
 *
 * `size` (INO-161, Wave 0 control-size scale) sizes the header/footer bars' padding and
 * type: `--ino-control-padding-inline-roomy` + `--ino-control-font-size` + `--ino-control-gap`.
 * Do not invent local sizing values — see SPEC.md §3 for the exact field subset and reasoning.
 *
 * `[ino-card-media]` (new, INO-161) is a full-bleed slot above the header — an image, icon
 * tile, or other visual — clipped to the card's own corner radius. This is PrimeNG Card's
 * `header` template shape; it is named `media` here (not `header`) because this repo's
 * `[ino-card-header]` slot already means something different (a title/eyebrow bar) across
 * every existing call site — see SPEC.md §1.
 *
 * `disabled` dims the whole card (opacity) and, combined with `interactive`, also drops
 * the hover/press/focus affordances and blocks pointer events — the same "visually present,
 * inert" treatment `<ino-tag>`'s `disabled` uses. `loading` dims the body content and shows
 * a centered spinner (`aria-busy`) without unmounting it, for an async-loaded card (a
 * dashboard widget or KYB finding card still fetching). See SPEC.md §2 for the full eight-
 * state table, including the two states (`readonly`, `invalid`) deliberately not carried.
 */
@Component({
  selector: 'ino-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-card.component.html',
  styleUrl: './ino-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoCardComponent {
  @Input() variant: 'default' | 'sunken' | 'overlay' = 'default';
  @Input() padding: 'sm' | 'md' | 'lg' = 'md';
  @Input() size: InoControlSize = 'default';
  @Input() interactive = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
}
