# `<ino-treeselect>` — component spec

**Issue:** [INO-416](/INO/issues/INO-416) (INO-31 Phase B1, doc 26 §5 row `ino-treeselect`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Lineage — what's reused, what's built fresh, and the `ino-tree` dependency

Doc 26 §5 names `ino-tree` (Phase B3) as this component's dependency, and no
`web/src/app/components/tree` directory exists yet in this repo — B3 hasn't started. Blocking a
live Phase B1 ticket on an unstarted Phase B3 one would stall this row indefinitely, so the
tree-rendering core (flatten/expand/lazy-load/tri-state-checkbox) is built **self-contained** in
this component rather than deferred. **When `ino-tree` ships**, its flatten/expand/keyboard core
should be extracted into a shared primitive both components delegate to — the model here is
designed to make that extraction mechanical (the flatten/expand/checkbox-cascade logic below has
no combobox-specific state threaded through it).

What *is* reused:

- **Combobox trigger/overlay/`aria-activedescendant` core, in-panel filter, `Escape`/outside-click/
  `Tab`-closes-without-committing** — verbatim from `ino-select`
  (`web/src/app/components/select/ino-select.component.ts`). A tree-select is a combobox first;
  only its panel content (a tree instead of a flat list) differs.
- **`value: string | string[]` union + `valuesArray` normalization** — from `ino-listbox`
  (INO-414), which made the same single-component-not-two call for its own `multiple` flag.

What is **not** reused: row flattening and keyboard navigation. Neither `ino-select`'s nor
`ino-listbox`'s option list has to account for which rows are *visible* depending on expand state
— see §2.

---

## 2. Flattening model and the Arrow-key tree map

The panel's `role="tree"` only ever renders the flattened list of **currently visible** rows
(`InoTreeSelectRow[]`, computed in `recomputeRows()`) — a row for a collapsed branch's children
simply isn't in that array. `aria-activedescendant` points into this flattened list by absolute
index, same model `ino-select`'s own flat option list uses; real DOM focus never leaves the
trigger (or the in-panel filter input, when `filter` is on).

Each row carries `level` (`aria-level = level + 1`) and `parentValues` (root-first ancestor chain)
— the latter is `ArrowLeft`'s "move to parent" target, resolved by `setActiveByValue` rather than
a plain index arithmetic, because a parent's row index depends on how many rows its *other*
already-expanded siblings contributed above it.

| Key | Action |
|---|---|
| `ArrowDown`/`ArrowUp` | Move `aria-activedescendant` to the next/previous enabled visible row (clamped, no wrap) |
| `ArrowRight` | Collapsed branch with children → expand it (emits `loadChildren` if lazy and unloaded). Already-expanded branch → move to its first child (the next row). Leaf → no-op. |
| `ArrowLeft` | Expanded branch → collapse it. Otherwise → move to the parent row (leaf or already-collapsed branch). |
| `Home`/`End` | Jump to the first/last enabled visible row |
| `Enter`/`Space` | Activate the row — see §3 for what "activate" means per `selectionMode` |
| `Escape` | Close without changing `value` |
| `Tab` | Close without changing `value`, without restoring focus to the trigger (same as `ino-select`) |

**Deliberate omission: no typeahead.** `ino-select`/`ino-listbox` both buffer printable characters
into a jump-to-match search. This component's `filter` box (default `true`) already covers
find-by-label, and a tree's typeahead would need to decide whether to search only *visible* rows
or the whole tree — an ambiguity the filter box sidesteps entirely by always searching the whole
(loaded) tree. Printable characters are ignored outside the filter input.

---

## 3. Selection modes: `single` / `multiple` / `checkbox`

One component, one `selectionMode` input, rather than three — the trigger/overlay/flatten core is
identical across all three; only what `Enter`/`Space`/click *does* to `value` changes:

- **`single`** — `value: string`. Activating a row (branch or leaf) replaces `value` and closes
  the panel, matching `ino-select`'s select-and-close model.
- **`multiple`** — `value: string[]`. Activating a row toggles *only that node's* membership — no
  cascade to descendants or ancestors. Reuses `ino-listbox`'s toggle-without-closing model
  verbatim. A selected branch and an unselected child can coexist; this mode treats the tree as a
  flat set of independently toggleable rows that happen to be nested for display.
- **`checkbox`** — `value: string[]`, cascading. Activating a node toggles it **and every loaded
  descendant** together, then re-derives every ancestor from that node up to the root (see §4).
  Doc 26 §5's "partial-checked" state belongs to this mode only.

`isSelected()`/`isPartial()` branch on `selectionMode` rather than existing as separate components
— the branch is small (one ternary's worth) and the alternative (three components) would
re-duplicate the entire flatten/keyboard core three times.

---

## 4. Checkbox tri-state: what `value` stores, and what's purely derived

`value` in `checkbox` mode stores **only fully-resolved membership** — a node's own value is in the
array iff (a) it was explicitly checked and has no children, or (b) every one of its loaded
children is itself a member. There is no way to represent "this branch is checked independent of
its children" — the data model doesn't support it, so `recomputeAncestors()` never writes that
state.

**Partial is a render-time derivation, never stored.** `isPartial(node)` is true iff `node` is
*not* a member of `value`, has loaded children, and at least one descendant *is* a member. This
means toggling a node is always a two-step write — (1) add/remove `node` + all loaded descendants,
(2) walk from `node`'s parent to the root, adding a parent to `value` only if *all* its children
are now members, removing it otherwise.

**Unloaded (lazy) descendants are simply not in the cascade.** Checking a lazy branch before its
children have loaded checks only the branch's own value; once `loadChildren` resolves and the
caller pushes the populated `children` back in, the branch's checked value does **not**
retroactively check the newly-arrived children — a caller that wants "check branch ⇒ check
everything under it, including what loads later" must re-apply the cascade itself on the
`loadChildren` response. This is a conscious scope cut, not an oversight: resolving it generically
would require this component to track "pending cascade" state across an arbitrary-length async
gap, which no other component in this repo's async-datasource convention (`ino-autocomplete`'s
`search`, this component's own `loadChildren`) does.

---

## 5. States

Beyond the §2 standard set (default/hover/focus-visible/active/disabled/readonly/invalid/loading/
empty), doc 26 §5 names two additional states:

- **`partial-checked`** (`checkbox` mode only) — see §4. Rendered via `aria-checked="mixed"` plus
  the native checkbox's `indeterminate` DOM property (bound, not an attribute — there is no HTML
  attribute for it).
- **`loading branch`** — a per-*node* flag (`InoTreeSelectNode.loading`), not a component-level
  input. While `true`, that row's expand chevron is replaced with a small spinner and its toggle
  button is disabled; every other row stays fully interactive. This is distinct from the
  component-level `loading` input (§ below), which mirrors `ino-autocomplete`'s contract: suppress
  committing a selection while an unrelated async operation is in flight, panel/filter stay live.

---

## 6. Filter: whole-(loaded-)tree search, auto-expand on match

The in-panel filter box (default `true` — doc 26 §5 lists it as baseline structure, same call
`ino-listbox` makes) searches every **loaded** node's label, not just visible rows — a collapsed
branch's loaded-but-hidden children are searchable; an unloaded lazy branch's children are not
(§4's "only loaded nodes" limitation, mirrored here).

A branch survives filtering if its own label matches or any descendant's does; every surviving
branch is rendered **force-expanded** for the duration of the query (`flattenInto`'s `forceExpand`
parameter) without touching `expandedValues` — clearing the filter restores whatever the user had
actually expanded before, rather than leaving every matched branch open.

---

## 7. Mobile: sheet variant, self-contained (no `ino-tree` to port either)

Doc 26 §5 calls for "web-first, mobile sheet variant." Both mobile ports
(`mobile/react-native/src/components/InoTreeSelect.tsx`,
`mobile/flutter/lib/widgets/ino_treeselect.dart`) follow `ino-listbox`'s mobile precedent
structurally — a trigger that opens a near-full-height modal sheet — with the sheet's content
being a flattened, indented row list (same flatten model as §2, ported) instead of a flat
`FlatList`/`ListView.builder`. Single-selection closes the sheet on row tap; `multiple`/`checkbox`
keep it open across taps.

**Not ported**: `ArrowRight`/`ArrowLeft` keyboard nav (no hardware keyboard on the target form
factor — tapping the chevron is the only way to expand/collapse) and lazy-load's `loadChildren`
hook is kept as a plain callback prop, same shape as the web `@Output`.
