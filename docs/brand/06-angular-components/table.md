# `<ino-table>` — Table

> Parity benchmark: PrimeNG 22.1.1 `Table` (`specs/primeng/llms-22.1.1.txt`, line ~115).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: the highest-impact gap in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md` — a KYB risk-flag report *is* a
> dense table, and `--ino-row-min-height` (`tokens.css` §10) had zero consumers before this
> component.
> Preview: [`previews/table.html`](previews/table.html).
> Decisions record: `web/src/app/components/table/SPEC.md`.

A dense tabular data grid — `role="grid"` with full roving-tabindex keyboard navigation, row
selection (single/multiple/checkbox), row expansion, column resize/reorder/frozen columns, sort,
per-column filtering, grouping, row/cell edit, a loading skeleton, and an empty state. Composes
`<ino-paginator>` (`paginator` input) rather than reinventing paging.

**Web-only by design.** A dense grid with drag-resize, drag-reorder, frozen columns and
arrow-key cell navigation is a desktop/pointer-and-keyboard idiom; see `SPEC.md` §1 for the full
reasoning. The mobile counterpart is a different component and gets its own issue in a later wave.

---

## API

### Data + columns

| Input | Type | Default | Notes |
|---|---|---|---|
| `columns` | `InoTableColumn<T>[]` | `[]` | Column definitions — see [Column shape](#column-shape) |
| `data` | `readonly T[]` | `[]` | The full (unpaginated, unless `lazy`) row collection |
| `rowKey` | `(row: T, index: number) => unknown` | index-based | Stable row identity for selection/expansion/tracking |

### Presentation

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale — see [Size API](#size-api) |
| `ariaLabel` | `string` | `'Data table'` | Host grid `aria-label` |
| `disabled` | `boolean` | `false` | Dims the grid, no-ops every mutating interaction |
| `readonly` | `boolean` | `false` | Every control stays focusable; mutating actions no-op |
| `invalid` | `boolean` | `false` | Border reads `--ino-color-danger` |
| `loading` | `boolean` | `false` | Renders `skeletonRowCount` shimmer rows in place of data |
| `skeletonRowCount` | `number` | `5` | Rows drawn while `loading` |
| `emptyMessage` | `string` | `'No records found.'` | Overridden by an `[inoTableEmpty]` template when present |

### Selection

| Input / Output | Type | Notes |
|---|---|---|
| `selectionMode` | `'none' \| 'single' \| 'multiple' \| 'checkbox'` | Header "select all" checkbox appears only in `checkbox` mode |
| `selection` | `T[]` | Current selection (two-way via `selectionChange`) |
| `selectionChange` | `EventEmitter<T[]>` | Shift-range and ctrl/meta-toggle both work in `multiple`/`checkbox` |

### Row expansion

| Input / Output | Type | Notes |
|---|---|---|
| `expandableRows` | `boolean` | Adds the expand-toggle column |
| `expandedRowKeys` / `expandedRowKeysChange` | `ReadonlySet<unknown>` | Keyed by `rowKey` |
| `rowExpand` | `EventEmitter<{ row, expanded }>` | Fires on every toggle |

Detail content: project an `[inoTableRowDetail]` template (context: `$implicit` = row, `rowIndex`).

### Sort

| Input / Output | Type | Notes |
|---|---|---|
| `sortColumn` / `sortColumnChange` | `string \| null` | The active column's `id` |
| `sortDirection` / `sortDirectionChange` | `'asc' \| 'desc' \| null` | Tri-state; a third click clears the sort |
| `sortChange` | `EventEmitter<{ columnId, direction }>` | Combined event, same tick as the two above |

Single-column only — see `SPEC.md` §2 for the multi-sort omission and its reasoning.

### Filter

| Input / Output | Type | Notes |
|---|---|---|
| `filters` / `filtersChange` | `Record<string, unknown>` | Keyed by column `id` |
| `filterPredicate` | `InoTableFilterPredicate<T>` | Defaults to `inoTableDefaultFilterPredicate` — a local placeholder shaped to swap for a future `FilterService` integration (H-2) without an API break. See `SPEC.md` §2a |

Per-column: `column.filterable`, `column.filterType: 'text' \| 'select'`, `column.filterOptions`.

### Grouping

| Input / Output | Type | Notes |
|---|---|---|
| `groupBy` | `string \| null` | Field name; mutually exclusive with `paginator` |
| `collapsedGroupKeys` / `collapsedGroupKeysChange` | `ReadonlySet<unknown>` | Per-group collapse state |

### Column resize / reorder / frozen

| Input / Output | Type | Notes |
|---|---|---|
| `resizableColumns` | `boolean` | `true` by default; per-column `resizable: false` opts a column out |
| `reorderableColumns` | `boolean` | `true` by default; per-column `reorderable: false` opts a column out |
| `columnResize` | `EventEmitter<{ columnId, width }>` | Fires on pointer-up after a drag-resize |
| `columnReorder` | `EventEmitter<{ columnIds }>` | Fires after a drag-and-drop **or** a keyboard `‹`/`›` move |

Frozen: `column.frozen: 'start' \| 'end'` — `position: sticky` with a computed cumulative offset.

### Editing

| Output | Type | Notes |
|---|---|---|
| `cellEditComplete` | `EventEmitter<{ row, column, oldValue, newValue }>` | Fires only when the draft value actually changed |
| `cellEditCancel` | `EventEmitter<{ row, column, oldValue, newValue }>` | `newValue` equals `oldValue` — the edit was discarded |

Per-column `editable: boolean` gates entry (double-click, or Enter/F2 while the cell is active).

### Paging — composes `<ino-paginator>`

| Input / Output | Type | Notes |
|---|---|---|
| `paginator` | `boolean` | Renders a nested `<ino-paginator>` |
| `rowsPerPage` / `rowsPerPageOptions` / `first` / `firstChange` / `page` | — | Passed straight through to `<ino-paginator>` |
| `lazy` | `boolean` | `data` is assumed to already be the current page's sorted/filtered slice — matches `<ino-paginator>`'s controlled-component convention |
| `totalRecords` | `number` | Drives the paginator when `lazy` |

### Content projection

| Directive | Selector | Context |
|---|---|---|
| `InoTableCellDirective` | `[inoTableCell]="columnId"` | `$implicit` = cell value, `row`, `column`, `rowIndex` |
| `InoTableRowDetailDirective` | `[inoTableRowDetail]` | `$implicit` = row, `rowIndex` |
| `InoTableEmptyDirective` | `[inoTableEmpty]` | none |

### Column shape

```ts
interface InoTableColumn<T> {
  id: string;               // stable identity for sort/filter/resize/reorder/frozen state
  header: string;
  field?: string;            // direct key of T — no dot-path (keeps a cell read a single lookup)
  width?: string;
  minWidth?: string;         // resize floor, default 56px
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { label: string; value: unknown }[];
  editable?: boolean;
  align?: 'start' | 'center' | 'end';
  frozen?: 'start' | 'end';
  reorderable?: boolean;     // default true
  resizable?: boolean;       // default true
}
```

### Size API

`size="sm" | "default" | "lg"` re-resolves `--ino-control-height`, `--ino-control-padding-inline`,
`--ino-control-font-size`, `--ino-control-gap`. Every row's `min-block-size` reads
`--ino-row-min-height` (`tokens.css` §10) directly, so density (fluid/dense) falls out of the
existing token cascade. Full reasoning: `SPEC.md` §4.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| Selection (single/multi/checkbox) | ✅ | `selectionMode` |
| Row expansion | ✅ | `expandableRows` + `[inoTableRowDetail]` |
| Column resize | ✅ | Pointer drag on the resize handle |
| Column reorder | ✅ | Drag-and-drop **and** keyboard `‹`/`›` buttons |
| Frozen columns | ✅ | `column.frozen` |
| Sort | ✅ | Single-column, tri-state |
| Filter (FilterService shape) | ✅ (local placeholder) | `filterPredicate` — `SPEC.md` §2a |
| Grouping | ✅ | `groupBy` |
| Row/cell edit | ✅ | `column.editable` |
| Loading skeleton | ✅ | `loading` |
| Empty state | ✅ | `emptyMessage` or `[inoTableEmpty]` |
| Multi-column sort | ❌ **deliberate omission** | `SPEC.md` §2 |
| Row virtualization | ❌ **deliberate omission** | `SPEC.md` §2 — compose `ino-virtual-scroller` separately if needed |
| `FilterService` integration | ❌ **out of scope for this issue (H-2)** | `SPEC.md` §2a |

---

## States

| State | Signal |
|---|---|
| default | `.ino-table` base rule |
| hover | Row/`surface-sunken`; sortable-header, reorder-button, filter-control hover |
| active / pressed | Native `<button>`/`<input>`/`<select>` `:active` |
| focus-visible | `--ino-focus-ring` + `--ino-focus-ring-offset` on every focusable node, never hand-rolled |
| disabled | `[data-disabled]` host dim + `pointer-events: none` |
| readonly | Stays focusable/undimmed; the `interactive` guard no-ops mutating handlers |
| invalid | `.ino-table` border reads `--ino-color-danger` |
| loading / busy | `aria-busy` + skeleton rows + `cursor: progress` |

---

## Accessibility contract

**Role** — always `role="grid"`, never plain `role="table"`, regardless of column config. A strict
superset: arrow-key navigation always works, it simply has nothing to activate for a read-only
table. Full reasoning: `SPEC.md` §6.

**Keyboard** — roving tabindex: one active cell is `tabindex="0"`, every other cell `-1`.

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Enter/leave the grid at the single active cell |
| `←` / `→` | Move active cell one column (mirrors under `dir="rtl"`) |
| `↑` / `↓` | Move active cell one row (row 0 = header) |
| `Home` / `End` | First/last column in the row |
| `Ctrl+Home` / `Ctrl+End` | First/last cell in the grid |
| `PageUp` / `PageDown` | Move 10 rows |
| `Enter` / `F2` / `Space` | Activate: sort, select-all, row select/expand, or enter edit mode |
| `Escape` | Cancel an in-progress cell edit |

Column reorder has a keyboard-accessible equivalent (`‹`/`›` header buttons); resize is pointer-only
(no ARIA-APG precedent for a keyboard mapping on a cosmetic-only affordance). Full detail:
`SPEC.md` §5.

**Contrast/targets** — every reorder/expand/group toggle is never below the 24px SC 2.5.8 floor;
select/expand nav columns hit the 44px comfortable target in fluid density at `size="default"`.

**RTL** — logical properties only; frozen-column offsets and resize pointer-delta math both flip
explicitly for `dir="rtl"`. No physical-direction glyph exception remains. Full reasoning:
`SPEC.md` §8.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6, full detail in `SPEC.md` §2):

- **Multi-column sort.** Single active sort column only — additive to add later.
- **Row virtualization.** Compose `ino-virtual-scroller` separately if a dataset outgrows `lazy` +
  paging.
- **`FilterService` integration.** Explicitly out of scope for this issue (H-2, later wave); the
  local `filterPredicate` is shaped to swap without an API break.

## Mobile parity

**Web-only.** See `SPEC.md` §1 for the full reasoning. The mobile counterpart is a different
component and gets its own issue in a later wave; `check-theme-parity.mjs`'s `COMPONENT_REGISTRY`
records `table` alongside `focus-trap`/`virtual-scroller` as web-only by explicit decision.

---

## Usage

```html
<ino-table
  [columns]="columns"
  [data]="rows"
  [selectionMode]="'checkbox'"
  [(selection)]="selected"
  [expandableRows]="true"
  [(expandedRowKeys)]="expanded"
  [paginator]="true"
  [rowsPerPage]="25"
  ariaLabel="KYB risk flags"
>
  <ng-template inoTableCell="risk" let-value>
    <ino-tag [severity]="value">{{ value }}</ino-tag>
  </ng-template>
  <ng-template inoTableRowDetail let-row>
    <pre>{{ row | json }}</pre>
  </ng-template>
</ino-table>
```

Import by path — there is no barrel file:

```ts
import { InoTableComponent } from './components/table/ino-table.component';
import { InoTableCellDirective, InoTableRowDetailDirective } from './components/table/ino-table.templates';
import type { InoTableColumn } from './components/table/ino-table.types';
```
