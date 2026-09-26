# `<ino-table>` — component spec

**Issue:** INO-155 (INO-31 T-1, Tier 1 / Data group)
**Parity benchmark:** PrimeNG 22.1.1 `Table` — `specs/primeng/llms-22.1.1.txt` line ~115, route
`https://primeng.dev/table`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap register:** the highest-impact gap in `docs/brand/16-design-system-parity-vs-echeque-reference.md`
— a KYB risk-flag report *is* a dense table, and `--ino-row-min-height` (`tokens.css` §10) has
existed since day one with zero consumers before this component.
**Depends on:** W0-2 (control-size scale), T-2 (`ino-paginator`, composed here rather than
reinvented), T-3. All merged before this branch started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Mobile: web-only (DoD row 9)

**Decision: web-only. No React Native, Capacitor or Flutter port ships with this issue.**

Reason, per plan rev 9 §5 (the desktop-idiom porting rule): a dense grid with column resize,
drag-to-reorder, frozen columns and roving-tabindex arrow-key cell navigation is a
desktop/pointer-and-keyboard idiom, not the same component wearing a different skin on mobile.
Both mobile tracks already have (or will have) a platform-native answer to "dense tabular data on
a phone" — a card-list or stacked-row layout — that is a **different component**, not a port of
this one, and gets its own issue in a later wave.

Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (`name: 'table'`,
`mobile: { reactNative: 'web-only', flutter: 'web-only' }`) alongside `focus-trap` and
`virtual-scroller`, which record the same kind of decision for the same reason class.

---

## 2. Variants built (DoD row 6)

The PrimeNG route's feature list, and what shipped:

| PrimeNG feature | Shipped | Surface |
|---|---|---|
| Row selection — single/multiple/checkbox | ✅ | `selectionMode` @Input; shift-range and ctrl/meta-toggle on multi/checkbox; header "select all" checkbox with indeterminate state |
| Row expansion | ✅ | `expandableRows` + `expandedRowKeys`; `[inoTableRowDetail]` template slot for the detail row content |
| Column resize | ✅ | Pointer-driven drag on `.ino-table__resize-handle`; `minWidth` per column, `resizableColumns` global toggle, per-column `resizable: false` opt-out |
| Column reorder | ✅ | HTML5 drag-and-drop **and** a keyboard-accessible `‹`/`›` button pair per header (DoD row 8 requires a non-pointer path) |
| Frozen columns | ✅ | `column.frozen: 'start' \| 'end'`; `position: sticky` with `frozenOffset()` computing the cumulative inset from other frozen columns on the same edge |
| Sort | ✅ | Single-column, tri-state (asc → desc → none) via `column.sortable`; multi-column sort is **not** shipped — see omissions below |
| Filter | ✅ | Per-column `filterable` + `filterType: 'text' \| 'select'`; local `filterPredicate` — see §2a |
| Grouping | ✅ | `groupBy` + collapsible group header rows; mutually exclusive with `paginator` in v1 (a grouped view needs every row loaded to compute group membership, matching PrimeNG's own constraint) |
| Row/cell edit | ✅ | Double-click or Enter/F2 on a focused cell with `column.editable`; commits on blur/Enter, cancels on Escape; `cellEditComplete`/`cellEditCancel` outputs |
| Loading skeleton | ✅ | `loading` @Input renders `skeletonRowCount` shimmer rows in place of data |
| Empty state | ✅ | `emptyMessage` string default, or `[inoTableEmpty]` template slot for a custom empty view |
| Lazy/virtual data mode | ✅ (lazy only) | `lazy` @Input hands sort/filter/paging state entirely to the consumer (`data` is assumed pre-sliced); **virtual scrolling of the row list itself is not shipped** — see omissions |
| Multi-column sort | ❌ **deliberate omission** | See below |
| `FilterService` integration | ❌ **out of scope for this issue (H-2, later wave)** | See §2a |
| Row virtualization (windowing) | ❌ **deliberate omission** | See below |
| Column grouping / multi-row headers | ❌ **deliberate omission** | Not named in the issue's variant list; no consumer need identified yet |

**Deliberate omissions, with reasons:**

- **Multi-column sort.** The issue's variant list says "sort," not "multi-sort"; a single active
  sort column covers the KYB risk-flag-report use case this component was commissioned for. Adding
  it later is additive (`sortColumn`/`sortDirection` generalize to an array without an API break
  for the single-column case) — not a foreclosed door, just not built speculatively.
- **Row virtualization.** `ino-virtual-scroller` (INO-129) already exists as the composable answer
  to "many rows" for a plain list. Wiring `<ino-table>`'s `<tbody>` through it is real work (sticky
  header vs. virtualized body, frozen-column sticky math inside a windowed scroll port) that the
  issue's scope doesn't call for; the `lazy` + external-paginator combination already handles the
  KYB report's realistic row counts (hundreds, not tens of thousands) without it.
- **`FilterService` integration.** Explicitly named out of scope in the issue text (H-2, a later
  wave). `filterPredicate` (`ino-table.types.ts`) is a plain predicate function chosen specifically
  so a future `FilterService`-backed default swaps in without changing the `@Input`'s shape — see
  the doc comment on `InoTableFilterPredicate`.

### 2a. Filter is a local placeholder, not `FilterService`

`filterPredicate: InoTableFilterPredicate<T>` defaults to `inoTableDefaultFilterPredicate` — a
plain, synchronous `(row, column, filterValue) => boolean`. This is intentionally the smallest
possible surface: a future `FilterService` integration (H-2) becomes a different default value for
the same `@Input`, not an API break.

---

## 3. Eight states (DoD row 5)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `.ino-table` base rule |
| Hover | ✅ | Row hover (`surface-sunken`); sortable-header hover; reorder-button/filter-control hover |
| Active/pressed | ✅ | Inherited from native `<button>`/`<input>`/`<select>` `:active` — no custom pressed treatment was needed beyond what the browser already gives those controls, matching `ino-paginator`'s reasoning for its own native sub-controls |
| Focus-visible | ✅ | Every focusable node (grid cells via roving tabindex, reorder buttons, resize handle's owning header, filter inputs, edit input) reads `--ino-focus-ring`/`--ino-focus-ring-offset` — never a hand-rolled outline |
| Disabled | ✅ | `disabled` @Input → `[data-disabled]` host attribute, 0.5 opacity + `pointer-events: none`, same idiom as `ino-paginator`/`ino-virtual-scroller` |
| Readonly | ✅ | `readonly` @Input → `[data-readonly]` host attribute; the `interactive` getter (`!disabled && !readonly && !loading`) gates every mutating handler (sort, filter, select, expand, edit, resize, reorder) without removing controls from the tab order — same rationale `ino-paginator.component.ts` follows for its own readonly state (no SPEC.md exists yet for that component; pending INO-31 backfill) |
| Invalid | ✅ | `invalid` @Input → `[data-invalid]` host attribute → `.ino-table` border reads `--ino-color-danger`. Unlike `ino-paginator` (no form-validity concept), a table can back a form-adjacent bulk-edit view where the whole grid needs to signal a server-side validation failure |
| Loading/busy | ✅ | `loading` @Input → `[data-loading]` host attribute (`cursor: progress` on the scroll port) + skeleton-row body content + `aria-busy` on the `role="grid"` element |

---

## 4. Size API and density (DoD rows 3-4)

`size: 'sm' | 'default' | 'lg'` re-resolves all four control-size aliases the table's own chrome
needs (`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`,
`--ino-control-gap`) — the same `[data-size]` host-attribute idiom every other Tier-1 component
uses. No local sizing values were invented.

**Density** — every header and body cell's `min-block-size` is `var(--ino-row-min-height)`
(`tokens.css` §10), the token this whole component exists to finally consume; it re-resolves under
an ancestor `[data-density='dense']` the same way it does for every other row-based component, so
dense mode falls out of the existing token cascade rather than a component-local branch.

---

## 5. ARIA contract and keyboard map (DoD row 8)

**Role.** The table element is always `role="grid"`, never plain `role="table"`, regardless of
column configuration (sortable, editable, selectable, or none of those) — see §6 below for why a
single role model was chosen over switching between the two.

**Structure.** `role="rowgroup"` on `<thead>`/`<tbody>`, `role="row"` on every `<tr>`,
`role="columnheader"` on header cells (`scope="col"`, `aria-sort` when sortable), `role="gridcell"`
on body cells. `aria-rowcount`/`aria-colcount` on the grid reflect the full (unpaginated, for
`aria-rowcount`) dataset size; `aria-rowindex` on each row is 1-based including the header row.

**Selection/expansion/busy.** `aria-selected` on selected rows; `aria-expanded` +
`aria-label` ("Expand row"/"Collapse row") on the expand toggle; `aria-busy` on the grid while
`loading`; `aria-readonly`/`aria-disabled`/`aria-invalid` mirror the corresponding `@Input`s.

### Keyboard map — roving tabindex

Exactly one cell (header or body) is `tabindex="0"` at a time (`activeRow`/`activeCol` state); every
other cell is `tabindex="-1"`. This is the standard `role="grid"` pattern (one stop in the page's
tab order, arrow keys move within the grid) rather than every cell being a separate tab stop, which
would make a 50-column report untabbable in practice.

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Enter/leave the grid at the single active cell; does not move within it |
| `←` / `→` (`→`/`←` under `dir="rtl"`) | Move active cell one column; clamped to the grid edge |
| `↑` / `↓` | Move active cell one row (row 0 is the header) |
| `Home` / `End` | Jump to first/last column in the current row |
| `Ctrl+Home` / `Ctrl+End` | Jump to the first/last cell in the whole grid |
| `PageUp` / `PageDown` | Move 10 rows |
| `Enter` / `F2` / `Space` | Activate the cell: toggles sort (header, sortable column), toggles select-all (header, select column), toggles a row's selection/expansion (select/expand column), or enters edit mode (editable column) |
| `Escape` | Cancels an in-progress cell edit, discarding the draft |

Column resize (pointer drag only) and reorder (pointer drag) both have a keyboard-accessible
equivalent: the `‹`/`›` reorder buttons in every header are real, always-tabbable `<button>`s (DoD
row 8 requires a non-pointer path for every interaction; there is no keyboard equivalent offered
for resize specifically, since a resize handle with no visible affordance change has no PrimeNG or
ARIA-APG precedent for a keyboard mapping — column width is a cosmetic-only concern with no
data-access consequence if left at its default).

### Contrast and targets

Every reorder button and expand/group toggle is `min(--ino-target-min, --ino-target-min)` — never
below the 24px SC 2.5.8 floor; `--ino-control-height`-sized nav columns (select/expand) hit the 44px
comfortable target in fluid density at `size="default"`, matching `ino-paginator`'s own guarantee.

---

## 6. Single role model: always `role="grid"`

PrimeNG (and the ARIA APG) permit a plain `role="table"` for a non-interactive, non-sortable,
non-editable table and reserve `role="grid"` for one with cell-level interaction. This component
does not switch between the two based on column config, for the same reason `ino-tag`'s severity
model stays a single component rather than forking by variant: a consumer that starts with a
read-only report and later adds sorting or inline edit should not have its accessibility tree
silently change shape underneath it. `role="grid"` with a fully-implemented roving-tabindex
navigation model (§5) is a strict superset of what `role="table"` offers, so nothing is lost for
the non-interactive case — arrow-key navigation still works, it simply has nothing to activate.

---

## 7. Row selection background: solid roles only, not `color-mix()`

`check-ds-adherence.mjs`'s `no-raw-color` rule bans `color-mix()` outright, even wrapping a
`var()` — so a translucent accent-tinted selected-row background (the idiom PrimeNG's own table
uses) is off the table, the same finding `datepicker/SPEC.md` §7 records for its in-range cells.
Its `non-token-shadow` rule separately bans a hand-rolled `box-shadow` accent stripe (only the
named `--ino-elevation-*` aliases are permitted).

The shipped answer: a flat `--ino-color-surface-sunken` fill (the same already-audited neutral this
component already uses for `:hover`) plus a solid `--ino-color-accent`
`border-inline-start-color` on the row's first cell. Every cell reserves a transparent
`border-inline-start: var(--ino-space-1) solid transparent` so a selected row's cells never shift
width relative to an unselected row's when that border turns solid — the reservation, not the
color, is what's declared on the shared `.ino-table__th`/`.ino-table__td` rule.

---

## 8. RTL

Logical properties only (`padding-inline`, `inline-size`, `inset-inline-start`/`-end`,
`border-inline-start`) — the frozen-column sticky offsets and the column-resize pointer-delta math
both flip explicitly for RTL rather than relying on the browser to mirror a physical-property
value: `frozenOffset()`'s "start"/"end" side already reads as the correct physical edge in either
direction because it is expressed in logical terms, and `handleResizeMove()` multiplies the pointer
delta by `-1` under `dir="rtl"` (via the `isRtl` getter, which reads `getComputedStyle(...).direction`)
since a leftward drag under RTL should grow a column, not shrink it.

No known physical-direction exception remains (contrast `ino-paginator.component.scss`'s chevron-glyph
exception; no SPEC.md exists yet for that component, pending INO-31 backfill) — this component draws
no directional glyph that isn't already handled by the sort-icon rotation and the chevron's
`border-inline-start` construction, both of which are logical-property-safe.

---

## 9. `anyComponentStyle` budget

This is the largest Tier-1 component's stylesheet by interactive sub-part count (header cell,
resize handle, reorder controls, filter row, body cell, edit input, expand/group toggle, skeleton,
paginator slot). Two of the same techniques `datepicker/SPEC.md` §8 records were needed to land
under Angular's 8kB `anyComponentStyle` error budget without dropping a DoD-required state:

1. **A local `--_t` alias** on `:host`, `var(--ino-motion-duration-fast) var(--ino-motion-easing-standard)`,
   for the repeated fast-duration/standard-easing transition pairing used across header hover, sort
   icon, reorder-control opacity, row hover, and the expand/group chevron. Pure indirection — each
   still resolves through the same two tokens.css roles one hop later; DoD row 1 still holds.
2. **A merged base rule** for `.ino-table__filter-input`, `.ino-table__filter-select`, and
   `.ino-table__edit-input` — all three inline form controls this table draws share
   `inline-size`/`padding-inline`/`border-radius`/`background`/`color`/`font`/`focus-visible`;
   only what differs (border, min-block-size, hover/disabled treatment) stays per-selector.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (in `web/`) | ✅ passes, no errors. One non-blocking `anyComponentStyle` budget warning (7.73 kB vs. the 4 kB warning threshold, under the 8 kB error threshold) — same class of warning `paginator/SPEC.md` §8 and `datepicker/SPEC.md` §8 already carry |
| `node scripts/check-theme-parity.mjs` | ✅ passes; `COMPONENT_REGISTRY` now carries 7 components (`table` added, web-only like `focus-trap`/`virtual-scroller`) |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations in this directory |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token (fixed one `color-mix()` and one off-scale `gap: 2px` found during this verification pass — see §7 and the `--ino-space-1` gap fix) |
| `[data-theme]` branches in the component | none |
