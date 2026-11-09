import { Directive, TemplateRef, inject } from '@angular/core';

/** Context handed to every item template: `$implicit` = the item, `index` = absolute index into
 *  `value` (the real collection index, not the index within the rendered page window). */
export interface InoDataViewItemContext<T = unknown> {
  $implicit: T;
  index: number;
}

/**
 * Template slots for `<ino-dataview>`, one structural directive per slot — the same convention
 * `ino-virtual-scroller.templates.ts` establishes (a directive selector is a compile-time-checked
 * contract; a `#list`/`#grid` template-reference-name convention, PrimeNG's own choice, is not).
 */

/** Renders one item in `layout="list"`. Required — there is no default list row markup. */
@Directive({ selector: '[inoDataViewListItem]', standalone: true })
export class InoDataViewListItemDirective {
  readonly template = inject<TemplateRef<InoDataViewItemContext>>(TemplateRef);
}

/** Renders one item in `layout="grid"`. Omitted by a consumer, the component falls back to the
 *  list item template inside a grid cell — see `SPEC.md` §2. */
@Directive({ selector: '[inoDataViewGridItem]', standalone: true })
export class InoDataViewGridItemDirective {
  readonly template = inject<TemplateRef<InoDataViewItemContext>>(TemplateRef);
}

/** Renders in place of the item list when `value` is empty and nothing is loading. Omitted by a
 *  consumer, the component falls back to its own `emptyMessage` text. */
@Directive({ selector: '[inoDataViewEmpty]', standalone: true })
export class InoDataViewEmptyDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Every slot directive, for a consumer that wants to import the set in one go. */
export const INO_DATAVIEW_TEMPLATES = [
  InoDataViewListItemDirective,
  InoDataViewGridItemDirective,
  InoDataViewEmptyDirective,
] as const;
