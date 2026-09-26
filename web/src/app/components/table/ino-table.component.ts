import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';

import { InoControlSize } from '../control-size';
import { InoPaginatorComponent, InoPaginatorPageEvent } from '../paginator/ino-paginator.component';
import {
  InoTableCellDirective,
  InoTableEmptyDirective,
  InoTableRowDetailDirective,
} from './ino-table.templates';
import {
  InoTableCellEditEvent,
  InoTableColumn,
  InoTableColumnReorderEvent,
  InoTableColumnResizeEvent,
  InoTableFilterPredicate,
  InoTableRowExpandEvent,
  InoTableSelectionMode,
  InoTableSortDirection,
  InoTableSortEvent,
  inoTableDefaultFilterPredicate,
} from './ino-table.types';

let idCounter = 0;

type NavColumn<T> =
  | { kind: 'select' }
  | { kind: 'expand' }
  | { kind: 'data'; column: InoTableColumn<T> };

type DisplayRow<T> =
  | { kind: 'group'; key: unknown; label: string; count: number }
  | { kind: 'row'; row: T; dataIndex: number };

/**
 * `<ino-table>` — dense tabular data grid (INO-155, INO-31 T-1, Tier 1 / Data group).
 *
 * `--ino-row-min-height` (tokens.css §10) has existed since day one with zero consumers before
 * this component — see `SPEC.md` §4 for why a row-based component is exactly where that token was
 * always meant to land.
 *
 * Parity benchmark: PrimeNG 22.1.1 `Table` (`specs/primeng/llms-22.1.1.txt` line ~115,
 * `https://primeng.dev/table`). PrimeNG is a benchmark, not a runtime dependency — nothing here
 * installs it. `FilterService` is explicitly out of scope for this issue (H-2, later wave); the
 * `filterPredicate` input is a self-contained placeholder shaped so that integration is not an API
 * break — see `SPEC.md` §7.
 *
 * Composes rather than reinvents: `<ino-paginator>` for paging (`paginator` input), and reuses the
 * Wave 0 focus-ring / control-size / row-min-height tokens for every state and size. Full decisions
 * record: `SPEC.md` in this directory.
 *
 * Always `role="grid"` (never plain `role="table"`) — see `SPEC.md` §8 for why a single role model
 * was chosen over switching between the two based on column config.
 */
@Component({
  selector: 'ino-table',
  standalone: true,
  imports: [CommonModule, FormsModule, InoPaginatorComponent],
  templateUrl: './ino-table.component.html',
  styleUrl: './ino-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-table-host',
    '[attr.data-size]': 'size',
    '[attr.data-disabled]': 'disabled || null',
    '[attr.data-readonly]': 'readonly || null',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.data-loading]': 'loading || null',
  },
})
export class InoTableComponent<T = Record<string, unknown>> implements OnChanges {
  // ---------------------------------------------------------------------------------------------
  // Data + columns
  // ---------------------------------------------------------------------------------------------

  @Input() columns: InoTableColumn<T>[] = [];
  @Input() data: readonly T[] = [];
  @Input() rowKey: (row: T, index: number) => unknown = (_row, index) => index;

  // ---------------------------------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------------------------------

  @Input() size: InoControlSize = 'default';
  @Input() ariaLabel = 'Data table';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: numberAttribute }) skeletonRowCount = 5;
  @Input() emptyMessage = 'No records found.';

  // ---------------------------------------------------------------------------------------------
  // Selection (DoD row 6 — single / multi / checkbox)
  // ---------------------------------------------------------------------------------------------

  @Input() selectionMode: InoTableSelectionMode = 'none';
  @Input() selection: T[] = [];
  @Output() selectionChange = new EventEmitter<T[]>();

  // ---------------------------------------------------------------------------------------------
  // Row expansion
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) expandableRows = false;
  @Input() expandedRowKeys: ReadonlySet<unknown> = new Set();
  @Output() expandedRowKeysChange = new EventEmitter<ReadonlySet<unknown>>();
  @Output() rowExpand = new EventEmitter<InoTableRowExpandEvent<T>>();

  // ---------------------------------------------------------------------------------------------
  // Sort (single-column baseline — DoD row 6 notes multi-sort as a nice-to-have, see SPEC.md §5)
  // ---------------------------------------------------------------------------------------------

  @Input() sortColumn: string | null = null;
  @Input() sortDirection: InoTableSortDirection = null;
  @Output() sortColumnChange = new EventEmitter<string | null>();
  @Output() sortDirectionChange = new EventEmitter<InoTableSortDirection>();
  @Output() sortChange = new EventEmitter<InoTableSortEvent>();

  // ---------------------------------------------------------------------------------------------
  // Filter — local placeholder mechanism, see ino-table.types.ts
  // ---------------------------------------------------------------------------------------------

  @Input() filters: Record<string, unknown> = {};
  @Output() filtersChange = new EventEmitter<Record<string, unknown>>();
  @Input() filterPredicate: InoTableFilterPredicate<T> = inoTableDefaultFilterPredicate;

  // ---------------------------------------------------------------------------------------------
  // Grouping
  // ---------------------------------------------------------------------------------------------

  @Input() groupBy: string | null = null;
  @Input() collapsedGroupKeys: ReadonlySet<unknown> = new Set();
  @Output() collapsedGroupKeysChange = new EventEmitter<ReadonlySet<unknown>>();

  // ---------------------------------------------------------------------------------------------
  // Column resize / reorder / frozen
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) resizableColumns = true;
  @Input({ transform: booleanAttribute }) reorderableColumns = true;
  @Output() columnResize = new EventEmitter<InoTableColumnResizeEvent>();
  @Output() columnReorder = new EventEmitter<InoTableColumnReorderEvent>();

  // ---------------------------------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------------------------------

  @Output() cellEditComplete = new EventEmitter<InoTableCellEditEvent<T>>();
  @Output() cellEditCancel = new EventEmitter<InoTableCellEditEvent<T>>();

  // ---------------------------------------------------------------------------------------------
  // Paging — composes <ino-paginator>, does not reinvent it
  // ---------------------------------------------------------------------------------------------

  @Input({ transform: booleanAttribute }) paginator = false;
  @Input({ transform: numberAttribute }) rowsPerPage = 10;
  @Input() rowsPerPageOptions: number[] = [];
  @Input({ transform: numberAttribute }) first = 0;
  @Output() firstChange = new EventEmitter<number>();
  @Output() page = new EventEmitter<InoPaginatorPageEvent>();

  /** `lazy` hands sort/filter/paging state to the consumer entirely — `data` is assumed to already
   *  be the current page's sorted/filtered slice, matching `<ino-paginator>`'s controlled-component
   *  convention (see that component's own doc comment). `totalRecords` then drives the paginator. */
  @Input({ transform: booleanAttribute }) lazy = false;
  @Input({ transform: numberAttribute }) totalRecords = 0;

  // ---------------------------------------------------------------------------------------------
  // Content projection
  // ---------------------------------------------------------------------------------------------

  @ContentChildren(InoTableCellDirective) private cellTemplates?: QueryList<InoTableCellDirective>;
  @ContentChild(InoTableRowDetailDirective) rowDetailDef?: InoTableRowDetailDirective;
  @ContentChild(InoTableEmptyDirective) emptyDef?: InoTableEmptyDirective;

  // ---------------------------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------------------------

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly instanceId = ++idCounter;
  protected columnOrder: string[] = [];
  protected columnWidths: Record<string, string> = {};
  protected draggingColumnId: string | null = null;
  protected editing: { key: unknown; columnId: string } | null = null;
  protected editDraft = '';
  protected activeRow = 0;
  protected activeCol = 0;

  private columnMap = new Map<string, InoTableColumn<T>>();
  private resizeState: { columnId: string; startX: number; startWidth: number } | null = null;
  private readonly onResizeMove = (event: PointerEvent) => this.handleResizeMove(event);
  private readonly onResizeUp = () => this.handleResizeUp();

  // ---------------------------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------------------------

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.columnMap = new Map(this.columns.map((c) => [c.id, c]));
      this.syncColumnOrder();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Derived column state
  // ---------------------------------------------------------------------------------------------

  protected get orderedColumns(): InoTableColumn<T>[] {
    const seen = new Set<string>();
    const ordered: InoTableColumn<T>[] = [];
    for (const id of this.columnOrder) {
      const col = this.columnMap.get(id);
      if (col && !seen.has(id)) {
        ordered.push(col);
        seen.add(id);
      }
    }
    return ordered;
  }

  protected get navColumns(): NavColumn<T>[] {
    const cols: NavColumn<T>[] = [];
    if (this.selectionMode !== 'none') cols.push({ kind: 'select' });
    if (this.expandableRows) cols.push({ kind: 'expand' });
    for (const column of this.orderedColumns) cols.push({ kind: 'data', column });
    return cols;
  }

  protected get selectColIndex(): number {
    return 0;
  }

  protected get expandColIndex(): number {
    return this.selectionMode !== 'none' ? 1 : 0;
  }

  protected navIndexOf(column: InoTableColumn<T>): number {
    return this.navColumns.findIndex((n) => n.kind === 'data' && n.column.id === column.id);
  }

  protected get hasFilterableColumns(): boolean {
    return this.orderedColumns.some((c) => c.filterable);
  }

  protected get hasFrozenColumns(): boolean {
    return this.orderedColumns.some((c) => !!c.frozen);
  }

  protected columnWidth(column: InoTableColumn<T>): string | null {
    return this.columnWidths[column.id] ?? column.width ?? null;
  }

  /**
   * Sticky offset for a frozen column — sum of the resolved widths of every OTHER column frozen
   * to the same edge that sits closer to that edge. Falls back to a nominal 120px per column when
   * a width has not been resolved yet (before first paint / no explicit width and no resize yet),
   * which only affects the very first frame.
   */
  protected frozenOffset(column: InoTableColumn<T>): number {
    if (!column.frozen) return 0;
    const side = column.frozen;
    const columns = this.orderedColumns.filter((c) => c.frozen === side);
    const index = columns.indexOf(column);
    let offset = 0;
    const ordered = side === 'start' ? columns.slice(0, index) : columns.slice(index + 1).reverse();
    for (const c of ordered) {
      offset += this.resolvedWidthPx(c);
    }
    // Selection/expand columns sit before the first frozen-start column in DOM order — fold their
    // nominal width into the offset so a frozen-start data column doesn't slide under them.
    if (side === 'start' && index === 0) {
      if (this.selectionMode !== 'none') offset += this.controlHeightPx();
      if (this.expandableRows) offset += this.controlHeightPx();
    }
    return offset;
  }

  private resolvedWidthPx(column: InoTableColumn<T>): number {
    const raw = this.columnWidth(column);
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 120;
  }

  private controlHeightPx(): number {
    const value = getComputedStyle(this.host.nativeElement).getPropertyValue('--ino-control-height');
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 44;
  }

  private syncColumnOrder(): void {
    const ids = this.columns.map((c) => c.id);
    const idSet = new Set(ids);
    const stillValid = this.columnOrder.filter((id) => idSet.has(id));
    const missing = ids.filter((id) => !stillValid.includes(id));
    this.columnOrder = stillValid.length ? [...stillValid, ...missing] : ids;
  }

  // ---------------------------------------------------------------------------------------------
  // Cell templates
  // ---------------------------------------------------------------------------------------------

  protected cellTemplateFor(columnId: string): InoTableCellDirective | undefined {
    return this.cellTemplates?.find((t) => t.columnId === columnId);
  }

  protected getCellValue(row: T, column: InoTableColumn<T>): unknown {
    return column.field ? (row as Record<string, unknown>)[column.field] : undefined;
  }

  // ---------------------------------------------------------------------------------------------
  // Interactivity gate — same idiom as ino-paginator/ino-virtual-scroller
  // ---------------------------------------------------------------------------------------------

  protected get interactive(): boolean {
    return !this.disabled && !this.readonly && !this.loading;
  }

  // ---------------------------------------------------------------------------------------------
  // Sort
  // ---------------------------------------------------------------------------------------------

  protected columnSortState(column: InoTableColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn !== column.id || !this.sortDirection) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(column: InoTableColumn<T>): void {
    if (!this.interactive || !column.sortable) return;
    let direction: InoTableSortDirection = 'asc';
    let columnId: string | null = column.id;
    if (this.sortColumn === column.id) {
      direction = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
      if (!direction) columnId = null;
    }
    this.sortColumn = columnId;
    this.sortDirection = columnId ? direction : null;
    this.sortColumnChange.emit(this.sortColumn);
    this.sortDirectionChange.emit(this.sortDirection);
    this.sortChange.emit({ columnId: this.sortColumn, direction: this.sortDirection });
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------------------------

  protected setFilter(column: InoTableColumn<T>, value: unknown): void {
    if (!this.interactive) return;
    this.filters = { ...this.filters, [column.id]: value };
    this.filtersChange.emit(this.filters);
    this.cdr.markForCheck();
  }

  protected onFilterInput(column: InoTableColumn<T>, event: Event): void {
    this.setFilter(column, (event.target as HTMLInputElement).value);
  }

  // ---------------------------------------------------------------------------------------------
  // Row pipeline: filter -> sort -> group -> page
  // ---------------------------------------------------------------------------------------------

  private get filteredRows(): T[] {
    if (this.lazy) return [...this.data];
    const active = this.orderedColumns.filter((c) => c.filterable && this.hasFilterValue(c.id));
    if (!active.length) return [...this.data];
    return this.data.filter((row) => active.every((c) => this.filterPredicate(row, c, this.filters[c.id])));
  }

  private hasFilterValue(columnId: string): boolean {
    const value = this.filters[columnId];
    return value !== undefined && value !== null && value !== '';
  }

  private get sortedRows(): T[] {
    const rows = this.filteredRows;
    if (this.lazy || !this.sortColumn || !this.sortDirection) return rows;
    const column = this.columnMap.get(this.sortColumn);
    if (!column) return rows;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = this.getCellValue(a, column);
      const bv = this.getCellValue(b, column);
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  /** `groupBy` and `paginator` are mutually exclusive in v1 — see SPEC.md §5. */
  protected get isGrouped(): boolean {
    return !!this.groupBy && !this.paginator;
  }

  protected get displayRows(): DisplayRow<T>[] {
    const sorted = this.sortedRows;

    if (this.isGrouped) {
      const groupField = this.groupBy as string;
      const groups = new Map<unknown, T[]>();
      for (const row of sorted) {
        const key = (row as Record<string, unknown>)[groupField];
        const bucket = groups.get(key);
        if (bucket) bucket.push(row);
        else groups.set(key, [row]);
      }
      const out: DisplayRow<T>[] = [];
      let index = 0;
      for (const [key, rows] of groups) {
        out.push({ kind: 'group', key, label: String(key), count: rows.length });
        if (!this.collapsedGroupKeys.has(key)) {
          for (const row of rows) {
            out.push({ kind: 'row', row, dataIndex: index++ });
          }
        } else {
          index += rows.length;
        }
      }
      return out;
    }

    const windowed =
      this.paginator && !this.lazy ? sorted.slice(this.first, this.first + this.rowsPerPage) : sorted;
    return windowed.map((row, i) => ({ kind: 'row', row, dataIndex: (this.paginator && !this.lazy ? this.first : 0) + i }));
  }

  protected get totalRowsForPaginator(): number {
    return this.lazy ? this.totalRecords : this.sortedRows.length;
  }

  protected get isEmpty(): boolean {
    return !this.loading && this.displayRows.length === 0;
  }

  protected trackDisplayRow = (_index: number, item: DisplayRow<T>): unknown =>
    item.kind === 'group' ? `group:${String(item.key)}` : `row:${String(this.rowKey(item.row, item.dataIndex))}`;

  // ---------------------------------------------------------------------------------------------
  // Grouping — collapse/expand
  // ---------------------------------------------------------------------------------------------

  protected toggleGroup(key: unknown): void {
    if (!this.interactive) return;
    const next = new Set(this.collapsedGroupKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.collapsedGroupKeys = next;
    this.collapsedGroupKeysChange.emit(next);
    this.cdr.markForCheck();
  }

  protected isGroupCollapsed(key: unknown): boolean {
    return this.collapsedGroupKeys.has(key);
  }

  // ---------------------------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------------------------

  protected onPageChange(event: InoPaginatorPageEvent): void {
    this.first = event.first;
    this.rowsPerPage = event.rows;
    this.firstChange.emit(this.first);
    this.page.emit(event);
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------------------------

  private lastSelectedIndex: number | null = null;

  protected isSelected(row: T, dataIndex: number): boolean {
    const key = this.rowKey(row, dataIndex);
    return this.selection.some((r, i) => this.rowKey(r, i) === key);
  }

  protected get allVisibleSelected(): boolean {
    const rows = this.displayRows.filter((d): d is DisplayRow<T> & { kind: 'row' } => d.kind === 'row');
    return rows.length > 0 && rows.every((d) => this.isSelected(d.row, d.dataIndex));
  }

  protected get someVisibleSelected(): boolean {
    const rows = this.displayRows.filter((d): d is DisplayRow<T> & { kind: 'row' } => d.kind === 'row');
    return rows.some((d) => this.isSelected(d.row, d.dataIndex)) && !this.allVisibleSelected;
  }

  protected toggleRowSelection(row: T, dataIndex: number, event?: MouseEvent | KeyboardEvent): void {
    if (!this.interactive || this.selectionMode === 'none') return;
    const key = this.rowKey(row, dataIndex);
    const isSelected = this.isSelected(row, dataIndex);

    if (this.selectionMode === 'single') {
      this.selection = isSelected ? [] : [row];
    } else {
      const shiftKey = event && 'shiftKey' in event ? event.shiftKey : false;
      const toggleKey = event && 'ctrlKey' in event ? event.ctrlKey || event.metaKey : false;
      if (shiftKey && this.lastSelectedIndex !== null) {
        const rows = this.displayRows.filter((d): d is DisplayRow<T> & { kind: 'row' } => d.kind === 'row');
        const from = Math.min(this.lastSelectedIndex, dataIndex);
        const to = Math.max(this.lastSelectedIndex, dataIndex);
        const range = rows.filter((d) => d.dataIndex >= from && d.dataIndex <= to).map((d) => d.row);
        const merged = [...this.selection];
        for (const r of range) if (!merged.some((m, i) => this.rowKey(m, i) === this.rowKey(r, dataIndex))) merged.push(r);
        this.selection = merged;
      } else if (toggleKey || this.selectionMode === 'checkbox') {
        this.selection = isSelected
          ? this.selection.filter((r, i) => this.rowKey(r, i) !== key)
          : [...this.selection, row];
      } else {
        this.selection = isSelected ? [] : [row];
      }
    }
    this.lastSelectedIndex = dataIndex;
    this.selectionChange.emit(this.selection);
    this.cdr.markForCheck();
  }

  protected toggleSelectAll(): void {
    if (!this.interactive || this.selectionMode !== 'checkbox') return;
    const rows = this.displayRows.filter((d): d is DisplayRow<T> & { kind: 'row' } => d.kind === 'row');
    this.selection = this.allVisibleSelected ? [] : rows.map((d) => d.row);
    this.selectionChange.emit(this.selection);
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Row expansion
  // ---------------------------------------------------------------------------------------------

  protected isExpanded(row: T, dataIndex: number): boolean {
    return this.expandedRowKeys.has(this.rowKey(row, dataIndex));
  }

  protected toggleExpand(row: T, dataIndex: number): void {
    if (!this.interactive || !this.expandableRows) return;
    const key = this.rowKey(row, dataIndex);
    const next = new Set(this.expandedRowKeys);
    const expanded = !next.has(key);
    if (expanded) next.add(key);
    else next.delete(key);
    this.expandedRowKeys = next;
    this.expandedRowKeysChange.emit(next);
    this.rowExpand.emit({ row, expanded });
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------------------------------

  protected isEditing(row: T, dataIndex: number, column: InoTableColumn<T>): boolean {
    return !!this.editing && this.editing.key === this.rowKey(row, dataIndex) && this.editing.columnId === column.id;
  }

  protected startEdit(row: T, dataIndex: number, column: InoTableColumn<T>): void {
    if (!this.interactive || !column.editable) return;
    const value = this.getCellValue(row, column);
    this.editing = { key: this.rowKey(row, dataIndex), columnId: column.id };
    this.editDraft = value == null ? '' : String(value);
    this.cdr.markForCheck();
  }

  protected commitEdit(row: T, column: InoTableColumn<T>): void {
    if (!this.editing) return;
    const oldValue = this.getCellValue(row, column);
    const newValue = this.editDraft;
    this.editing = null;
    if (String(oldValue ?? '') !== newValue) {
      this.cellEditComplete.emit({ row, column, oldValue, newValue });
    }
    this.cdr.markForCheck();
  }

  protected cancelEdit(row: T, column: InoTableColumn<T>): void {
    if (!this.editing) return;
    const oldValue = this.getCellValue(row, column);
    this.editing = null;
    this.cellEditCancel.emit({ row, column, oldValue, newValue: oldValue });
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------------------------
  // Column resize — pointer events, DoD row 6 scope note: no persistence beyond runtime state
  // ---------------------------------------------------------------------------------------------

  protected onResizePointerDown(event: PointerEvent, column: InoTableColumn<T>, headerEl: HTMLElement): void {
    if (!this.interactive || !this.resizableColumns || column.resizable === false) return;
    event.preventDefault();
    event.stopPropagation();
    this.resizeState = { columnId: column.id, startX: event.clientX, startWidth: headerEl.getBoundingClientRect().width };
    document.addEventListener('pointermove', this.onResizeMove);
    document.addEventListener('pointerup', this.onResizeUp, { once: true });
  }

  private handleResizeMove(event: PointerEvent): void {
    if (!this.resizeState) return;
    const { columnId, startX, startWidth } = this.resizeState;
    const column = this.columnMap.get(columnId);
    const min = column?.minWidth ? parseFloat(column.minWidth) : 56;
    const sign = this.isRtl ? -1 : 1;
    const delta = (event.clientX - startX) * sign;
    const width = Math.max(min, startWidth + delta);
    this.columnWidths = { ...this.columnWidths, [columnId]: `${width}px` };
    this.cdr.markForCheck();
  }

  private handleResizeUp(): void {
    document.removeEventListener('pointermove', this.onResizeMove);
    if (this.resizeState) {
      const width = parseFloat(this.columnWidths[this.resizeState.columnId] ?? '0');
      this.columnResize.emit({ columnId: this.resizeState.columnId, width });
    }
    this.resizeState = null;
  }

  private get isRtl(): boolean {
    return getComputedStyle(this.host.nativeElement).direction === 'rtl';
  }

  // ---------------------------------------------------------------------------------------------
  // Column reorder — drag-and-drop, with a keyboard-accessible equivalent (DoD row 8)
  // ---------------------------------------------------------------------------------------------

  protected onColumnDragStart(event: DragEvent, column: InoTableColumn<T>): void {
    if (!this.interactive || !this.reorderableColumns || column.reorderable === false) return;
    this.draggingColumnId = column.id;
    event.dataTransfer?.setData('text/plain', column.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onColumnDragOver(event: DragEvent, column: InoTableColumn<T>): void {
    if (!this.draggingColumnId || this.draggingColumnId === column.id) return;
    event.preventDefault();
    const order = [...this.columnOrder];
    const from = order.indexOf(this.draggingColumnId);
    const to = order.indexOf(column.id);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, this.draggingColumnId);
    this.columnOrder = order;
    this.cdr.markForCheck();
  }

  protected onColumnDragEnd(): void {
    if (this.draggingColumnId) {
      this.columnReorder.emit({ columnIds: [...this.columnOrder] });
    }
    this.draggingColumnId = null;
  }

  /** Keyboard-accessible reorder equivalent to the drag gesture above (DoD row 8). */
  protected moveColumn(column: InoTableColumn<T>, delta: -1 | 1): void {
    if (!this.interactive || !this.reorderableColumns || column.reorderable === false) return;
    const order = [...this.columnOrder];
    const from = order.indexOf(column.id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    this.columnOrder = order;
    this.columnReorder.emit({ columnIds: [...this.columnOrder] });
    this.cdr.markForCheck();
  }

  protected canMoveColumn(column: InoTableColumn<T>, delta: -1 | 1): boolean {
    const order = this.columnOrder;
    const from = order.indexOf(column.id);
    const to = from + delta;
    return from !== -1 && to >= 0 && to < order.length;
  }

  // ---------------------------------------------------------------------------------------------
  // Keyboard grid navigation — roving tabindex, arrow-key cell nav (DoD row 8)
  // ---------------------------------------------------------------------------------------------

  protected get navRowCount(): number {
    return 1 + this.displayRows.length; // header row + body rows
  }

  protected isActiveCell(row: number, col: number): boolean {
    return this.activeRow === row && this.activeCol === col;
  }

  protected onCellFocus(row: number, col: number): void {
    this.activeRow = row;
    this.activeCol = col;
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const key = event.key;

    if (key === 'Escape' && this.editing) {
      const target = this.displayRows[this.activeRow - 1];
      const nav = this.navColumns[this.activeCol];
      if (target?.kind === 'row' && nav?.kind === 'data') this.cancelEdit(target.row, nav.column);
      event.preventDefault();
      return;
    }

    if (key === 'Enter' || key === 'F2' || key === ' ') {
      if (key === ' ' && (event.target as HTMLElement)?.tagName === 'INPUT') return; // let filter inputs type spaces
      this.activateCell(this.activeRow, this.activeCol);
      event.preventDefault();
      return;
    }

    const totalCols = Math.max(1, this.navColumns.length);
    const totalRows = this.navRowCount;
    let row = this.activeRow;
    let col = this.activeCol;
    const inlineSign = this.isRtl ? -1 : 1;

    switch (key) {
      case 'ArrowRight':
        col = Math.min(totalCols - 1, col + inlineSign);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - inlineSign);
        break;
      case 'ArrowDown':
        row = Math.min(totalRows - 1, row + 1);
        break;
      case 'ArrowUp':
        row = Math.max(0, row - 1);
        break;
      case 'Home':
        col = 0;
        if (event.ctrlKey) row = 0;
        break;
      case 'End':
        col = totalCols - 1;
        if (event.ctrlKey) row = totalRows - 1;
        break;
      case 'PageDown':
        row = Math.min(totalRows - 1, row + 10);
        break;
      case 'PageUp':
        row = Math.max(0, row - 10);
        break;
      default:
        return;
    }

    event.preventDefault();
    this.focusCell(row, col);
  }

  private activateCell(row: number, col: number): void {
    const nav = this.navColumns[col];
    if (row === 0) {
      if (nav?.kind === 'data' && nav.column.sortable) this.toggleSort(nav.column);
      else if (nav?.kind === 'select') this.toggleSelectAll();
      return;
    }
    const target = this.displayRows[row - 1];
    if (!target) return;
    if (target.kind === 'group') {
      this.toggleGroup(target.key);
      return;
    }
    if (nav?.kind === 'select') this.toggleRowSelection(target.row, target.dataIndex);
    else if (nav?.kind === 'expand') this.toggleExpand(target.row, target.dataIndex);
    else if (nav?.kind === 'data' && nav.column.editable) this.startEdit(target.row, target.dataIndex, nav.column);
  }

  private focusCell(row: number, col: number): void {
    const target = this.displayRows[row - 1];
    const clampedCol = target?.kind === 'group' ? 0 : col;
    this.activeRow = row;
    this.activeCol = clampedCol;
    this.cdr.markForCheck();
    queueMicrotask(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(
        `[data-ino-row="${row}"][data-ino-col="${clampedCol}"]`,
      );
      el?.focus();
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Skeleton
  // ---------------------------------------------------------------------------------------------

  protected get skeletonRows(): number[] {
    return Array.from({ length: Math.max(1, this.skeletonRowCount) }, (_, i) => i);
  }

  protected trackIndex = (index: number): number => index;
}
