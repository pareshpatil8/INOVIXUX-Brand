# `<ino-treetable>` — TreeTable

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B3 row
> `ino-treetable` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-452](/INO/issues/INO-452).
> Parity benchmark: PrimeNG 22.1.1 `TreeTable` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/treetable/SPEC.md`.

A hierarchical data grid combining tree expansion/collapse with table columns. Implements the WAI-ARIA APG treegrid pattern (`role=treegrid`) — the hardest accessibility case in the design system, combining `role=grid`'s 2D keyboard navigation with `role=tree`'s expand/collapse semantics.

**Web-only** (per spec row: mobile deferred).

---

## API

### `<ino-treetable>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `data` | `InoTreeTableRow[]` | `[]` | Tree-structured data rows. Each row has `value` (unique id), optional `children` array, and arbitrary column values |
| `columns` | `InoTreeTableColumn[]` | `[]` | Column definitions. First column is the tree column by default (frozen, contains expand chevron) |
| `caption` | `string` | `''` | Table caption for accessibility. Required for WCAG 2.2 AA (becomes `<caption>`) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Controls header control sizes (sort buttons, resize handles). Row sizing uses `density` instead |
| `density` | `'dense' \| 'fluid'` | `'fluid'` | Row height mode. Dense: `--ino-row-min-height`. Fluid: `--ino-control-height-default` |
| `disabled` | `boolean` | `false` | Prevents all interaction. Sets `aria-disabled="true"`, opacity 0.5 |
| `readonly` | `boolean` | `false` | Renders controls but blocks interaction. Visual state only (component-level `aria-readonly` not valid on treegrid) |
| `invalid` | `boolean` | `false` | Danger-colored border (`--ino-color-danger`). For validation state |
| `loading` | `boolean` | `false` | Shows skeleton rows. Sets `aria-busy="true"` |
| `emptyMessage` | `string` | `'No data available'` | Message shown when `data` is empty |
| `expandedRowValues` | `string[]` | `[]` | Controlled expansion state. Array of row `value`s that are expanded. Supports two-way binding via `expandedRowValuesChange` |

| Output | Payload | Fires |
|---|---|---|
| `expandedRowValuesChange` | `string[]` | When a row is expanded/collapsed (user interaction or programmatic) |
| `sort` | `InoTreeTableSortEvent` | When a sortable column header is clicked. Contains `column`, `direction` ('asc' \| 'desc' \| null), `columnIndex` |
| `loadChildren` | `InoTreeTableLoadChildrenEvent` | When a lazy-loadable branch (row with `children: undefined`) is first expanded. Contains `row`, `value` |
| `cellActivate` | `InoTreeTableCellActivateEvent` | When a cell is clicked or Enter/Space is pressed on a focused cell. Contains `row`, `column`, `rowIndex`, `columnIndex`, `originalEvent` |

### Column interface (`InoTreeTableColumn`)

| Property | Type | Default | Notes |
|---|---|---|---|
| `field` | `string` | (required) | Property path in `InoTreeTableRow` for this column's value. Supports dot notation (e.g., `"user.name"`) |
| `header` | `string` | (required) | Column header text. Required for accessibility (renders as `<th>` text) |
| `sortable` | `boolean` | `false` | Whether this column is sortable. Renders clickable header with sort direction indicator |
| `frozen` | `'start' \| 'end' \| false` | `'start'` (tree column), `false` (others) | Column freezing. Start: left edge. End: right edge. False: scrollable |
| `minWidth` | `number` | — | Minimum column width in pixels (for resize logic) |
| `width` | `number` | — | Current column width in pixels (controlled, updated on resize) |
| `resizable` | `boolean` | `true` | Whether this column can be resized |
| `cellTemplate` | `string` | — | Custom cell template name (maps to `ng-template` directives) |
| `headerTemplate` | `string` | — | Custom header template name |

### Row interface (`InoTreeTableRow`)

| Property | Type | Notes |
|---|---|---|
| `value` | `string` | Unique identifier for this row (used in `expandedRowValues` tracking) |
| `children` | `InoTreeTableRow[] \| undefined` | Optional child rows. `undefined`: lazy-loadable (emits `loadChildren` on expand). `[]`: leaf node. Non-empty array: branch with children |
| `loading` | `boolean` | Per-row loading state. Shows spinner in expand chevron, sets `aria-busy` on row |
| `[columnField]` | `any` | Column values, keyed by `column.field` |

---

## Sizing

**Size** (`size="sm|default|lg"`) controls interactive elements in the header: sort buttons, resize handles. Row sizing is controlled separately via `density`.

**Density** (`density="dense|fluid"`) controls row height:
- **Dense**: `--ino-row-min-height` (compact layouts, typically 28-32px)
- **Fluid** (default): `--ino-control-height-default` (comfortable spacing, typically 44px)

Both modes maintain WCAG 2.2 AA touch target minimums (24×24px per Success Criterion 2.5.8).

---

## States

**Default** — Header background `--ino-color-surface-raised`, borders `--ino-color-border`. Rows alternate with `--ino-color-surface` (even) and `--ino-color-surface-raised` (odd).

**Hover (row)** — Row background → `--ino-color-surface-hover`.

**Active (cell)** — Focused cell has roving tabindex (only one cell in the grid is `tabindex="0"`, all others are `tabindex="-1"`). Focus ring: `outline: var(--ino-focus-ring)` with `outline-offset: var(--ino-focus-ring-offset)`.

**Expanded** — Branch rows render `aria-expanded="true"`, chevron rotates 90°, children visible.

**Collapsed** — Branch rows render `aria-expanded="false"`, chevron points right, children hidden.

**Sorted** — Column header shows sort direction indicator (▲ asc, ▼ desc). Header background → `--ino-color-surface-hover` for sorted column.

**Disabled** — `opacity: 0.5`, `aria-disabled="true"`, all interaction blocked, cursor `not-allowed`.

**Readonly** — Visual state matches default, but interaction is blocked. No ARIA attribute at component level (treegrid role doesn't support `aria-readonly`).

**Invalid** — Border color → `--ino-color-danger` (2px solid). For validation feedback.

**Loading** — Shows skeleton rows (3 rows, pulsing shimmer), `aria-busy="true"`.

**Per-row loading** — Row's expand chevron shows spinner, row carries `aria-busy="true"`. For lazy-loading child data.

**Empty** — Displays `emptyMessage` in place of rows when `data` is `[]`.

---

## Keyboard Navigation

Follows WAI-ARIA APG treegrid pattern with roving tabindex (only one cell in the grid is focusable at a time):

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Moves focus into/out of the grid (to first/last focusable cell) |
| <kbd>Arrow keys</kbd> | Navigate between cells (2D grid navigation) |
| <kbd>Home</kbd> | Move to first cell in current row |
| <kbd>End</kbd> | Move to last cell in current row |
| <kbd>Ctrl+Home</kbd> | Move to first cell in entire grid (top-left) |
| <kbd>Ctrl+End</kbd> | Move to last cell in entire grid (bottom-right) |
| <kbd>PageUp</kbd> | Move up 10 rows in current column |
| <kbd>PageDown</kbd> | Move down 10 rows in current column |
| <kbd>ArrowRight</kbd> (tree column) | Expand collapsed branch, or move to first child if already expanded |
| <kbd>ArrowLeft</kbd> (tree column) | Collapse expanded branch, or move to parent row if already collapsed |
| <kbd>Enter</kbd> or <kbd>Space</kbd> (tree column) | Toggle expand/collapse on branch rows |
| <kbd>Enter</kbd> or <kbd>Space</kbd> (other cells) | Activate cell (emits `cellActivate` event) |

---

## Accessibility

- **Role**: `role=treegrid` on container (composite of `role=grid` + `role=tree`)
- **Row roles**: `role=row` on each `<tr>`
- **Cell roles**: `role=gridcell` on each `<td>`, `role=columnheader` on each `<th>`
- **Tree semantics**:
  - `aria-level` on rows (1-indexed nesting level)
  - `aria-expanded` on branch rows (true/false)
  - `aria-setsize` and `aria-posinset` on rows (position within parent's children)
- **Roving tabindex**: Only one cell has `tabindex="0"` at a time (all others `tabindex="-1"`)
- **Labels**:
  - `<caption>` from `caption` input (required)
  - Column headers from `column.header` (required)
- **States**:
  - `aria-busy` when `loading` or per-row `loading`
  - `aria-disabled` when `disabled`
  - `aria-sort` on sortable column headers (ascending/descending/none)
- **Empty state**: Screen readers announce `emptyMessage` when data is empty

**WCAG 2.2 AA compliance**: 3 themes tested (light/dark/high-contrast), all interactive elements meet 24×24px touch target minimum, contrast ratios verified per Success Criterion 1.4.3.

---

## Usage Examples

### Basic hierarchical data

```typescript
columns: InoTreeTableColumn[] = [
  { field: 'name', header: 'Component', frozen: 'start' },
  { field: 'status', header: 'Status', sortable: true },
  { field: 'assignee', header: 'Assignee' },
];

data: InoTreeTableRow[] = [
  {
    value: 'inputs',
    name: 'Input Components',
    status: 'In Progress',
    assignee: 'Team A',
    children: [
      {
        value: 'text-input',
        name: 'Text Input',
        status: 'Done',
        assignee: 'Alice',
      },
      // ... more children
    ],
  },
  // ... more root rows
];
```

```html
<ino-treetable
  [data]="data"
  [columns]="columns"
  caption="Component Development Status"
></ino-treetable>
```

### With sorting

```html
<ino-treetable
  [data]="data"
  [columns]="columns"
  caption="Sortable Table"
  (sort)="onSort($event)"
></ino-treetable>
```

```typescript
onSort(event: InoTreeTableSortEvent): void {
  // External sort control or server-side sorting
  console.log(`Sort by ${event.column.header} ${event.direction}`);
}
```

### Controlled expansion

```html
<ino-treetable
  [data]="data"
  [columns]="columns"
  caption="Controlled Expansion"
  [(expandedRowValues)]="expandedRows"
></ino-treetable>
```

```typescript
expandedRows: string[] = ['inputs']; // Pre-expand "inputs" row
```

### Lazy loading

```typescript
data: InoTreeTableRow[] = [
  {
    value: 'lazy-parent',
    name: 'Lazy Parent',
    children: undefined, // undefined = lazy-loadable
  },
];
```

```html
<ino-treetable
  [data]="data"
  [columns]="columns"
  caption="Lazy Loading"
  (loadChildren)="onLoadChildren($event)"
></ino-treetable>
```

```typescript
async onLoadChildren(event: InoTreeTableLoadChildrenEvent): Promise<void> {
  // Fetch children from server
  const children = await this.api.fetchChildren(event.value);
  // Update the row's children property
  event.row.children = children;
  event.row.loading = false; // Clear per-row loading state
}
```

---

## Design Decisions

See `web/src/app/components/treetable/SPEC.md` for full architectural decisions, including:

- **Roving tabindex implementation** (§3): Single focusable cell per grid, 2D navigation
- **Tree flattening model** (§4): How nested data becomes a flat render list
- **Sort behavior** (§5): Client-side vs server-side sorting strategies
- **Frozen column architecture** (§6): CSS `position: sticky` with `z-index` layering
- **Keyboard navigation edge cases** (§7): Home/End/PageUp/Down boundary behavior
- **Scope cuts** (§8): Row selection, cell editing, column reordering deferred to future phases

---

## Known Limitations

1. **Web-only** — Mobile port deferred per spec row (complex touch gestures for 2D navigation TBD)
2. **No row selection** — Multi-select checkbox pattern deferred (requires ARIA `aria-multiselectable`)
3. **No cell editing** — Inline edit deferred (requires `role=gridcell` → focused edit control handoff)
4. **No column reordering** — Drag-to-reorder deferred (requires accessible drag pattern)
5. **Client-side sort only** — Server-side sort requires external state management via `sort` event

---

## Testing Notes

- **Keyboard navigation**: Implementation completed in INO-882. Requires QA validation of all arrow keys, Home/End, PageUp/Down, Ctrl+Home/End across tree levels
- **Screen reader**: Verified NVDA/JAWS announcement of tree structure, expansion state, sort direction
- **Touch targets**: All interactive elements (chevrons, sort buttons) measured ≥24×24px
- **Contrast**: All text/border/background combinations verified ≥4.5:1 (AA) or ≥3:1 (large text)
- **Themes**: Light, dark, high-contrast tested at dense/fluid densities
