# `<ino-treetable>` — component spec

**Issue:** [INO-452](/INO/issues/INO-452) (INO-31 Phase B3, doc 26 §5 row `ino-treetable`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Lineage — `role=treegrid`, reusing table structure + tree expansion model

Doc 26 §5 identifies this as **"the hardest a11y row in the program"** because `role=treegrid` is
the most complex WAI-ARIA grid pattern — it combines the full `role=grid` keyboard navigation
contract (2D arrow-key navigation, roving tabindex, optional cell editing) with the `role=tree`
expand/collapse semantics (ArrowRight/Left controlling branch state, `aria-level`, `aria-expanded`).

Unlike `ino-table` (which ships `role=grid`) or `ino-treeselect` (which ships `role=tree` inside a
combobox panel), no existing component in this repo implements treegrid, so there is no prior local
precedent to follow. The WAI-ARIA Authoring Practices Guide
(https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/) is the canonical reference; every decision
below cites it or records a deliberate deviation with justification.

**What is reused:**

- **Column model, frozen columns, sortable headers, resize, reorder** — from `ino-table`
  (`web/src/app/components/table/`). A treegrid is a table first; its columns behave identically to
  a flat table's, with one exception: the first column (the "tree column") contains the
  expand/collapse chevron and carries `aria-level`/`aria-expanded` on each row's first cell. See §2.
- **Flatten/expand model for tree rows** — from `ino-treeselect`
  (`web/src/app/components/treeselect/`). The data structure (`InoTreeTableRow` extends
  `InoTreeSelectNode` with additional column values) and the flatten-on-expand algorithm
  (`recomputeRows()`) are the same; only the rendered content (a multi-column table row instead of
  a single-column list item) differs.
- **Size API, density (`dense`/`fluid`), row-height tokens, states (disabled/readonly/invalid/
  loading)** — verbatim from `ino-table`, which already implements doc 26 §2's sizing requirements.

**What is NOT reused:**

- **Roving tabindex + 2D arrow-key navigation.** `ino-table` uses native grid semantics with
  `tabindex="0"` on each focusable cell; treegrid requires exactly one cell to hold `tabindex="0"`
  at any moment (the "active cell"), with all others at `tabindex="-1"`, and arrow keys moving
  focus programmatically. This is the APG treegrid's hardest requirement and the reason doc 26 §5
  calls for "spec first." See §3.
- **Row selection.** `ino-table` ships single/multiple/checkbox selection via `selectionMode`.
  Treegrid row selection is deliberately **out of scope** for this issue — see §5 below. A
  display-only treegrid (expand/collapse + column sorting + keyboard navigation) is the baseline;
  selection is an additive future enhancement.

---

## 2. Column model — first column is the "tree column"

Following APG treegrid guidance, the **first visible column** is always the tree column:

- Every cell in that column's `<td>` contains the expand/collapse chevron (when the row is a
  branch) and **carries `aria-level` and `aria-expanded`** (APG: "the first cell in each row
  contains or wraps an element with `role=gridcell` that also has `role=treeitem` if that cell
  contains the tree structure"). This component implements it as a single `<td role="gridcell">`
  with `aria-level`/`aria-expanded` attributes directly on the cell, not a nested `role=treeitem`
  wrapper, matching the simpler of the two APG-sanctioned patterns.
- The tree column's header is a plain `<th role="columnheader">` like any other column; only the
  body cells in that column are special.
- Visual indentation (left padding proportional to `aria-level`) is applied via CSS
  (`padding-inline-start: calc(var(--ino-tree-indent-per-level) * aria-level)`), reading
  `--ino-tree-indent-per-level` from tokens (default 24px, matching `ino-treeselect`'s precedent).

**Frozen first column (doc 26 §5 requirement).** The tree column is `frozen: 'start'` by default
(via `column.frozen`), reusing `ino-table`'s existing `position: sticky` implementation. A caller
can override `frozen: false` to make it scrollable, but the default ships frozen because a tree
structure loses all affordance when its chevrons scroll off-screen.

**Other columns** are plain `role="gridcell"` with no tree-specific attributes. They participate in
the same roving-tabindex + 2D-arrow-navigation (§3) but carry no expand/collapse semantics.

---

## 3. Keyboard navigation — APG treegrid pattern (the hardest part)

The APG treegrid pattern mandates:

1. **Roving tabindex:** exactly one cell holds `tabindex="0"` (the "active cell"); all other cells
   hold `tabindex="-1"`. Focus moves programmatically via `cell.focus()` on arrow-key press, and
   the `tabindex` attributes update to match. On initial render or re-focus from outside, the first
   cell of the first row becomes active (or the last-active cell is restored if tracked).
2. **2D navigation:** ArrowDown/Up move vertically (to the same column in the next/previous visible
   row); ArrowRight/Left move horizontally within the same row (to the next/previous column), with
   one exception (see below). Home/End jump to the first/last column in the current row.
   PageDown/PageUp move to the same column N rows down/up (where N = visible row count, matching
   `ino-table`'s paginated-scroll precedent).
3. **Tree-column ArrowRight/Left special case:** when focus is in the tree column (column 0), those
   keys control expand/collapse **instead of** moving horizontally:
   - **ArrowRight** on a collapsed branch → expand it (no focus change). Already-expanded branch or
     leaf → move focus to the next column (column 1), matching the normal horizontal-navigation
     rule.
   - **ArrowLeft** on an expanded branch → collapse it (no focus change). Already-collapsed branch
     or leaf → move focus to the parent row's tree column (the row with `aria-level` one less than
     the current row's), if one exists. If already at level 0 (root), no-op.
4. **Enter/Space:** no default action on a treegrid cell. In an editable treegrid these would enter
   edit mode; in a display-only treegrid (this component's baseline), they are ignored. A caller
   can wire `cellActivate` output to trigger row expansion or drill-down, but there is no built-in
   default — unlike `ino-table`, which has no tree semantics to conflict with.

This is implemented via:

- `activeCell: { rowIndex: number, columnIndex: number } | null` tracking the current focus
  position.
- `onKeydown(event)` handler on the host `<div role="treegrid">`, delegating to `handleArrowKey()`,
  `handleHomeEnd()`, etc.
- `updateTabindices()` called after every navigation, setting `[attr.tabindex]` on all `<td>`
  elements via `@HostBinding` or a directive (the latter scales better for large grids).
- `restoreFocus()` after expand/collapse operations that insert/remove rows, ensuring the active
  cell's DOM reference stays valid (same model `ino-treeselect` uses for its own
  `aria-activedescendant` restoration after row-list mutations).

**Deliberate deviation from APG sample code:** the APG treegrid example uses
`aria-activedescendant` in some places; this component uses real DOM focus on cells instead,
matching `ino-table`'s precedent and avoiding the `aria-activedescendant` + roving-tabindex
conflict (APG itself notes both patterns are valid; real-focus is simpler when the grid is not
virtualized).

---

## 4. Tree expansion model — same flatten logic as `ino-treeselect`

The component accepts a tree-structured `data` input (`InoTreeTableRow[]`, where each row can have
optional `children?: InoTreeTableRow[]`) and flattens it into a linear `visibleRows` array
containing only currently-visible rows (a collapsed branch's children are excluded).

```typescript
export interface InoTreeTableRow {
  // Tree structure
  value: string;                      // unique row id
  children?: InoTreeTableRow[];       // optional child rows
  loading?: boolean;                  // per-row lazy-load spinner
  // Column values (keyed by column.field)
  [columnField: string]: any;
}
```

**Flatten algorithm (`recomputeRows()`):** depth-first traversal, emitting each row only if all its
ancestors are expanded. Each emitted row is annotated with:

- `level: number` (0 = root, 1 = first nesting level, etc.) → `aria-level="${level + 1}"` (APG
  uses 1-indexed levels).
- `expanded: boolean` → `aria-expanded="${expanded}"` (true/false; omitted for leaves).
- `parentValues: string[]` (root-first ancestor chain) → used by ArrowLeft to find the parent row.

**Expand/collapse on click:** clicking the chevron (or pressing ArrowRight/Left in the tree column)
toggles `expandedRowValues` (a `Set<string>`), then calls `recomputeRows()` to rebuild
`visibleRows`. The re-flatten is O(tree size), not O(visible rows), so for very large trees a
lazy-load model (where `children` is populated on-demand) is the correct pairing.

**Lazy load (optional):** same contract as `ino-treeselect.loadChildren` — when a row has
`children: undefined` (distinct from `children: []`), expanding it emits `loadChildren` with the
row's value; the caller fetches data and pushes the populated `children` array back in, then the
flatten runs.

---

## 5. Sorting — single-column, tri-state (asc → desc → none)

Sortable columns (via `column.sortable: boolean`) render a clickable header with sort direction
indicator (matching `ino-table`'s existing UI). Clicking cycles through asc → desc → none.

**Tree + sort interaction:** sorting is applied **after** the tree is flattened — i.e., visible
rows are sorted in place, respecting their tree structure. This means:

- Siblings at the same level are sorted relative to each other.
- Parent-child relationships are preserved (a child always appears immediately after its parent in
  the flat list, or after any already-expanded earlier siblings).

This is the simplest correct sort model for a treegrid and matches PrimeNG TreeTable's default
behavior. A "deep sort" (where sorting a column re-nests the tree by that column's values) is out
of scope — it would be a different component (`ino-pivot-table` or similar), not a variant of this
one.

---

## 6. States (doc 26 §5 + §2 standard set)

Doc 26 §5 names three additional states beyond the §2 standard set:

- **`expanded`** (per-row) — see §4. Rendered via `aria-expanded` on tree-column cells; no global
  component-level `expanded` input exists (unlike `ino-accordion`, where "all panels expanded" is a
  distinct mode).
- **`sorted`** — when any column is actively sorted (sortColumn/sortDirection non-null), the
  sorted column header's `<th>` carries `aria-sort="ascending|descending"` and renders the sort
  indicator.
- **`loading`** (per-row) — see §4. When a row has `loading: true`, its chevron is replaced by a
  small spinner and the row is `aria-busy`.

The §2 standard set (default, hover, focus-visible, active, disabled, readonly, invalid, loading,
empty) all carry over from `ino-table`:

- **Component-level `loading`** (distinct from per-row `loading`) renders a skeleton view (same as
  `ino-table`).
- **`disabled`** / **`readonly`** / **`invalid`** are host-level `@Input`s, same semantics as
  `ino-table`.
- **Empty state** — when `data` is an empty array, the `emptyMessage` string (or `[inoTreeTableEmpty]`
  template slot) renders in place of the `<tbody>`.

---

## 7. Sizing — dense/fluid row heights, sm/default/lg

`size: 'sm' | 'default' | 'lg'` (component-level `@Input`) re-resolves `--ino-control-height-*` and
`--ino-control-padding-*` for the header controls (sort buttons, resize handles), matching
`ino-table`'s precedent.

`density: 'dense' | 'fluid'` (component-level `@Input`) controls row height:

- **`fluid`** (default) → `--ino-row-min-height` from tokens (32px default, 28px sm, 44px lg).
- **`dense`** → tighter row height (24px default, matching the KYB risk-report use case this
  component was commissioned for, per doc 26 §5's "dense/fluid row heights" requirement).

This is verbatim from `ino-table.component.ts`'s density implementation.

---

## 8. Labels — caption + column headers

- **`caption`** (`@Input`, string) → renders a `<caption>` element inside the `<table>`, announced
  by screen readers as the table's accessible name.
- **Column headers** — each `InoTreeTableColumn` has a `header: string` property rendered as
  `<th>` text. The tree column's header is required (it labels the expand/collapse affordance);
  other columns can have empty headers if the data is self-evident, but this is discouraged (APG:
  "column headers should be present and informative").

---

## 9. Row selection — deliberately out of scope (baseline is display-only)

`ino-table` ships `selectionMode: 'single' | 'multiple' | 'checkbox'` for row selection.
Treegrid row selection exists (APG documents it: `aria-multiselectable` on the grid, `aria-selected`
on rows), but adding it to this component's baseline would expand the already-hard treegrid
keyboard contract further:

- **Space** on a row's tree column would need to toggle selection instead of being a no-op.
- **Checkbox selection** would require per-row checkboxes in a dedicated column (matching
  `ino-table`), plus a "select all" / "select all visible" / "select subtree" disambiguation.
- **Multi-select with Shift-range** would need to account for collapsed rows (does the range skip
  hidden descendants, or expand them?).

None of these are insurmountable, but together they risk the spec growing unbounded. **Decision:
baseline treegrid is display-only** (expand/collapse + column sorting + keyboard navigation).
Selection is an additive enhancement for a future issue, gated on a real product need surfacing.

If a caller needs row-selection-like behavior today, the recommended pattern is to wire
`cellActivate` output on the tree column to a consumer-owned selection model, same as `ino-table`'s
`rowClick` output allows.

---

## 10. Mobile — Web-only (doc 26 §5)

Doc 26 §5 explicitly marks this component "Web-only." A treegrid is a desktop/pointer-and-keyboard
idiom (2D arrow-key navigation, column resize/reorder, frozen columns), not a pattern that ports
meaningfully to a touch-first mobile form factor.

Both mobile tracks (React Native, Flutter) already have or will have a platform-native answer to
"hierarchical tabular data on a phone" — typically a nested-list or expandable-card layout — and
that is a **different component**, not a port of this one.

Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (`name: 'treetable'`,
`mobile: { reactNative: 'web-only', flutter: 'web-only' }`), matching `ino-table`'s own precedent.

---

## 11. Frozen first column — default, overridable

Doc 26 §5 names "frozen first column" as a baseline variant. The tree column (first column) ships
with `frozen: 'start'` by default, but a caller can override `columns[0].frozen = false` to make it
scrollable.

Frozen-column rendering reuses `ino-table`'s existing `position: sticky` implementation
(`frozenOffset()` computing cumulative inset), so this is a configuration default, not new code.

---

## 12. Editing — out of scope (baseline is read-only)

`ino-table` ships cell editing (double-click or Enter/F2 on a focused cell with `column.editable`,
commits on blur/Enter, cancels on Escape). Treegrid editing is a real pattern (APG documents it),
but it is **deliberately out of scope** for this issue's baseline — same rationale as row selection
(§9): the keyboard contract is already the hardest in the program without layering edit-mode
focus-trap logic on top.

A future enhancement can add it (the APG pattern is: Enter/F2 enters edit mode, focus moves into
the edit control, Escape cancels and returns focus to the gridcell, Enter/Tab commits and moves to
the next editable cell). For now, the baseline is **read-only display**.

---

## 13. Accessibility contract — full WAI-ARIA treegrid pattern

**Roles:**

- Host `<div>` → `role="treegrid"`, `aria-label` from `caption` input (or `aria-labelledby` if a
  visible `<caption>` is rendered).
- Rows → `<tr role="row">`.
- Tree column cells → `<td role="gridcell" aria-level="{level+1}" aria-expanded="{expanded}">`.
- Other column cells → `<td role="gridcell">`.
- Column headers → `<th role="columnheader" aria-sort="{asc|desc|none}">`.

**Keyboard map (APG treegrid):**

| Key | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | Move focus to the same column in the next/previous visible row (no wrap) |
| `ArrowRight` (tree column) | Collapsed branch → expand. Expanded branch or leaf → move to next column. |
| `ArrowLeft` (tree column) | Expanded branch → collapse. Collapsed/leaf → move to parent row's tree column. |
| `ArrowRight` / `ArrowLeft` (other columns) | Move focus to next/previous column in the same row (wraps to next/previous row at edges, matching APG guidance) |
| `Home` / `End` | Jump to first/last column in current row |
| `Control+Home` / `Control+End` | Jump to first/last cell in the entire grid (first column of first row / last column of last row) |
| `PageDown` / `PageUp` | Move focus N rows down/up (where N = visible row count), same column |

**Focus management:**

- Roving tabindex: exactly one cell holds `tabindex="0"`, all others `tabindex="-1"`.
- On initial render or re-focus from outside, the first cell of the first row becomes active (or
  the last-active cell is restored if `rememberFocus` is true, matching `ino-table`'s precedent).
- After expand/collapse, focus is restored to the tree column cell of the row that was just
  expanded/collapsed (via `restoreFocus()`), even if new rows were inserted above it.

**Screen-reader announcements:**

- `aria-level` announces nesting depth ("level 2 of 3").
- `aria-expanded` announces branch state ("collapsed", "expanded").
- Column headers (`aria-label` or `<th>` text content) are announced when navigating into a column.
- Sort direction (`aria-sort`) is announced on sorted column headers.
- Per-row `loading` state renders `aria-busy` on the affected `<tr>`.

**Color contrast:** all text/icon colors read from `--ino-color-*` tokens and are audited by
`check-theme-parity.mjs` for WCAG 2.2 AA compliance (4.5:1 for normal text, 3:1 for large text and
UI components) across all three themes.

---

## 14. Implementation notes

**Component file structure** (matching existing component precedent):

- `ino-treetable.component.ts` — main component class, tree flattening, keyboard navigation.
- `ino-treetable.component.html` — template (table structure, roving tabindex directives).
- `ino-treetable.component.scss` — styles (tree indentation, frozen columns, density modes).
- `ino-treetable.types.ts` — `InoTreeTableRow`, `InoTreeTableColumn`, `InoTreeTableSortEvent`.
- `SPEC.md` — this file.

**Dependencies:**

- Reuses `ino-table`'s column model (`InoTableColumn` extended to `InoTreeTableColumn`).
- Reuses `ino-treeselect`'s flatten model (`recomputeRows()` adapted for multi-column output).
- No new dependencies; all token reads are from existing `tokens.css`.

**Testing surface:**

- Keyboard navigation (all arrow-key combinations, Home/End, PageUp/Down, Control+Home/End).
- Expand/collapse preserves focus position.
- Sorting respects tree structure.
- Frozen column scrolls correctly.
- Dense/fluid row heights render at expected pixel heights across all three themes.
- ARIA attributes (`role`, `aria-level`, `aria-expanded`, `aria-sort`) are correct per APG.

---

## 15. Risks and mitigations

**Risk:** Roving tabindex + 2D navigation is the hardest keyboard pattern in the design system; a
bug in focus management will break keyboard-only access entirely.

**Mitigation:** The spec explicitly defers row selection and cell editing to future enhancements,
keeping the baseline scope tractable. Comprehensive keyboard-nav tests (manual and automated) are
the acceptance gate, not an afterthought.

**Risk:** `ino-tree` (Phase B3, same phase as this component) may ship with a different flatten
model, requiring this component to refactor.

**Mitigation:** The flatten logic is isolated in `recomputeRows()` and has no treegrid-specific
state threaded through it, making extraction into a shared primitive mechanical (same mitigation
`ino-treeselect` SPEC.md §1 records for its own flatten core).

**Risk:** Large trees (thousands of rows) will bog down the 2D focus-management logic.

**Mitigation:** The baseline is not virtualized (matching `ino-table`'s own non-virtualized
baseline). A future enhancement can add virtual scrolling (via `ino-virtual-scroller` composition),
but the roving-tabindex contract works correctly on non-virtualized grids today, so this is a
performance optimization, not a correctness fix. The KYB risk-report use case (the commissioning
need for this component, per doc 26 §5) has realistic row counts in the hundreds, not thousands.

---

**Spec approved by:** (awaiting CTO review per INO-452)
**Implementation start:** (pending spec sign-off)
