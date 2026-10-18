import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InoPopoverComponent } from '../popover/ino-popover.component';

/** One crumb in the trail. `href` is an in-app route path (`routerLink`, matching `ino-nav`'s
 * convention) — omit it for a non-navigable ancestor (rendered as plain text). The last entry in
 * `items` is always treated as the current page regardless of whether it carries `href`: see
 * `SPEC.md` §2. */
export interface InoBreadcrumbItem {
  label: string;
  href?: string;
  /** Optional glyph rendered before the label, `aria-hidden` (same string-ligature convention as
   * `InoSelectButtonOption.icon`). */
  icon?: string;
  /** Renders the crumb as inert text with `aria-disabled`; never navigates. */
  disabled?: boolean;
}

/** One rendered position in the trail — either a real crumb or the collapsed-middle ellipsis
 * trigger. Keeping this as a single flat list (rather than three template `*ngFor`s over
 * leading/hidden/trailing slices) lets the separator-via-CSS rule (`SPEC.md` §3) stay a single
 * `:not(:first-child)` selector regardless of whether the trail is collapsed. */
export type InoBreadcrumbNode =
  | { kind: 'item'; item: InoBreadcrumbItem; isCurrent: boolean }
  | { kind: 'ellipsis'; hidden: InoBreadcrumbItem[] };

/**
 * `<ino-breadcrumb>` — page-hierarchy trail with icon support, collapsed-middle `…` overflow for
 * long trails, and Angular Router integration. WAI-ARIA breadcrumb pattern: `nav[aria-label]` +
 * `ol`/`li` + `aria-current="page"` on the current entry. Spec source: doc 26 §5 Phase B2 row
 * `ino-breadcrumb` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on INO-377. Issue:
 * INO-429. Parity benchmark: PrimeNG 22.1.1 `Breadcrumb` — a benchmark only, nothing here imports
 * it.
 *
 * Contract: docs/brand/06-angular-components/ino-breadcrumb.md. Decisions record: `SPEC.md`.
 *
 * "Sizing: one size" per the spec row — reads the unsuffixed `--ino-control-*` alias set directly
 * (no `[data-size]` host attribute), so dense/fluid density still composes for free via
 * tokens.css §12 without a sizing axis to maintain.
 */
@Component({
  selector: 'ino-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, InoPopoverComponent],
  templateUrl: './ino-breadcrumb.component.html',
  styleUrl: './ino-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoBreadcrumbComponent {
  @Input() items: InoBreadcrumbItem[] = [];
  /** Fixed accessible name for the landmark per the spec row; exposed as an @Input only so a
   * caller can localize it — the English default already satisfies `aria-label="breadcrumb"`. */
  @Input() ariaLabel = 'breadcrumb';
  @Input() ellipsisLabel = 'Show hidden breadcrumb items';
  /** Collapses the middle of the trail behind an ellipsis once `items.length` exceeds this count.
   * `0` (default) never collapses. Always resolves to "first + … + last two" — see `SPEC.md` §3
   * for why that shape isn't independently configurable in B2. */
  @Input() maxVisible = 0;
  /** Renders every crumb as inert text; the current-page item is unaffected (it is already
   * non-interactive). See `SPEC.md` §5. */
  @Input({ transform: booleanAttribute }) readonly = false;
  /** Renders a skeleton trail instead of `items` — for a trail whose labels are still resolving
   * (e.g. an async route title). See `SPEC.md` §6. */
  @Input({ transform: booleanAttribute }) loading = false;

  @Output() itemClick = new EventEmitter<InoBreadcrumbItem>();

  protected get isCollapsed(): boolean {
    return this.maxVisible > 0 && this.items.length > this.maxVisible && this.items.length > 3;
  }

  protected get nodes(): InoBreadcrumbNode[] {
    const { items } = this;
    if (!items.length) {
      return [];
    }
    const lastIndex = items.length - 1;
    if (!this.isCollapsed) {
      return items.map((item, index) => ({ kind: 'item', item, isCurrent: index === lastIndex }));
    }
    return [
      { kind: 'item', item: items[0], isCurrent: false },
      { kind: 'ellipsis', hidden: items.slice(1, lastIndex - 1) },
      { kind: 'item', item: items[lastIndex - 1], isCurrent: false },
      { kind: 'item', item: items[lastIndex], isCurrent: true },
    ];
  }

  protected isNavigable(item: InoBreadcrumbItem, isCurrent: boolean): boolean {
    return !isCurrent && !!item.href && !item.disabled && !this.readonly;
  }

  protected onItemClick(item: InoBreadcrumbItem): void {
    this.itemClick.emit(item);
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
