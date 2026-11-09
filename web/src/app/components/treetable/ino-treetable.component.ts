/**
 * TreeTable component - hierarchical data grid with tree expansion
 *
 * Issue: INO-452 (INO-31 Phase B3)
 * Spec: web/src/app/components/treetable/SPEC.md
 *
 * Implements WAI-ARIA treegrid pattern (role=treegrid) - the hardest a11y case
 * in the design system, combining role=grid's 2D navigation with role=tree's
 * expand/collapse semantics.
 */

import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostBinding,
  HostListener,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import {
  InoTreeTableRow,
  InoTreeTableFlattenedRow,
  InoTreeTableColumn,
  InoTreeTableSortEvent,
  InoTreeTableLoadChildrenEvent,
  InoTreeTableCellActivateEvent,
  InoTreeTableActiveCell,
  InoTreeTableSortDirection,
  InoTreeTableSize,
  InoTreeTableDensity,
} from './ino-treetable.types';

@Component({
  selector: 'ino-treetable',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-treetable.component.html',
  styleUrl: './ino-treetable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InoTreeTableComponent implements OnInit, OnChanges, AfterViewInit {
  // ========== INPUTS ==========

  /**
   * Tree-structured data rows.
   */
  @Input() data: InoTreeTableRow[] = [];

  /**
   * Column definitions. First column is the tree column by default.
   */
  @Input() columns: InoTreeTableColumn[] = [];

  /**
   * Table caption (accessible name). Required for a11y.
   */
  @Input() caption = '';

  /**
   * Size variant: sm/default/lg.
   * Controls header control sizes (sort buttons, resize handles).
   */
  @Input() size: InoTreeTableSize = 'default';

  /**
   * Density mode: dense/fluid.
   * Controls row height (--ino-row-min-height).
   */
  @Input() density: InoTreeTableDensity = 'fluid';

  /**
   * Disabled state. Prevents all interaction.
   */
  @Input() disabled = false;

  /**
   * Readonly state. Controls visible but interaction is blocked.
   */
  @Input() readonly = false;

  /**
   * Invalid state. Renders danger-colored border.
   */
  @Input() invalid = false;

  /**
   * Component-level loading state. Renders skeleton rows.
   */
  @Input() loading = false;

  /**
   * Empty message when data is [].
   */
  @Input() emptyMessage = 'No data available';

  /**
   * Skeleton row count (when loading).
   */
  @Input() skeletonRowCount = 5;

  /**
   * Whether columns are resizable. Default: true.
   */
  @Input() resizableColumns = true;

  /**
   * Whether columns are reorderable. Default: false (harder than resize, defer to v2).
   */
  @Input() reorderableColumns = false;

  /**
   * Initial expanded row values (Set<string> of row.value).
   * Controlled externally for full control, or leave undefined for internal state.
   */
  @Input() expandedRowValues?: Set<string>;

  /**
   * Initial sort column index.
   */
  @Input() sortColumn?: number;

  /**
   * Initial sort direction.
   */
  @Input() sortDirection: InoTreeTableSortDirection = null;

  /**
   * Whether to remember last focused cell on blur/refocus.
   */
  @Input() rememberFocus = true;

  // ========== OUTPUTS ==========

  /**
   * Emitted when a sortable column header is clicked.
   */
  @Output() sort = new EventEmitter<InoTreeTableSortEvent>();

  /**
   * Emitted when a lazy-loadable branch (children: undefined) is expanded.
   */
  @Output() loadChildren = new EventEmitter<InoTreeTableLoadChildrenEvent>();

  /**
   * Emitted when a cell is activated (click or Enter/Space).
   */
  @Output() cellActivate = new EventEmitter<InoTreeTableCellActivateEvent>();

  /**
   * Emitted when expandedRowValues changes (for two-way binding).
   */
  @Output() expandedRowValuesChange = new EventEmitter<Set<string>>();

  // ========== VIEW QUERIES ==========

  /**
   * All gridcell elements for keyboard navigation focus management.
   */
  @ViewChildren('gridcell', { read: ElementRef })
  gridCells!: QueryList<ElementRef<HTMLElement>>;

  // ========== INTERNAL STATE ==========

  /**
   * Flattened list of currently visible rows (only expanded rows appear).
   * Recomputed on data change or expand/collapse.
   */
  visibleRows: InoTreeTableFlattenedRow[] = [];

  /**
   * Internal expanded-row tracking (when expandedRowValues input is uncontrolled).
   */
  private _internalExpandedRows = new Set<string>();

  /**
   * Active cell position for roving tabindex (treegrid a11y requirement).
   */
  activeCell: InoTreeTableActiveCell | null = null;

  /**
   * Current sort state (when uncontrolled).
   */
  private _internalSortColumn?: number;
  private _internalSortDirection: InoTreeTableSortDirection = null;

  // ========== HOST BINDINGS ==========

  @HostBinding('attr.role') role = 'treegrid';

  @HostBinding('attr.aria-label')
  get ariaLabel(): string | null {
    return this.caption || null;
  }

  @HostBinding('attr.aria-busy')
  get ariaBusy(): boolean | null {
    return this.loading ? true : null;
  }

  @HostBinding('attr.data-disabled')
  get dataDisabled(): boolean | null {
    return this.disabled ? true : null;
  }

  @HostBinding('attr.data-readonly')
  get dataReadonly(): boolean | null {
    return this.readonly ? true : null;
  }

  @HostBinding('attr.data-invalid')
  get dataInvalid(): boolean | null {
    return this.invalid ? true : null;
  }

  @HostBinding('attr.data-loading')
  get dataLoading(): boolean | null {
    return this.loading ? true : null;
  }

  @HostBinding('attr.data-size')
  get dataSize(): string {
    return this.size;
  }

  @HostBinding('attr.data-density')
  get dataDensity(): string {
    return this.density;
  }

  // ========== GETTERS ==========

  /**
   * Whether the component is interactive (not disabled/readonly/loading).
   */
  get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  /**
   * Controlled or internal expanded row set.
   */
  get expandedRows(): Set<string> {
    return this.expandedRowValues ?? this._internalExpandedRows;
  }

  /**
   * Controlled or internal sort column.
   */
  get currentSortColumn(): number | undefined {
    return this.sortColumn ?? this._internalSortColumn;
  }

  /**
   * Controlled or internal sort direction.
   */
  get currentSortDirection(): InoTreeTableSortDirection {
    return this.sortDirection ?? this._internalSortDirection;
  }

  // ========== CONSTRUCTOR ==========

  constructor(private cdr: ChangeDetectorRef) {}

  // ========== LIFECYCLE ==========

  ngOnInit(): void {
    this.recomputeRows();
    this.initializeActiveCell();
  }

  ngAfterViewInit(): void {
    // Focus the initial active cell after view is ready
    if (this.activeCell) {
      this.focusActiveCell();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['expandedRowValues'] || changes['sortColumn'] || changes['sortDirection']) {
      this.recomputeRows();
    }

    if (changes['data'] && !changes['data'].firstChange) {
      // Data changed after init, restore focus if remembered
      if (this.rememberFocus && this.activeCell) {
        this.restoreFocus();
      }
    }
  }

  // ========== TREE FLATTENING (SPEC §4) ==========

  /**
   * Recomputes visibleRows from tree-structured data.
   * Only includes rows whose ancestors are all expanded.
   *
   * Algorithm: depth-first traversal, emitting each row only if all ancestors
   * are in expandedRows. Annotates each emitted row with level, expanded state,
   * and parentValues for keyboard navigation.
   */
  private recomputeRows(): void {
    const flattened: InoTreeTableFlattenedRow[] = [];
    const expandedSet = this.expandedRows;

    const flattenRecursive = (
      rows: InoTreeTableRow[],
      level: number,
      parentValues: string[]
    ): void => {
      for (const row of rows) {
        const isExpanded = expandedSet.has(row.value);
        const isBranch = row.children !== undefined && row.children.length > 0;

        // Emit this row
        const flatRow: InoTreeTableFlattenedRow = {
          ...row,
          level,
          expanded: isBranch ? isExpanded : undefined,
          parentValues,
          flatIndex: flattened.length,
        };
        flattened.push(flatRow);

        // Recurse into children if expanded
        if (isExpanded && row.children) {
          flattenRecursive(
            row.children,
            level + 1,
            [...parentValues, row.value]
          );
        }
      }
    };

    flattenRecursive(this.data, 0, []);

    // Apply sorting if active
    if (this.currentSortColumn !== undefined && this.currentSortDirection) {
      this.applySortToFlattenedRows(flattened);
    }

    this.visibleRows = flattened;
  }

  /**
   * Sorts visibleRows in place, respecting tree structure.
   * Siblings at the same level are sorted; parent-child relationships preserved.
   */
  private applySortToFlattenedRows(rows: InoTreeTableFlattenedRow[]): void {
    const sortColIndex = this.currentSortColumn;
    const sortDir = this.currentSortDirection;

    if (sortColIndex === undefined || !sortDir || !this.columns[sortColIndex]) {
      return;
    }

    const column = this.columns[sortColIndex];
    const field = column.field;
    const direction = sortDir === 'asc' ? 1 : -1;

    // Group rows by level and parent, then sort each group
    const grouped = new Map<string, InoTreeTableFlattenedRow[]>();

    for (const row of rows) {
      const key = `${row.level}:${row.parentValues.join('/')}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    }

    // Sort each group
    for (const group of grouped.values()) {
      group.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * direction;
        }

        return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * direction;
      });
    }

    // Rebuild rows array in sorted order (depth-first)
    const rebuilt: InoTreeTableFlattenedRow[] = [];
    const rebuild = (parentKey: string, level: number) => {
      const key = `${level}:${parentKey}`;
      const group = grouped.get(key);
      if (!group) return;

      for (const row of group) {
        rebuilt.push(row);
        if (row.children && row.expanded) {
          rebuild(
            row.parentValues.concat(row.value).join('/'),
            level + 1
          );
        }
      }
    };

    rebuild('', 0);

    // Re-index
    rebuilt.forEach((row, idx) => {
      row.flatIndex = idx;
    });

    rows.length = 0;
    rows.push(...rebuilt);
  }

  // ========== EXPAND/COLLAPSE (SPEC §4) ==========

  /**
   * Toggles a row's expanded state.
   */
  toggleExpand(row: InoTreeTableRow): void {
    if (!this.interactive) return;

    const isBranch = row.children !== undefined;
    if (!isBranch) return; // Leaves can't expand

    const expanded = this.expandedRows;
    const isExpanded = expanded.has(row.value);

    if (isExpanded) {
      expanded.delete(row.value);
    } else {
      expanded.add(row.value);

      // Emit loadChildren if lazy-loadable (children: undefined)
      if (row.children === undefined) {
        this.loadChildren.emit({ row, value: row.value });
      }
    }

    // Emit change for two-way binding
    if (!this.expandedRowValues) {
      // Internal state, emit for awareness
      this.expandedRowValuesChange.emit(new Set(expanded));
    }

    this.recomputeRows();
    this.restoreFocus();
  }

  // ========== KEYBOARD NAVIGATION (SPEC §3) ==========

  /**
   * Initializes activeCell to first cell on mount.
   */
  private initializeActiveCell(): void {
    if (this.visibleRows.length > 0 && this.columns.length > 0) {
      this.activeCell = { rowIndex: 0, columnIndex: 0 };
    }
  }

  /**
   * Restores focus to activeCell after row mutations (expand/collapse/sort).
   * Clamps to valid bounds if activeCell is out of range.
   */
  private restoreFocus(): void {
    if (!this.activeCell) return;

    const { rowIndex, columnIndex } = this.activeCell;
    const clampedRow = Math.min(rowIndex, this.visibleRows.length - 1);
    const clampedCol = Math.min(columnIndex, this.columns.length - 1);

    this.activeCell = { rowIndex: clampedRow, columnIndex: clampedCol };

    this.updateTabindices();
    this.focusActiveCell();
  }

  /**
   * Updates tabindex attributes: activeCell gets 0, all others get -1.
   * Called after every navigation.
   *
   * Note: No implementation needed - template reactively binds [tabindex]
   * via getCellTabindex(), which automatically updates when activeCell changes.
   */
  private updateTabindices(): void {
    // No-op: Angular change detection handles tabindex updates via getCellTabindex()
  }

  /**
   * Host keydown handler for treegrid keyboard navigation.
   */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.interactive || !this.activeCell) return;

    const handled = this.handleArrowKeys(event) ||
                    this.handleHomeEnd(event) ||
                    this.handlePageUpDown(event) ||
                    this.handleEnterSpace(event);

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handles arrow key navigation (SPEC §3 full treegrid keyboard map).
   */
  private handleArrowKeys(event: KeyboardEvent): boolean {
    const { rowIndex, columnIndex } = this.activeCell!;
    const isTreeColumn = columnIndex === 0;
    const currentRow = this.visibleRows[rowIndex];

    switch (event.key) {
      case 'ArrowDown':
        this.moveVertical(1);
        return true;

      case 'ArrowUp':
        this.moveVertical(-1);
        return true;

      case 'ArrowRight':
        if (isTreeColumn) {
          // Tree column: expand if collapsed branch, else move right
          const isBranch = currentRow.expanded !== undefined;
          if (isBranch && !currentRow.expanded) {
            this.toggleExpand(currentRow);
          } else if (this.columns.length > 1) {
            this.moveHorizontal(1);
          }
        } else {
          this.moveHorizontal(1);
        }
        return true;

      case 'ArrowLeft':
        if (isTreeColumn) {
          // Tree column: collapse if expanded branch, else move to parent
          const isBranch = currentRow.expanded !== undefined;
          if (isBranch && currentRow.expanded) {
            this.toggleExpand(currentRow);
          } else {
            this.moveToParent(currentRow);
          }
        } else {
          this.moveHorizontal(-1);
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Moves focus vertically (ArrowDown/Up).
   */
  private moveVertical(delta: number): void {
    if (!this.activeCell) return;

    const newRow = this.activeCell.rowIndex + delta;
    if (newRow >= 0 && newRow < this.visibleRows.length) {
      this.activeCell = { ...this.activeCell, rowIndex: newRow };
      this.updateTabindices();
      this.focusActiveCell();
    }
  }

  /**
   * Moves focus horizontally (ArrowRight/Left in non-tree columns).
   */
  private moveHorizontal(delta: number): void {
    if (!this.activeCell) return;

    let newCol = this.activeCell.columnIndex + delta;

    // Wrap to next/previous row at edges (APG guidance)
    if (newCol < 0) {
      if (this.activeCell.rowIndex > 0) {
        this.activeCell = {
          rowIndex: this.activeCell.rowIndex - 1,
          columnIndex: this.columns.length - 1,
        };
      }
      return;
    }

    if (newCol >= this.columns.length) {
      if (this.activeCell.rowIndex < this.visibleRows.length - 1) {
        this.activeCell = {
          rowIndex: this.activeCell.rowIndex + 1,
          columnIndex: 0,
        };
      }
      return;
    }

    this.activeCell = { ...this.activeCell, columnIndex: newCol };
    this.updateTabindices();
    this.focusActiveCell();
  }

  /**
   * Moves focus to parent row (ArrowLeft in tree column on collapsed/leaf).
   */
  private moveToParent(currentRow: InoTreeTableFlattenedRow): void {
    if (currentRow.parentValues.length === 0) return; // Already at root

    const parentValue = currentRow.parentValues[currentRow.parentValues.length - 1];
    const parentIndex = this.visibleRows.findIndex(r => r.value === parentValue);

    if (parentIndex >= 0) {
      this.activeCell = { rowIndex: parentIndex, columnIndex: 0 };
      this.updateTabindices();
      this.focusActiveCell();
    }
  }

  /**
   * Handles Home/End keys (jump to first/last column in current row).
   */
  private handleHomeEnd(event: KeyboardEvent): boolean {
    if (!this.activeCell) return false;

    if (event.key === 'Home') {
      if (event.ctrlKey) {
        // Ctrl+Home: first cell of entire grid
        this.activeCell = { rowIndex: 0, columnIndex: 0 };
      } else {
        // Home: first column of current row
        this.activeCell = { ...this.activeCell, columnIndex: 0 };
      }
      this.updateTabindices();
      this.focusActiveCell();
      return true;
    }

    if (event.key === 'End') {
      if (event.ctrlKey) {
        // Ctrl+End: last cell of entire grid
        this.activeCell = {
          rowIndex: this.visibleRows.length - 1,
          columnIndex: this.columns.length - 1,
        };
      } else {
        // End: last column of current row
        this.activeCell = { ...this.activeCell, columnIndex: this.columns.length - 1 };
      }
      this.updateTabindices();
      this.focusActiveCell();
      return true;
    }

    return false;
  }

  /**
   * Handles PageUp/PageDown (jump N rows, where N = visible row count).
   */
  private handlePageUpDown(event: KeyboardEvent): boolean {
    if (!this.activeCell) return false;

    // TODO: Compute actual visible row count from viewport height
    const pageSize = 10; // Placeholder

    if (event.key === 'PageDown') {
      this.moveVertical(pageSize);
      return true;
    }

    if (event.key === 'PageUp') {
      this.moveVertical(-pageSize);
      return true;
    }

    return false;
  }

  /**
   * Handles Enter/Space (cell activation - no default action for display-only grid).
   */
  private handleEnterSpace(event: KeyboardEvent): boolean {
    if (event.key !== 'Enter' && event.key !== ' ') return false;
    if (!this.activeCell) return false;

    const row = this.visibleRows[this.activeCell.rowIndex];
    const column = this.columns[this.activeCell.columnIndex];

    this.cellActivate.emit({
      row,
      column,
      rowIndex: this.activeCell.rowIndex,
      columnIndex: this.activeCell.columnIndex,
      originalEvent: event,
    });

    return true;
  }

  /**
   * Focuses the DOM element corresponding to activeCell.
   * Uses ViewChildren to find the cell matching activeCell coordinates.
   */
  private focusActiveCell(): void {
    if (!this.activeCell || !this.gridCells) return;

    const { rowIndex, columnIndex } = this.activeCell;

    // Mark for change detection to update tabindex bindings
    this.cdr.markForCheck();

    // Use requestAnimationFrame to ensure DOM is updated after expand/collapse
    requestAnimationFrame(() => {
      // Find the cell element with matching data attributes
      const cellElement = this.gridCells.find((el) => {
        const elem = el.nativeElement;
        return (
          elem.getAttribute('data-row-index') === String(rowIndex) &&
          elem.getAttribute('data-col-index') === String(columnIndex)
        );
      });

      if (cellElement) {
        cellElement.nativeElement.focus();
      }
    });
  }

  // ========== SORTING (SPEC §5) ==========

  /**
   * Handles sort header click.
   */
  onSortClick(columnIndex: number): void {
    if (!this.interactive) return;

    const column = this.columns[columnIndex];
    if (!column.sortable) return;

    const isCurrentSort = this.currentSortColumn === columnIndex;
    let newDirection: InoTreeTableSortDirection;

    if (!isCurrentSort) {
      // New column, start with asc
      newDirection = 'asc';
    } else {
      // Same column, cycle asc → desc → null
      if (this.currentSortDirection === 'asc') {
        newDirection = 'desc';
      } else if (this.currentSortDirection === 'desc') {
        newDirection = null;
      } else {
        newDirection = 'asc';
      }
    }

    // Update internal or emit for controlled
    if (this.sortColumn === undefined) {
      this._internalSortColumn = newDirection ? columnIndex : undefined;
      this._internalSortDirection = newDirection;
    }

    this.sort.emit({ column, direction: newDirection, columnIndex });
    this.recomputeRows();
  }

  // ========== UTILITIES ==========

  /**
   * Gets aria-level for a row (1-indexed per APG).
   */
  getAriaLevel(row: InoTreeTableFlattenedRow): number {
    return row.level + 1;
  }

  /**
   * Gets aria-expanded for a row (only branches have this attribute).
   */
  getAriaExpanded(row: InoTreeTableFlattenedRow): boolean | null {
    return row.expanded !== undefined ? row.expanded : null;
  }

  /**
   * Gets cell value for a given row and column field.
   */
  getCellValue(row: InoTreeTableRow, field: string): any {
    // Support dot notation for nested properties
    const parts = field.split('.');
    let value: any = row;
    for (const part of parts) {
      value = value?.[part];
    }
    return value ?? '';
  }

  /**
   * Gets tabindex for a cell (0 if active, -1 otherwise).
   */
  getCellTabindex(rowIndex: number, columnIndex: number): number {
    if (!this.activeCell) return -1;
    return this.activeCell.rowIndex === rowIndex &&
           this.activeCell.columnIndex === columnIndex
      ? 0
      : -1;
  }
}
