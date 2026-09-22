import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Template slots for `<ino-table>`, one structural directive per slot — the same idiom
 * `ino-virtual-scroller` uses (see that component's `.templates.ts`), for the same reason: a
 * directive selector is a compile-time-checked contract, unlike PrimeNG's stringly-typed
 * `#template` local-ref convention.
 */

/**
 * Custom cell renderer for one column, keyed by `InoTableColumn.id`. Falls back to the column's
 * `field` value stringified when no template is supplied for that column id.
 *
 * Context: `$implicit` = the cell value, `row` = the whole row object, `column` = the column
 * config, `rowIndex` = index into the (post sort/filter) row list.
 */
@Directive({ selector: '[inoTableCell]', standalone: true })
export class InoTableCellDirective {
  @Input('inoTableCell') columnId = '';
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Expandable row detail content. Context: `$implicit` = the row, `rowIndex`. */
@Directive({ selector: '[inoTableRowDetail]', standalone: true })
export class InoTableRowDetailDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Renders in place of the body when there are zero rows and `loading` is false. */
@Directive({ selector: '[inoTableEmpty]', standalone: true })
export class InoTableEmptyDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Every slot directive, for a consumer that wants to import the set in one go. */
export const INO_TABLE_TEMPLATES = [
  InoTableCellDirective,
  InoTableRowDetailDirective,
  InoTableEmptyDirective,
] as const;
