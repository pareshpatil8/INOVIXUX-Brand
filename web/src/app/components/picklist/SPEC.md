# `<ino-picklist>` — component spec

**Issue:** [INO-456](/INO/issues/INO-456) (INO-31 Phase B3, doc 26 §5 row `ino-orderlist + ino-picklist`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

Pairs with `web/src/app/components/orderlist/SPEC.md` — one spec row, two components (single
list vs. dual list). Decisions shared verbatim between the two are cross-referenced below rather
than duplicated.

---

## 1. No drag-and-drop — same reasoning as `ino-orderlist`

See `web/src/app/components/orderlist/SPEC.md` §1 verbatim: buttons (visibly labelled: `To
<target label> →`, `All →`, `← All`, `← To <source label>`) plus `Alt+ArrowRight`/`Alt+ArrowLeft`
keyboard equivalents are the complete implementation; native HTML5 DnD is a deliberate omission,
not a gap waiting to be filled by this ticket.

---

## 2. Two independent listbox panes, not one `<ino-listbox>` composed twice

Each pane needs its own roving-`tabindex` position (a row focused in the source pane and a row
focused in the target pane are simultaneously meaningful — e.g. `Alt+ArrowRight` acts on
whichever pane last had focus), its own selection array, and its own "just arrived here"
`moved-flash` set. Composing two `<ino-listbox>` instances would need either lifting all of that
state back out through `@Output`s anyway (no net simplification) or accepting `ino-listbox`'s
filter box and virtual-scroll wiring that this component doesn't want (same rationale
`ino-orderlist`'s SPEC.md §3 gives for not composing it there). Re-implementing the small roving-
tabindex/multi-select core directly keeps both panes' state colocated in one component with one
`transfer()` method as the single place items ever move between arrays.

---

## 3. `source`/`target` are membership; `sourceSelection`/`targetSelection` are the Tier-1 contract

Same split `ino-orderlist` makes between `options` (order) and `value` (selection) — see that
component's SPEC.md §2 — applied to two panes instead of one axis:

- `source`/`sourceChange`, `target`/`targetChange` — which pane each item currently lives in.
  A transfer clones both arrays (never mutates in place) and emits both.
- `sourceSelection`/`sourceSelectionChange`, `targetSelection`/`targetSelectionChange` — which
  rows are checked in each pane right now, independent of membership. A transfer clears the moved
  values out of the selection they came from (an item that just left a pane can't still be
  "checked" in it) and emits that too.

`Alt+ArrowRight`/`Alt+ArrowLeft` pass the focused row directly to `moveToTarget`/`moveToSource`
rather than only acting on the current selection — the same "act on the focused row if nothing
else is selected" ergonomics most PrimeNG-parity transfer UIs give the keyboard path, so a user
never has to select-then-press-a-second-key to move a single row.

---

## 4. `moved-flash` flashes the arrival pane, not the departure pane

Doc 26 §5 names `moved-flash` for this component pair without specifying which side of a transfer
it marks. This component flashes the rows **in the pane they just landed in** — the departure
pane no longer contains them at all, so there's nothing there left to flash, and the visual
confirmation a user wants ("did my click work?") reads naturally as "look at where it just
appeared," not "look at the gap it left." Mechanism (duration, `markForCheck` requirement) is
identical to `ino-orderlist`'s — see that component's SPEC.md §4.

---

## 5. Sizing and labels

Sizing: same `compact`/`comfortable` axis as `ino-orderlist` (SPEC.md §5 there) — applies to both
panes at once via the single `size` input, not independently per pane (nothing in doc 26 §5 calls
for mixed-density panes, and a picklist whose two sides render at different row heights would look
broken, not intentional).

Labels: doc 26 §5 calls for "list labels ×2" for this pair specifically — `sourceLabel`
(default `'Available'`) and `targetLabel` (default `'Selected'`), one `<ino-label>` per pane, each
wired to that pane's listbox via `for`/`id`. `ino-orderlist` only needs one label (it has one
list); this is the component the "×2" actually describes.
