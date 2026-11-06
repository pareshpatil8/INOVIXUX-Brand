# `<ino-treeselect>` — TreeSelect

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-treeselect` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/treeselect.html`](previews/treeselect.html).
> Decisions record: `web/src/app/components/treeselect/SPEC.md`.

A combobox trigger that opens a `role="tree"` panel — single, multiple, or cascading-checkbox
selection over a hierarchical `nodes` tree, with lazy children, an in-panel filter that searches
the whole loaded tree, and Arrow-key tree navigation.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` via `ino-label` |
| `nodes` | `InoTreeSelectNode[]` | `[]` | `{ label, value, children?, hasChildren?, loading?, disabled? }` |
| `value` | `string \| string[]` | `''` | Banana-in-a-box with `valueChange`; `string` for `'single'`, `string[]` for `'multiple'`/`'checkbox'` |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox'` | `'single'` | See SPEC.md §3 |
| `placeholder` | `string` | `'Select…'` | Trigger text while nothing is selected |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the shared control-size scale |
| `required` | `boolean` | `false` | Decorative `*` marker via `ino-label` |
| `disabled` | `boolean` | `false` | Trigger removed from the focus order |
| `readonly` | `boolean` | `false` | Trigger stays focusable; the panel cannot be opened |
| `loading` | `boolean` | `false` | Component-level async flag — spinner + `aria-busy`; suppresses *committing* a selection while the panel/filter stay live. Distinct from a per-node `loading` (lazy children fetch) |
| `filter` | `boolean` | `true` | In-panel search box, baseline structure per doc 26 §5 (same call `ino-listbox` makes) |
| `filterLabel` | `string` | `'Filter'` | `aria-label` on the filter input |
| `filterPlaceholder` | `string` | `'Filter…'` | Placeholder text on the filter input |

`valueChange: EventEmitter<string | string[]>` fires on every selection/toggle.
`filterChange: EventEmitter<string>` fires on every filter keystroke.
`openChange: EventEmitter<boolean>` fires when the panel opens/closes.
`loadChildren: EventEmitter<InoTreeSelectNode>` fires when a lazy node (`hasChildren: true`, no
loaded `children`) is expanded — the hook a parent uses to fetch and push children back in via a
new `nodes` array (SPEC.md §1/§4).

### Selection modes

```html
<ino-treeselect label="Department" [nodes]="orgChart" [(value)]="department" />

<ino-treeselect label="Tags" selectionMode="multiple" [nodes]="tagTree" [(value)]="tags" />

<ino-treeselect label="Permissions" selectionMode="checkbox" [nodes]="permissionTree" [(value)]="grantedPermissions" />
```

`'checkbox'` cascades: checking a branch checks every *loaded* descendant; an ancestor is added to
`value` only once *all* of its loaded children are members, and removed the moment any child isn't
— see SPEC.md §4 for the full rule, including what happens with still-unloaded lazy descendants.

### Lazy children

```html
<ino-treeselect label="Files" [nodes]="fileTree" [(value)]="selectedPath" (loadChildren)="fetchChildren($event)" />
```

```ts
fetchChildren(node: InoTreeSelectNode) {
  node.loading = true; // renders the "loading branch" state on this row
  this.fileService.listChildren(node.value).subscribe((children) => {
    node.loading = false;
    node.children = children;
    this.fileTree = [...this.fileTree]; // new reference — same async-datasource contract as ino-autocomplete's `search`
  });
}
```

### Size and density

`size` reads the same three control-size aliases every other Tier-1 form control uses. Row
indentation per tree level is a fixed token step (`--ino-treeselect-indent`, defaults to
`--ino-space-6`) independent of `size` — depth, not density, drives indent.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered combobox trigger, `surface-sunken` fill |
| Hover | `:hover` on the trigger or a row | Border/background → muted/sunken |
| Focus-visible | `:focus-visible` on the trigger or filter input | `--ino-focus-ring` |
| Active/pressed | `:active` on the trigger | Border → `accent-active` |
| Disabled | `disabled` input | `opacity: 0.5`, trigger removed from focus order |
| Readonly | `readonly` input | Trigger stays focusable; the panel cannot be opened |
| Invalid | `error` input set | `aria-invalid="true"`, `role="alert"` message below the field |
| Loading/busy (component) | `loading` input set | Spinner on the trigger, `aria-busy="true"`; commit suppressed, panel/filter stay live |
| Empty | No matches for a non-empty filter query | "No matches." message replaces the tree |
| **Partial-checked** | `checkbox` mode; a branch with some but not all loaded descendants checked | `aria-checked="mixed"` + native `indeterminate` on the row's checkbox |
| **Loading branch** | A node's own `loading` flag is `true` | That row's expand chevron is replaced by a spinner; its toggle is disabled — every other row stays interactive |

`partial-checked`/`loading branch` are this component's two states beyond the §2 standard set
(doc 26 §5).

---

## Motion

Panel open/close and chevron rotation use `--ino-motion-duration-fast`/
`--ino-motion-easing-standard`/`-decelerate`; every spinner (component-level and per-node) collapses
under `prefers-reduced-motion: reduce`.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf. A second, independent label (`filterLabel`)
names the in-panel filter box via `aria-label` — same convention `ino-select`'s in-panel filter
uses. `hint`/`error` render below the field, `error` winning when both are set.

---

## Accessibility contract

**Role / ARIA** — `role="combobox"` trigger (`aria-haspopup="tree"`, `aria-expanded`,
`aria-controls` pointing at the tree), opening a `role="tree"` panel. Each row is `role="treeitem"`
with `aria-level` (1-based depth) and, when it has children, `aria-expanded`. `'single'`/`'multiple'`
modes set `aria-selected`; `'checkbox'` mode sets `aria-checked` (`"true"`/`"false"`/`"mixed"`)
instead and `aria-multiselectable="true"` on the tree root. `aria-activedescendant` tracks the
active row by id, same model `ino-select` uses — real DOM focus never leaves the trigger (or the
filter input, when `filter` is on).

**Keyboard** — see SPEC.md §2 for the full table; summary:

| Key | Action |
|---|---|
| `ArrowDown`/`ArrowUp` | Move the active row (clamped, no wrap) |
| `ArrowRight` | Expand a collapsed branch, or move into its first child if already expanded |
| `ArrowLeft` | Collapse an expanded branch, or move to its parent |
| `Home`/`End` | Jump to the first/last visible row |
| `Enter`/`Space` | Activate the row (select/toggle/check depending on `selectionMode`) |
| `Escape` | Close without changing `value` |
| `Tab` | Close without changing `value` |

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and empty/muted message colors
are existing audited roles (`check-theme-parity.mjs`), not new values, across all 3 themes.

**Target size** — the trigger and every row clear `min-block-size: var(--ino-control-height)` /
`var(--ino-target-comfortable)` at every size rung; the expand toggle is `var(--ino-target-min)`.

**RTL** — logical properties only (`inline-size`, `padding-inline-*`, `inset-inline-*`); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **No typeahead.** The always-available `filter` box already covers find-by-label across the
  whole loaded tree; a tree's typeahead would have to decide whether to search only visible rows,
  an ambiguity the filter box sidesteps. See SPEC.md §2.
- **No `ino-tree` delegation (yet).** Doc 26 §5 names `ino-tree` (Phase B3, not built) as this
  component's dependency. The tree-rendering core is self-contained here rather than blocked on an
  unstarted phase; SPEC.md §1 records the intended refactor once `ino-tree` ships.
- **Checking a lazy branch does not retroactively cascade to children that load afterward.** See
  SPEC.md §4 for why, and what a caller that wants that behavior has to do instead.
- **No virtual scrolling.** Doc 26 §5's row doesn't call for it, and lazy loading already bounds
  how much of a large tree is ever materialized at once.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoTreeSelect.tsx`. Trigger-plus-modal-
  sheet (same structure as `InoListbox`'s mobile port), sheet content is a flattened, indented row
  list. Single-selection closes on tap; `multiple`/`checkbox` keep the sheet open.
- **Flutter** — `mobile/flutter/lib/widgets/ino_treeselect.dart`. Same trigger-plus-
  `showModalBottomSheet` structure. `ArrowRight`/`ArrowLeft` keyboard nav is not ported (tapping
  the chevron is the only expand/collapse affordance on a touch device) — see SPEC.md §7.
