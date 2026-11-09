# `<ino-tree>` — Tree

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B3 row
> `ino-tree` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Decisions record: `web/src/app/components/tree/SPEC.md`.

An always-visible `role="tree"` — basic or cascading-checkbox selection over a hierarchical
`nodes` tree, with lazy children, an always-visible filter that searches the whole loaded tree,
and roving-tabindex Arrow-key navigation. Unlike `<ino-treeselect>`, the tree is never collapsed
behind a trigger: real DOM focus moves between rows directly.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` via `ino-label` |
| `nodes` | `InoTreeNode[]` | `[]` | `{ label, value, children?, hasChildren?, loading?, disabled? }` |
| `value` | `string \| string[]` | `''` | Banana-in-a-box with `valueChange`; `string` for `'basic'` + not `multiple`, `string[]` otherwise |
| `selectionMode` | `'basic' \| 'checkbox'` | `'basic'` | See SPEC.md §3 |
| `multiple` | `boolean` | `false` | `'basic'` mode only — toggle-without-replacing membership. No effect in `'checkbox'` (always multi) |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + a `role="alert"` message |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Doc 26 §5's own axis — not the sm/default/lg control-size scale. See SPEC.md §2 |
| `required` | `boolean` | `false` | Decorative `*` marker via `ino-label` |
| `disabled` | `boolean` | `false` | Every row removed from the focus order |
| `readonly` | `boolean` | `false` | Rows stay focusable; activation is blocked |
| `loading` | `boolean` | `false` | Component-level async flag — `aria-busy="true"`; suppresses *committing* a selection. Distinct from a per-node `loading` (lazy children fetch) |
| `filter` | `boolean` | `true` | Always-visible search box, baseline structure per doc 26 §5 (same call `ino-listbox` makes) |
| `filterLabel` | `string` | `'Filter'` | `aria-label` on the filter input |
| `filterPlaceholder` | `string` | `'Filter…'` | Placeholder text on the filter input |

`valueChange: EventEmitter<string | string[]>` fires on every selection/toggle.
`filterChange: EventEmitter<string>` fires on every filter keystroke.
`loadChildren: EventEmitter<InoTreeNode>` fires when a lazy node (`hasChildren: true`, no loaded
`children`) is expanded — the hook a parent uses to fetch and push children back in via a new
`nodes` array (SPEC.md §1/§4).

### Selection modes

```html
<ino-tree label="Org chart" [nodes]="orgChart" [(value)]="selectedId" />

<ino-tree label="Favorites" [nodes]="orgChart" multiple [(value)]="favoriteIds" />

<ino-tree label="Permissions" selectionMode="checkbox" [nodes]="permissionTree" [(value)]="grantedPermissions" />
```

`'checkbox'` cascades: checking a branch checks every *loaded* descendant; an ancestor is added to
`value` only once *all* of its loaded children are members, and removed the moment any child
isn't — see SPEC.md §3 for the full rule.

### Lazy children

```html
<ino-tree label="Files" [nodes]="fileTree" [(value)]="selectedPath" (loadChildren)="fetchChildren($event)" />
```

```ts
fetchChildren(node: InoTreeNode) {
  node.loading = true; // renders the "loading branch" state on this row
  this.fileService.listChildren(node.value).subscribe((children) => {
    node.loading = false;
    node.children = children;
    this.fileTree = [...this.fileTree]; // new reference — same async-datasource contract as ino-autocomplete's `search`
  });
}
```

### Size and density

`size` is a two-value padding axis (`compact`/`comfortable`), independent of `[data-density]` —
dense/fluid composes for free because `tokens.css` redefines the underlying padding token per
density. Row indentation per tree level is a fixed token step (`--ino-tree-indent`, defaults to
`--ino-space-6`) independent of `size` — depth, not density or size, drives indent.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered tree shell, `surface-sunken` fill |
| Hover | `:hover` on a row | Background → raised, inset outline |
| Focus-visible | `:focus-visible` on a row or the filter input | `--ino-focus-ring` |
| Disabled | `disabled` input | `opacity: 0.5`, every row removed from the focus order |
| Readonly | `readonly` input | Rows stay focusable; activation is blocked |
| Invalid | `error` input set | `aria-invalid="true"`, `role="alert"` message below the field |
| Loading/busy (component) | `loading` input set | Spinner on the field, `aria-busy="true"`; commit suppressed, tree/filter stay live |
| Empty | No matches for a non-empty filter query | "No matches." message replaces the tree |
| **Expanded** | A branch's row toggled open | `aria-expanded="true"`, children rows rendered |
| **Partial-checked** | `checkbox` mode; a branch with some but not all loaded descendants checked | `aria-checked="mixed"` + native `indeterminate` on the row's checkbox |
| **Loading branch** | A node's own `loading` flag is `true` | That row's expand chevron is replaced by a spinner; its toggle is disabled — every other row stays interactive |

`expanded`, `partial-checked`, and `loading` (branch) are doc 26 §5's three states beyond the §2
standard set.

---

## Motion

Chevron rotation and both spinner kinds (component-level and per-node) use
`--ino-motion-duration-fast`/`-slow` and collapse under `prefers-reduced-motion: reduce`.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf. A second, independent label (`filterLabel`)
names the filter box via `aria-label` — same convention `ino-select`'s/`ino-listbox`'s filter
boxes use. `hint`/`error` render below the field, `error` winning when both are set.

---

## Accessibility contract

**Role / ARIA** — always-rendered `role="tree"` (`aria-label`, `aria-multiselectable` when
`checkbox` or `multiple`, `aria-busy`, `aria-invalid`, `aria-describedby`). Each row is
`role="treeitem"` with `aria-level` (1-based depth) and, when it has children, `aria-expanded`.
`'basic'` mode sets `aria-selected`; `'checkbox'` mode sets `aria-checked`
(`"true"`/`"false"`/`"mixed"`) instead. Roving `tabindex` — exactly one row carries `tabindex="0"`
at a time; `aria-activedescendant` is never used, because real DOM focus is always on a row (or the
filter input).

**Keyboard** — see SPEC.md §2 for the full table; summary:

| Key | Action |
|---|---|
| `ArrowDown`/`ArrowUp` | Move the roving tab stop to the next/previous enabled row (clamped, no wrap) |
| `ArrowRight` | Expand a collapsed branch, or move into its first child if already expanded |
| `ArrowLeft` | Collapse an expanded branch, or move to its parent |
| `Home`/`End` | Jump to the first/last visible row |
| `Enter`/`Space` | Activate the row (select/toggle/check depending on `selectionMode`) |

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and empty/muted message colors
are existing audited roles (`check-theme-parity.mjs`), not new values, across all 3 themes.

**Target size** — every row clears `min-block-size: var(--ino-target-comfortable)`; the expand
toggle is `var(--ino-target-min)`.

**RTL** — logical properties only (`inline-size`, `padding-inline-*`, `inset-inline-*`); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **No typeahead.** The always-available `filter` box already covers find-by-label across the
  whole loaded tree; a tree's typeahead would have to decide whether to search only visible rows,
  an ambiguity the filter box sidesteps. See SPEC.md §6.
- **No drag-reorder.** Explicitly out of scope per the doc 26 §5 row.
- **Checking a lazy branch does not retroactively cascade to children that load afterward.** See
  SPEC.md §3 for why, and what a caller that wants that behavior has to do instead.
- **No virtual scrolling.** Doc 26 §5's row doesn't call for it, and lazy loading already bounds
  how much of a large tree is ever materialized at once.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native / Flutter** — no dedicated port. Doc 26 §5 names mobile as web-first for this
  component: native apps render the same hierarchical data as a plain nested/indented list rather
  than this component's roving-tabindex `role="tree"` model. See SPEC.md §7.
