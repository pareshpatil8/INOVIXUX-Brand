# `<ino-orgchart>` — Organization chart

> **Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row
> "ino-orgchart" (rev-2 amendment `a21a93c`).
> **Board approval:** `f55baa72` on INO-377.
> **Issue:** INO-477 (INO-31 Phase B5).
> **Parity benchmark:** PrimeNG 22.1.1 `OrganizationChart`. PrimeNG is a benchmark, **not a
> runtime dependency**; nothing here imports it.
> **Decisions record:** `web/src/app/components/orgchart/SPEC.md`.

A top-down organization chart: a tree rendered as nested node cards joined by CSS connectors,
with collapsible subtrees, opt-in single selection, custom node templates, and a `zoom` axis that
scales the whole chart — layout, text and connectors together. The traversal model, roving
tabindex and ARIA contract are `<ino-tree>`'s, rotated 90° for the top-down geometry.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Chart label above the chart, wired via `aria-labelledby` |
| `ariaLabel` | `string` | `''` | Accessible-name fallback when no visible `label` is rendered |
| `value` | `InoOrgChartNode \| null` | `null` | Root node; `null` renders the empty state |
| `selectionMode` | `'none' \| 'single'` | `'none'` | `'none'`: pure visualization. `'single'`: nodes select by `node.value` |
| `selected` / `(selectedChange)` | `string` | `''` | Selected `node.value`; banana-in-a-box, no `ControlValueAccessor` (repo convention) |
| `zoom` | `number` | `1` | Clamped to `[0.5, 2]`; scales the whole chart via `font-size` — layout reflows, no `transform` blur |
| `collapsible` | `boolean` | `true` | `false` removes the expand/collapse togglers (static chart) |
| `loading` | `boolean` | `false` | Chart-level: `aria-busy`, spinner overlay, interaction suppressed |
| `disabled` | `boolean` | `false` | Whole chart non-interactive, out of the tab order |

`InoOrgChartNode`: `{ label, value, sublabel?, children?, disabled?, data? }` — `data` is an
opaque bag for custom templates only; the component never reads it.

### Variants

- **Default nodes** — `label` + optional `sublabel` (name + role), centered in a bordered card.
- **Node templates** — project one `<ng-template let-node>` and it renders *inside every card*
  with the node as context; the card chrome (selection, focus ring, connectors) stays with the
  component, so a custom template cannot break the a11y contract.
- **Expand/collapse subtrees** — branch cards grow a circular chevron toggler; subtrees start
  expanded (a chart's point is showing the structure). `collapsible="false"` for a static chart.
- **Selection** — `selectionMode="single"`: click or Enter/Space selects; activating the selected
  node again clears the selection (a chart selection is a highlight, not a form commitment).
- **Connectors** — drawn with CSS borders (half-rails + drop stubs), colored
  `--ino-color-border`; they reflow with zoom, density, wrapping and RTL because they are layout,
  not SVG overlays.

### Structure (anatomy)

```
ino-orgchart
├── .ino-orgchart__label        chart label (id ← aria-labelledby)
└── .ino-orgchart__scroller     overflow container — wide charts scroll here, never the page
    └── ul.ino-orgchart__tree   role="tree"
        └── li.ino-orgchart__item           connector half-rails + drop stub (::before/::after)
            ├── .ino-orgchart__node         role="treeitem" — card: focus/selection chrome
            │   ├── .ino-orgchart__node-label / -sublabel   (or the projected template)
            ├── .ino-orgchart__toggle       chevron toggler (pointer affordance, not a tab stop)
            └── ul.ino-orgchart__children   role="group" + descent stub, recurses
```

### Sizing — zoom scales

The §5 sizing axis is `zoom`, not sm/md/lg: the chart surface sets
`font-size: calc(var(--ino-control-font-size) × zoom)` and every internal length — card padding,
gaps, connector runs, the toggler — is in `em`, so one declaration scales the entire chart
proportionally with real layout reflow (WCAG 1.4.4-friendly; no `transform: scale()` blur).
Density composes for free: `--ino-control-font-size` is a §12 token, so `[data-density="dense"]`
re-points the base the zoom multiplies. Wide charts scroll horizontally inside the component's
own scroller; keyboard traversal drags the viewport along via `scrollIntoView`.

## States

| State | Behavior |
|---|---|
| default | Node card: `--ino-color-surface-raised`, 1px `--ino-color-border`, `--ino-radius-md`, on the sunken scroller surface |
| hover | Selectable enabled cards lift the border to `--ino-color-on-surface-muted` |
| focus-visible | `--ino-focus-ring` on the node card; the toggler is deliberately not a tab stop |
| expanded / collapsed | Chevron toggler rotates; `aria-expanded` tracks it; collapsing hides the subtree and its connectors |
| selected | Card border → `--ino-color-accent`, label → `--ino-color-accent-text-safe` weight 600, `aria-selected="true"` |
| disabled (chart) | Opacity 0.5, every node out of the tab order, togglers disabled, `aria-disabled="true"` |
| disabled (node) | Text → `--ino-color-on-surface-subtle`, skipped by sibling traversal, not selectable; its subtree stays reachable |
| loading | `aria-busy="true"`, centered spinner overlay, selection/expand suppressed until it clears |
| empty | `value == null` → "No data." placeholder; the accessible name stays on the tree role |

## Labels

The chart label (`label`) renders above the scroller and names the tree via `aria-labelledby`;
`ariaLabel` covers label-less instances. Node labels wrap inside the card
(`overflow-wrap: anywhere`, `max-inline-size: 14em`) rather than stretching the chart; the
sublabel renders one size down in `--ino-color-on-surface-muted`. RTL: connector geometry is
logical-properties throughout, so sibling rows, trimmed edge rails and drop stubs mirror under
`dir="rtl"` with no direction overrides — spot-check demo on the docs page.

## Accessibility contract

**Roles / ARIA** — the chart is `role="tree"` (named by `aria-labelledby` → chart label, or
`aria-label`), nodes are `role="treeitem"` carrying `aria-level` (depth), `aria-expanded`
(branches only), `aria-selected` (only when `selectionMode="single"`), and `aria-disabled`.
Children nest in `ul[role="group"]`, so set membership is derivable from the DOM. `loading` sets
`aria-busy` on the tree. The chevron toggler is `aria-hidden` with `tabindex="-1"` — the
keyboard path to expand/collapse is the Arrow map, not the pointer affordance.

**Keyboard — documented Arrow traversal** (the APG tree pattern rotated for a top-down chart):
one tab stop (roving tabindex; real DOM focus moves between cards, `aria-activedescendant` is
never used). **ArrowDown** expands a collapsed branch, else moves to the first enabled child.
**ArrowUp** collapses an expanded branch, else moves to the parent. **ArrowLeft / ArrowRight**
move to the previous/next enabled sibling (clamped, no wrap). **Home / End** jump to the
first/last enabled sibling in the row. **Enter / Space** select and deselect
(`selectionMode="single"` only). Disabled nodes are skipped by traversal; focused nodes
`scrollIntoView` so wide charts keep the focus visible.

**SR announcements** — expanding/collapsing flips `aria-expanded`, selecting flips
`aria-selected`; both announce on the focused treeitem with no live region needed. The spinner is
presentational (`aria-hidden`) — `aria-busy` on the tree carries the loading state.

**Contrast** — every color is a role token: `--ino-color-border` connectors on the sunken
surface, `--ino-color-on-surface(-muted/-subtle)` text rungs, `--ino-color-accent` +
`--ino-color-accent-text-safe` (the AA-safe text split) for selection, `--ino-focus-ring` for
focus — in all 3 themes, both densities.

## Deliberate omissions

- **Mobile ports** — the §5 row is explicitly Web-only; no RN/Flutter disposition.
- **Lazy children / per-branch loading** — an org chart renders a known hierarchy; `loading` is
  chart-level. `ino-tree`'s `hasChildren`/`loadChildren` contract ports over unchanged if a lazy
  need ever materializes. (`SPEC.md` §8)
- **Multiple / checkbox selection** — the benchmark's multiple mode serves diagram-editing use
  cases the §5 row doesn't name; selection here is a single highlight.
- **readonly / invalid states** — not applicable to a visualization: there is no committed value
  to protect or validate (`selectionMode="none"` is the "readonly" of a chart).
- **Horizontal orientation, drag-to-reorganize, node editing, pan/pinch, PNG/SVG export** —
  diagram-editor territory; the benchmark is top-down-only too.
- **`aria-setsize`/`aria-posinset`** — group membership is unambiguous from the `role="group"`
  nesting; AT derives position without redundant bookkeeping.
- **`ControlValueAccessor`** — plain `selected`/`selectedChange` is the repo-wide forms
  convention.

## Mobile parity

**Web-only by spec.** The doc 26 §5 row's mobile disposition for `ino-orgchart` is "Web-only":
no React Native or Flutter port is planned, and none ships. An org chart is a desktop-idiom,
wide-canvas visualization (the doc 26 §0 assumption excludes desktop-idiom components from the
port set); on a phone the same data belongs in a drill-down list — `ino-tree`'s ports cover that
need if it materializes.
