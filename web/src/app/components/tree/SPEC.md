# `<ino-tree>` — component spec

**Issue:** [INO-450](/INO/issues/INO-450) (INO-31 Phase B3, doc 26 §5 row `ino-tree`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Lineage — what's reused, what's different from `ino-treeselect`

[INO-416](/INO/issues/INO-416)'s `ino-treeselect` SPEC.md §1 flagged this exact extraction as its
intended follow-up: "When `ino-tree` ships, its flatten/expand/keyboard core should be extracted
into a shared primitive both components delegate to." `ino-tree` is that extraction — the
flatten/expand/lazy-load/checkbox-cascade core below is ported from
`ino-treeselect.component.ts` largely unchanged.

What's **different**, because a tree view is never collapsed behind a trigger the way a
tree-*select* is:

- **Always-visible `role="tree"`**, reusing `ino-listbox`'s (INO-414) roving-`tabindex` core
  instead of `ino-treeselect`'s combobox-trigger + `aria-activedescendant` model. Real DOM focus
  moves between `role="treeitem"` rows; exactly one carries `tabindex="0"` at a time. There is no
  overlay, no open/closed state, and no `Escape`/`Tab`-closes-without-committing behavior to
  replicate.
- **`selectionMode: 'basic' | 'checkbox'`** instead of `ino-treeselect`'s
  `'single' | 'multiple' | 'checkbox'`. `'basic'` + the separate `multiple` flag (reused verbatim
  from `ino-listbox`) covers what `'single'`/`'multiple'` meant there — see §3.
- **Drag-reorder is explicitly out of scope** (doc 26 §5 row), unlike nothing `ino-treeselect`
  needed to exclude.

What's reused verbatim: the flatten-into-visible-rows algorithm, the lazy-load (`hasChildren`/
`loading`/`loadChildren`) contract, the checkbox tri-state cascade/ancestor-recompute rule, and the
always-visible filter box. See §2–§6.

---

## 2. Flattening model, Arrow-key map, and size API

`rows` (`InoTreeRow[]`, computed in `recomputeRows()`) is the flattened list of **currently
visible** rows — a collapsed branch's children simply aren't in it. `aria-level` is `level + 1`;
`parentValues` is the root-first ancestor chain, used by `ArrowLeft`'s "move to parent" target
(`setActiveByValue`, not index arithmetic, because a parent's row index depends on how many rows
its other already-expanded siblings contributed above it).

| Key | Action |
|---|---|
| `ArrowDown`/`ArrowUp` | Move the roving tab stop to the next/previous enabled visible row (clamped, no wrap) |
| `ArrowRight` | Collapsed branch with children → expand it (emits `loadChildren` if lazy and unloaded). Already-expanded branch → move to its first child. Leaf → no-op. |
| `ArrowLeft` | Expanded branch → collapse it. Otherwise → move to the parent row. |
| `Home`/`End` | Jump to the first/last enabled visible row |
| `Enter`/`Space` | Activate the row — see §3 for what "activate" means per `selectionMode` |

**Size API — `compact`/`comfortable`, not `sm`/`default`/`lg`.** Doc 26 §5 names this axis
"compact/comfortable", the same bare-alias idiom `<ino-accordion>`/`<ino-fieldset>` use, not the
three-value control-size scale. `size="compact"` redirects
`--ino-control-padding-inline-roomy` to its `-sm` token; because `tokens.css` §10/§12 redefines that
token per `[data-density]`, dense/fluid composes for free with no branch in this component.

---

## 3. Value shape and selection modes

`value: string | string[]` — `string` when `selectionMode: 'basic'` and `multiple: false`
(the default); `string[]` for `multiple` `'basic'`, or any `'checkbox'` mode. Plain `@Input`/
`@Output` banana-in-a-box, no `ControlValueAccessor`, matching every other Tier-1 form control in
this repo.

- **`'basic'`, not `multiple`** — activating a row replaces `value` with that row's value. No
  cascade to descendants or ancestors.
- **`'basic'`, `multiple: true`** — activating a row toggles its membership in `value` without
  touching any other row's membership. Reuses `ino-listbox`'s own `multiple` flag rather than
  inventing a third `selectionMode` the doc 26 §5 row never names.
- **`'checkbox'`** — always multi. Checking/unchecking a node cascades to every *loaded*
  descendant, then re-derives every ancestor from that node up to the root.

**Checkbox tri-state: what `value` stores, what's purely derived.** An ancestor is a member of
`value` iff *every one* of its loaded children is currently a member — never written as a lone
"this parent is checked" entry independent of its children. "Partial" (`isPartial()`, rendered as
`aria-checked="mixed"`) is computed from that rule on render, never stored. The cascade write
itself ignores a descendant's own `disabled` flag (same as `ino-treeselect`'s cascade) — `disabled`
only blocks *interactive* activation of that row, not the recursive subtree write a different row's
activation triggers.

---

## 4. Lazy load contract

A node with `hasChildren: true` and an empty/undefined `children` renders the expand affordance
anyway. Expanding it emits `loadChildren` with that node; the parent answers by pushing a *new*
`nodes` array back in with that node's `children` populated. Plain `@Input`/`@Output`, no
Observable baked in — the same async-datasource contract `ino-treeselect`'s own `loadChildren`
documents, itself matching `ino-autocomplete`'s `search`.

While a fetch for a given node is in flight, the parent sets that node's `loading: true` — renders
a spinner in place of the expand chevron for that row specifically (see §5 for how this differs
from the component-level `loading` flag).

---

## 5. States

Doc 26 §5 names `expanded`, `partial-checked`, and `loading` on top of the standard set
(`disabled`, `readonly`, `required`, invalid via `error`).

- **`expanded`** — per-node, driven by `expandedValues`; see §2/§4.
- **`partial-checked`** — `'checkbox'` mode only, `aria-checked="mixed"`; see §3.
- **`loading` has two independent meanings, both named `loading` but at different scopes:**
  - **Component-level** (`@Input loading`) — suppresses *committing* a selection while an unrelated
    fetch is in flight; the tree stays rendered and interactive-looking, `aria-busy="true"` on the
    `role="tree"` element.
  - **Per-node** (`node.loading`) — a specific lazy branch's children fetch is in flight; replaces
    that row's expand chevron with a spinner (§4). Not reflected in `aria-busy`.

`disabled`/`readonly` block all interaction (click and keyboard) identically to every other Tier-1
form control; `required`/`error` render through `<ino-label>`/the hint-or-error paragraph exactly
as `ino-select`/`ino-listbox` do.

---

## 6. Filter: whole-(loaded-)tree search, auto-expand on match

Doc 26 §5 names "filter" as baseline structure, not an opt-in extra — the same call `ino-listbox`
makes for its own filter box, so `filter` defaults to `true`. The box sits above the tree (always
visible, unlike `ino-treeselect`'s in-panel filter which only exists while its overlay is open) and
searches the whole *loaded* tree, not just currently-visible rows — a collapsed lazy branch whose
children were never fetched can't match, by construction.

A branch survives the filter if its own label matches or any descendant does; surviving branches
are forced open (`forceExpand`) so the match is visible without the user expanding anything. This
does not touch `expandedValues`, so clearing the filter restores whatever was expanded before
filtering started. `ArrowDown` from the filter input moves real focus into the tree, matching
`ino-listbox.onFilterKeydown`'s rationale for the same transition.

**Deliberate omission: no typeahead.** Same rationale as `ino-treeselect` §2: the filter box
already covers find-by-label, and a tree's typeahead would need to decide whether to search only
visible rows or the whole tree — an ambiguity the filter box sidesteps by always searching the
whole loaded tree.

---

## 7. Mobile

Doc 26 §5: web-first; mobile renders the same data as a nested list pattern rather than porting
this component's roving-`tabindex`/`role="tree"` model 1:1. No native mobile port is scoped under
this ticket.
