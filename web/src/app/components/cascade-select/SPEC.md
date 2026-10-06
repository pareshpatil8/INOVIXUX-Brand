# `<ino-cascade-select>` — component spec

**Issue:** [INO-422](/INO/issues/INO-422) (INO-31 Phase B1, doc 26 §5 row `ino-cascade-select`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Lineage — combobox core reused, panel shape is new

The trigger/overlay/combobox core — `role="combobox"`, `aria-activedescendant`, open/close,
document-click-outside, typeahead, `Home`/`End`/`Escape`/`Tab` — is copied verbatim from
`ino-select` (`web/src/app/components/select/ino-select.component.ts`). What's new is the shape of
the popup: instead of one flat `role="listbox"` of options, it is **exactly one level of the
option tree at a time**, replaced in place as the user drills in (`ArrowRight`/click on a parent
option) or goes back (`ArrowLeft`/click the back button or a breadcrumb item), with a breadcrumb
trail above the list recording the path taken.

**Why replace-in-place, not a cascading flyout of simultaneous panels** (which is what PrimeNG's
own `CascadeSelect` renders, and what "cascade" suggests): doc 26 §5's own mobile disposition for
this row is "stacked sheet pages" — the mobile port has to render this exact navigation as a
sequence of full-screen pages with a back button, because there is no room on a phone for two
panels open side by side. Building the web popup as a single replaced level, not N simultaneous
flyouts, means the web and mobile navigation models are the *same* state machine (a path array plus
"what's showing now"); a flyout-of-panels web implementation would have had to be collapsed into a
completely different model for the mobile port instead of sharing one.

---

## 2. Selection model: only leaves are values

A parent option (one with a non-empty `children` array) is a **drill target**, never a selectable
value — activating it (click, `Enter`, `Space`, `ArrowRight`) pushes it onto the breadcrumb `path`
and shows its children. Only a leaf option (no `children`) can become `value`.

This mirrors how every real use of a cascading select in this product works (country → state →
city; category → subcategory → SKU) — the leaf is the only meaningful value, and the parent levels
exist purely to narrow the search. Allowing an intermediate node to "count" as a value would make
`value` ambiguous (is `"asia"` a final answer, or a user who didn't finish drilling?) for no
product benefit, so `selectOption()` and the template's `isSelected()` both hard-require
`!hasChildren(option)`.

---

## 3. Breadcrumb trail is `path`, not a flattened chosen-value

Doc 26 §5 calls for "breadcrumb of chosen path" as structure. Two different things could be meant:
the path of ancestors *navigated* to reach the currently-displayed level (`path`), or the path of
ancestors of the *committed* `value` (`selectedPath`, a tree search by value). This component keeps
both, deliberately distinct:

- `path` drives the in-panel breadcrumb bar — it's navigation state, resets to `[]` every time the
  panel opens or closes, and has nothing to do with `value` until a leaf is actually activated.
- `selectedPath` (a getter, DFS over `options`) drives `selectedLabel`, the trigger's display text
  — "Asia / India / Maharashtra" — joining every ancestor's label down to the selected leaf. It is
  derived from `value` on every read, not cached, because these trees are small
  (geographic/categorical hierarchies, not virtual-scroller-scale lists).

Reopening the panel always starts at root (`path = []`) rather than resuming mid-tree — simpler
mental model for a component whose whole point is "explore the tree" — but seeds `activeIndex` on
the root-level ancestor of the current selection when one exists, so a sighted keyboard user who
reopens to change their answer doesn't have to re-scan the root level to find where they were.

---

## 4. Keyboard map

| Key | Effect |
|---|---|
| `ArrowDown` / `ArrowUp` | Move the active pointer within the **current level** (clamped, no wrap) |
| `ArrowRight` | If the active row has children: drill in (same as clicking it) |
| `ArrowLeft` | If not at root: go back one level (same as the back button) |
| `Home` / `End` | Jump to the first/last enabled row in the current level |
| `Enter` / `Space` | Activate the active row — drills in (parent) or selects + closes (leaf) |
| Printable character | Typeahead within the current level only (500 ms reset window) |
| `Escape` | Close the panel entirely (does not step back a level first) |
| `Tab` | Close without restoring focus to the trigger (focus is already moving on) |

`Escape` closing fully rather than stepping back one level keeps this component's `Escape`
contract identical to every other Tier-1 combobox's (`ino-select`, `ino-autocomplete`) —
`ArrowLeft` and the back button are the dedicated "go back" affordances, so `Escape` doesn't need a
second job.

---

## 5. States: `open-level` / `loading`

Beyond the §2 standard state set (default/hover/focus-visible/active/disabled/readonly/invalid),
doc 26 §5 calls out two states specific to this component:

- **`open-level`** (`.ino-cascade-select--level-open` host class, `open && path.length > 0`) — the
  panel is open and showing a drilled-in level, not the root. Styling hook for the breadcrumb bar,
  which itself only renders under this same condition (`*ngIf="path.length"`).
- **`loading`** — same contract as every other Tier-1 control's `loading` input: spinner,
  `aria-busy="true"` on the trigger, all interaction ignored while true. This component does not
  implement an async per-level children loader (e.g. `loadChildren($event)`) — the full `options`
  tree is a synchronous `@Input()`, same as `ino-select`/`ino-listbox`. Doc 26 §5 names "loading"
  as a state, not an async-loading *feature*; a lazy-children API is a natural follow-up but out of
  scope for this row (no other Tier-1 selection control in this phase has one either).

---

## 6. Sizing and labels

`size: 'sm' | 'default' | 'lg'` reads the same three control-size aliases every other Tier-1
control uses. `label`/`required`/`hint`/`error` render through the shared `ino-label` leaf and the
same hint/error paragraph pair as `ino-select`/`ino-listbox` — the full label set doc 26 §5 calls
for, nothing component-specific.

---

## 7. Mobile: stacked sheet pages, not a sheet-wrapped flat list

Doc 26 §5: "mobile = stacked sheet pages." Because the web popup and the navigation state machine
are already "one level, plus a path," the mobile port needs no separate model — it's the same
`path`/`currentOptions`/drill-in/go-back state, rendered as a full-screen modal sheet whose header
shows a back chevron (hidden at root) and the current level's breadcrumb trail as the page title,
instead of an anchored popover under the trigger (same anchored-popover-doesn't-work-on-phones
rationale `InoSelect`'s own port documents). Tapping a parent row pushes a new "page" (replaces the
sheet's content state, no actual route/screen stack); tapping a leaf selects and dismisses the
sheet, matching `InoSelect`'s close-on-select.

**Flutter** (`mobile/flutter/lib/widgets/ino_cascade_select.dart`) and **React Native**
(`mobile/react-native/src/components/InoCascadeSelect.tsx`) both port: drill-in/go-back
navigation, disabled rows, leaf-only selection, and sm/md/lg sizing on the trigger. **Not
ported**: custom option templates (`#optionTemplate`) and virtual scrolling — same omissions
`InoSelect`'s own port documents, for the same reason (no shared build graph; cascading option
trees in this product are shallow and short enough per level that a plain list primitive is
sufficient).
