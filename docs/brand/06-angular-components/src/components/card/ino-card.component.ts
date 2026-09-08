import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * `<ino-card>` — generic surface container: bento-grid tiles, KYB report/finding cards,
 * mobile app list cards, dashboard widgets. NOT a replacement for `<ino-tier-card>` or
 * `<ino-metric-panel>`, which carry their own required semantics (INO-14 disclaimer,
 * closed RAG status union) — this is the un-opinionated shell those two, and any future
 * card-shaped component, could be built on top of.
 * Contract: docs/brand/02-design-tokens/angular-theme-contract.md §3.
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
  @Input() interactive = false;
}
