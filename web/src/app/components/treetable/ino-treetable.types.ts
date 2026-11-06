/**
 * TreeTable component types
 *
 * Issue: INO-452 (INO-31 Phase B3)
 * Spec: web/src/app/components/treetable/SPEC.md
 */

/**
 * A single row in the treetable, supporting hierarchical nesting.
 * Extends the tree-select node model with arbitrary column values.
 */
export interface InoTreeTableRow {
  /**
   * Unique identifier for this row (used in expandedRowValues tracking).
   */
  value: string;

  /**
   * Optional child rows. `undefined` = lazy-loadable (will emit loadChildren on expand);
   * `[]` = leaf node; non-empty array = branch with children.
   */
  children?: InoTreeTableRow[];

  /**
   * Per-row loading state. When true, this row's expand chevron shows a spinner
   * and the row carries `aria-busy`.
   */
  loading?: boolean;

  /**
   * Column values, keyed by column.field. Any additional properties on this
   * interface are treated as column data.
   */
  [columnField: string]: any;
}

/**
 * Internal flattened row representation, computed by recomputeRows().
 * Extends InoTreeTableRow with tree-structure metadata for rendering.
 */
export interface InoTreeTableFlattenedRow extends InoTreeTableRow {
  /**
   * 0-indexed nesting level (0 = root). Rendered as `aria-level="${level + 1}"`.
   */
  level: number;

  /**
   * Whether this row is currently expanded (true/false for branches, undefined for leaves).
   * Rendered as `aria-expanded="${expanded}"`.
   */
  expanded?: boolean;

  /**
   * Root-first ancestor chain (array of ancestor `value`s).
   * Used by ArrowLeft keyboard navigation to find parent row.
   */
  parentValues: string[];

  /**
   * Absolute index in the visibleRows array (used for keyboard navigation).
   */
  flatIndex: number;
}

/**
 * Column definition for the treetable.
 * Extends the base table column model with tree-specific flags.
 */
export interface InoTreeTableColumn {
  /**
   * Property path in InoTreeTableRow for this column's value.
   * For nested properties, use dot notation (e.g., "user.name").
   */
  field: string;

  /**
   * Column header text. Required for accessibility (renders as <th> text or aria-label).
   */
  header: string;

  /**
   * Whether this column is sortable. Default: false.
   * Sortable columns render a clickable header with sort direction indicator.
   */
  sortable?: boolean;

  /**
   * Whether this column is frozen. 'start' = left edge, 'end' = right edge, false = scrollable.
   * Default for tree column (first column): 'start'. Default for others: false.
   */
  frozen?: 'start' | 'end' | false;

  /**
   * Minimum column width in pixels. Used by resize logic.
   */
  minWidth?: number;

  /**
   * Current column width in pixels (controlled, updated on resize).
   */
  width?: number;

  /**
   * Whether this column is resizable. Default: true.
   */
  resizable?: boolean;

  /**
   * Custom cell template name (maps to ng-template inoTableCellTemplate directives).
   * If unset, cell renders as plain text from row[field].
   */
  cellTemplate?: string;

  /**
   * Custom header template name.
   */
  headerTemplate?: string;
}

/**
 * Sort event emitted when a sortable column header is clicked.
 */
export interface InoTreeTableSortEvent {
  /**
   * The column being sorted.
   */
  column: InoTreeTableColumn;

  /**
   * Sort direction: 'asc' | 'desc' | null (null = unsorted / returned to natural order).
   */
  direction: 'asc' | 'desc' | null;

  /**
   * Index of the sorted column in the columns array.
   */
  columnIndex: number;
}

/**
 * Load children event emitted when a lazy-loadable branch is expanded.
 */
export interface InoTreeTableLoadChildrenEvent {
  /**
   * The row being expanded (has children: undefined).
   */
  row: InoTreeTableRow;

  /**
   * The row's unique value (same as row.value, provided for convenience).
   */
  value: string;
}

/**
 * Cell activation event (click or Enter/Space on a focused cell).
 * Used for custom row-expansion or drill-down logic.
 */
export interface InoTreeTableCellActivateEvent {
  /**
   * The row containing the activated cell.
   */
  row: InoTreeTableFlattenedRow;

  /**
   * The column containing the activated cell.
   */
  column: InoTreeTableColumn;

  /**
   * Row index in visibleRows.
   */
  rowIndex: number;

  /**
   * Column index.
   */
  columnIndex: number;

  /**
   * Original DOM event (click or keyboard event).
   */
  originalEvent: Event;
}

/**
 * Active cell position (for roving tabindex tracking).
 */
export interface InoTreeTableActiveCell {
  /**
   * Row index in visibleRows.
   */
  rowIndex: number;

  /**
   * Column index.
   */
  columnIndex: number;
}

/**
 * Sort direction type.
 */
export type InoTreeTableSortDirection = 'asc' | 'desc' | null;

/**
 * Size variants (matches existing component precedent).
 */
export type InoTreeTableSize = 'sm' | 'default' | 'lg';

/**
 * Density modes (doc 26 §2 requirement: dense/fluid row heights).
 */
export type InoTreeTableDensity = 'dense' | 'fluid';
