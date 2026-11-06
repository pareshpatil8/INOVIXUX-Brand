# `<ino-orgchart>` — component spec

**Issue:** INO-477 (INO-31 B5, doc 26 §5 row "ino-orgchart")
**Parity benchmark:** PrimeNG 22.1.1 `OrganizationChart`. PrimeNG is a benchmark, **not a runtime
dependency** (same stance as every other SPEC in this library); nothing here imports it.
**Spec seed (doc 26 §5):** node templates; expand/collapse subtrees; selection; connectors.
States: expanded, selected, loading (plus the §2 standard set). Sizing: zoom scales. Labels:
chart label. A11y: tree-of-nodes semantics, Arrow traversal documented. Web-only.
**Siblings:** `<ino-tree>` (INO-450) — the flatten/expand/roving-tabindex core this component
ports; `<ino-treeselect>` (INO-423) — the original source of that core.

This file records the decisions the §2 contract requires to be written down rather than silently
made. §8 lists every cut.

---

## 1. One tree pattern, rotated 90°

An org chart **is** a tree — same data, same semantics, different geometry. This component
reuses `<ino-tree>`'s machinery wholesale (`InoOrgChartNode` mirrors `InoTreeNode`; the
flatten-to-visible-rows model, the roving tabindex, the `parentOf` map and the
expand-or-descend / collapse-or-ascend keyboard pair are ports, not reinventions) and changes
only what the geometry changes:

- **Rendering is recursive**, not a flat `<ul>`: nested `ul[role="group"]` under each branch,
  because the connector CSS (§4) needs the real parent/child DOM nesting. The *traversal* model
  stays flat (visible-row list + `parentOf`), exactly as in `ino-tree` — the template recurses,
  the keyboard logic doesn't.
- **The Arrow map is the APG tree pattern rotated for a top-down chart** (§5): Down =
  expand-or-descend (tree's ArrowRight), Up = collapse-or-ascend (tree's ArrowLeft),
  Left/Right = previous/next sibling. This is the "Arrow traversal documented" the §5 row asks
  for — the mapping is geometric, matching what the user sees, and it is documented on the docs
  page verbatim.
- **Subtrees start expanded.** A tree-select starts collapsed because it's a picker; an org
  chart's whole point is showing the structure, so every branch renders open until the user
  collapses it. Internal state is therefore a `collapsedValues` set (inverse of `ino-tree`'s
  `expandedValues`).

## 2. Node templates (§5)

Default node rendering is `label` + optional `sublabel` (name + role — the org-chart staple).
For anything richer the host projects **one** `<ng-template>` rendered per node with the node as
template context:

```html
<ino-orgchart [value]="root">
  <ng-template let-node>
    <strong>{{ node.label }}</strong>
    <em>{{ node.data?.title }}</em>
  </ng-template>
</ino-orgchart>
```

`@ContentChild(TemplateRef)` + `ngTemplateOutlet`, context `{ $implicit: node }`. `InoOrgChartNode`
carries an opaque `data?: unknown` bag for template-only payload (avatar URL, title, head-count…)
so custom templates never force fields onto the node interface. The template replaces the node
card's *content*, never its chrome — selection/focus/connector styling stays on the card so a
custom template cannot break the a11y contract.

## 3. Selection (§5) — opt-in, single

`selectionMode: 'none' | 'single'` (default `'none'` — matching the benchmark: an org chart is
primarily a visualization; most instances never select). When `'single'`:
`@Input() value: string` / `@Output() valueChange` banana-in-a-box keyed on `node.value`,
matching every Tier-1 control in this repo — no `ControlValueAccessor`. Click or Enter/Space
selects; activating the selected node again deselects (`value` → `''`) — a chart selection is a
highlight, not a form commitment, so it must be clearable without API calls. Multiple/checkbox
selection is cut (§8): the benchmark's multiple mode exists for diagram-editing use cases the §5
row doesn't name.

## 4. Connectors (§5) — CSS pseudo-elements, logical properties

Connectors are drawn entirely with borders on `::before`/`::after` pseudo-elements (the classic
CSS org-chart recipe): each child `<li>` draws its two half-rails + center drop-stub, the parent's
`ul[role="group"]` draws the descent stub, and `:first-child`/`:last-child`/`:only-child` trim
the outer rail halves. No SVG, no JS measurement, no resize observer — the connectors are layout,
so they reflow with zoom, density, wrapping and RTL for free.

All connector geometry uses **logical** properties (`inset-inline-start/end`,
`border-inline-start`) so the chart mirrors correctly under `dir="rtl"` without a single `[dir]`
override — the sibling row reverses with flex inline direction and the trimmed edge halves flip
with it. Connector color is `--ino-color-border` (1px), the same rail weight every bordered
container in the library uses.

## 5. Keyboard — documented Arrow traversal (§5)

One tab stop (roving tabindex, exactly `ino-tree`'s model; `aria-activedescendant` is never
used — real DOM focus moves between node cards):

| Key | Action |
|---|---|
| `ArrowDown` | Collapsed branch: expand (focus stays). Expanded branch: focus first enabled child. Leaf: no-op |
| `ArrowUp` | Expanded branch: collapse (focus stays). Collapsed branch / leaf: focus parent. Root: no-op |
| `ArrowRight` / `ArrowLeft` | Next / previous enabled sibling (clamped, no wrap — a sibling row is a line, not a cycle) |
| `Home` / `End` | First / last enabled sibling in the current row |
| `Enter` / `Space` | Select / deselect (`selectionMode="single"` only) |

Focused nodes `scrollIntoView({block:'nearest', inline:'nearest'})` — wide charts scroll inside
the component (§6), so keyboard traversal must drag the viewport along.

Disabled nodes are skipped by sibling moves and excluded from Home/End, same as `ino-tree`'s
enabled-rows filter; a disabled node's subtree stays reachable (disabled ≠ collapsed).

## 6. Zoom (§5 sizing: "zoom scales") + density + overflow

`zoom: number`, default `1`, clamped to `[0.5, 2]` (an org chart at <50% is unreadable and >200%
is the browser's job). Implementation: the chart surface sets
`font-size: calc(var(--ino-control-font-size) * zoom)` and **every internal length — node
padding, gaps, connector heights, indents — is in `em`**, so one declaration scales the entire
chart proportionally, text included. This is real zoom (layout reflows, text grows, WCAG 1.4.4
resize-friendly), not `transform: scale()` (which blurs text and leaves phantom layout size).

Density composes for free: `--ino-control-font-size` is a §12 token, so `[data-density="dense"]`
re-points the base the zoom multiplies. No sm/md/lg axis — the §5 row names zoom *as* the sizing
axis, and layering both would make two inputs fight over one `font-size`.

Wide charts overflow horizontally inside `.ino-orgchart__scroller` (`overflow: auto`): a chart
must never force the host page to scroll sideways. The scroller is not itself focusable — the
nodes inside it are the keyboard surface, and §5's `scrollIntoView` keeps them visible.

## 7. States (§2 standard set + §5: expanded, selected, loading)

| State | Treatment |
|---|---|
| default | node card: `--ino-color-surface` on the raised rung, 1px `--ino-color-border`, `--ino-radius-md` |
| hover (selectable, enabled) | card border → `--ino-color-on-surface-muted` — the library's standard hover lift |
| focus-visible | `--ino-focus-ring` on the node card |
| expanded / collapsed | toggle button under branch cards; chevron rotates; `aria-expanded` tracks it |
| selected | card border → `--ino-color-accent`, label → `--ino-color-accent-text-safe` weight 600 (the `ino-tree` selected pairing on a card), `aria-selected="true"` |
| disabled (chart) | whole chart non-interactive, opacity 0.5, `aria-disabled="true"`, togglers disabled |
| disabled (node) | card text → `--ino-color-on-surface-subtle`, skipped by traversal, `aria-disabled="true"` |
| loading | `loading` input: `aria-busy="true"`, spinner overlay on the scroller, interaction suppressed — the §5 "loading" is chart-level (data fetch in flight), not per-branch (§8) |
| empty | `value == null`: "No data." placeholder paragraph, `role="tree"` kept so the accessible name survives |

readonly and invalid are **not applicable** — this is a visualization, not a form control; there
is no committed value to protect or validate. Recorded as deliberate omissions on the docs page.

## 8. Out of scope (deliberate omissions — rendered on the docs page)

- **Mobile ports** — the §5 row is explicitly Web-only; no RN/Flutter disposition.
- **Lazy children / per-branch loading** — `ino-tree`'s `hasChildren`/`loadChildren` contract
  exists for pickers over large datasets; an org chart renders a known hierarchy. Loading is
  chart-level (§7). If a lazy need materializes, the tree's contract ports over unchanged.
- **Multiple / checkbox selection** — §3.
- **Horizontal / left-to-right chart orientation** — the benchmark is top-down only too.
- **Drag-to-reorganize, node editing** — diagram-editor territory, not a §5 behavior.
- **Pan/pinch gestures on the scroller** — native scroll + zoom input cover it.
- **Export (PNG/SVG)** — the host owns persistence.
- **`ControlValueAccessor`** — repo convention (§3).
- **`aria-setsize`/`aria-posinset`** — group membership is unambiguous from the DOM nesting;
  AT derives set position without the redundant bookkeeping.

## 9. Verification plan (§2 contract, point 8 evidence)

- Unit spec (`ino-orgchart.spec.ts`): visible-row flatten vs. collapsed set; the full Arrow map
  (expand/descend, collapse/ascend, sibling clamp, disabled skip, Home/End); selection emit +
  re-activate deselect + `selectionMode='none'` inertness; zoom clamp; template projection;
  `aria-level`/`aria-expanded`/`aria-selected` wiring; empty state.
- Docs-page QA (QALead, the point-8 gate): 3 themes × dense/fluid screenshots, keyboard-only
  walkthrough (Tab → one stop → Arrow traversal per §5 map → Enter selects → Tab out),
  connector render at zoom 0.5/1/2, RTL mirror spot-check, SR spot-check on expand
  (`aria-expanded` flip) and select (`aria-selected` flip).
