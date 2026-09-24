import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Template slots for `<ino-virtual-scroller>`, one structural directive per slot.
 *
 * Separate directives rather than PrimeNG's `#item` / `#loader` template-reference convention:
 * a `@ContentChild(TemplateRef)` keyed on a local ref name is a stringly-typed contract the
 * compiler cannot check, and it breaks the moment a consumer wraps the scroller in their own
 * component. A directive selector is checked at compile time and survives projection.
 */

/**
 * Renders one data row.
 *
 * Context: `$implicit` = the item (in `orientation="both"` the *visible slice* of the row),
 * `index` = absolute item index, `columnOffset` = index of the first rendered column
 * (`orientation="both"` only, 0 otherwise), `even` / `odd` = zebra helpers.
 */
@Directive({ selector: '[inoVirtualScrollerItem]', standalone: true })
export class InoVirtualScrollerItemDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Renders one placeholder row while `loading` is true and `showLoader` is set. Context:
 * `index` = the absolute index the placeholder stands in for.
 *
 * Omitted by a consumer, the component falls back to its own token-driven shimmer bar, so the
 * `loading` state is never invisible.
 */
@Directive({ selector: '[inoVirtualScrollerLoader]', standalone: true })
export class InoVirtualScrollerLoaderDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Renders in place of the viewport contents when there are zero items and nothing is loading. */
@Directive({ selector: '[inoVirtualScrollerEmpty]', standalone: true })
export class InoVirtualScrollerEmptyDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Renders above the viewport, outside the scrolling area — sticky column headers, counts, filters. */
@Directive({ selector: '[inoVirtualScrollerHeader]', standalone: true })
export class InoVirtualScrollerHeaderDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Renders below the viewport, outside the scrolling area — totals, paginator mount point. */
@Directive({ selector: '[inoVirtualScrollerFooter]', standalone: true })
export class InoVirtualScrollerFooterDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Every slot directive, for a consumer that wants to import the set in one go. */
export const INO_VIRTUAL_SCROLLER_TEMPLATES = [
  InoVirtualScrollerItemDirective,
  InoVirtualScrollerLoaderDirective,
  InoVirtualScrollerEmptyDirective,
  InoVirtualScrollerHeaderDirective,
  InoVirtualScrollerFooterDirective,
] as const;
