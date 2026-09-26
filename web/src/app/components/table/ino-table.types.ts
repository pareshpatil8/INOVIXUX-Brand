/**
 * Shared types for `<ino-table>` (INO-155, INO-31 T-1, Tier 1 / Data group).
 *
 * Kept in their own file, same convention `virtual-axis.ts` sets for `ino-virtual-scroller`:
 * the column/event shapes are useful to a consumer building column definitions in a parent
 * component or service, independent of importing the component class itself.
 */

export type InoTableColumnAlign = 'start' | 'center' | 'end';
export type InoTableFrozenSide = 'start' | 'end';
export type InoTableSortDirection = 'asc' | 'desc' | null;
export type InoTableSelectionMode = 'none' | 'single' | 'multiple' | 'checkbox';
export type InoTableFilterType = 'text' | 'select';

export interface InoTableFilterOption {
  label: string;
  value: unknown;
}

export interface InoTableColumn<T = unknown> {
  /** Stable identity — used for sort/filter/resize/reorder/frozen state and template matching. */
  id: string;
  header: string;
  /** Dot-path is NOT supported on purpose (keeps `getCellValue` a single property read, no eval-ish
   *  path walking); pass a `field` that is a direct key of `T`, or omit it and supply an
   *  `[inoTableCell]` template that computes the display value itself. */
  field?: string;
  /** Any CSS inline-size value. Starting width before a user drag-resizes the column. */
  width?: string;
  /** Floor for drag-resize, default `56px`. */
  minWidth?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: InoTableFilterType;
  filterOptions?: readonly InoTableFilterOption[];
  /** Double-click or Enter/F2 on a focused cell in this column swaps it into an `<input>`. */
  editable?: boolean;
  align?: InoTableColumnAlign;
  /** `position: sticky` to the named edge. See `SPEC.md` §6 for the offset math. */
  frozen?: InoTableFrozenSide;
  /** Hidden from resize/reorder controls when `false` — e.g. a selection or expander column. */
  reorderable?: boolean;
  resizable?: boolean;
}

export interface InoTableSortEvent {
  columnId: string | null;
  direction: InoTableSortDirection;
}

export interface InoTableCellEditEvent<T = unknown> {
  row: T;
  column: InoTableColumn<T>;
  oldValue: unknown;
  newValue: unknown;
}

export interface InoTableRowExpandEvent<T = unknown> {
  row: T;
  expanded: boolean;
}

export interface InoTableColumnResizeEvent {
  columnId: string;
  width: number;
}

export interface InoTableColumnReorderEvent {
  columnIds: string[];
}

export interface InoTablePageEvent {
  first: number;
  rows: number;
}

/**
 * Local, self-contained filter mechanism — a placeholder shaped to be swappable for the future
 * `FilterService` (H-2 per `docs/brand/16-design-system-parity-vs-echeque-reference.md`) without
 * an API break. A future service integration replaces the default implementation this input
 * carries; the input itself (a plain predicate function) does not need to change shape.
 */
export type InoTableFilterPredicate<T = unknown> = (
  row: T,
  column: InoTableColumn<T>,
  filterValue: unknown,
) => boolean;

export function inoTableDefaultFilterPredicate<T = unknown>(
  row: T,
  column: InoTableColumn<T>,
  filterValue: unknown,
): boolean {
  if (filterValue === null || filterValue === undefined || filterValue === '') return true;
  const raw = column.field ? (row as Record<string, unknown>)[column.field] : undefined;
  if (column.filterType === 'select') {
    return raw === filterValue;
  }
  const haystack = raw == null ? '' : String(raw).toLowerCase();
  return haystack.includes(String(filterValue).toLowerCase());
}
