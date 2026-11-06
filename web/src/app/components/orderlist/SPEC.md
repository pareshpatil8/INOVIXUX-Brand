# `<ino-orderlist>` — component spec

**Issue:** [INO-456](/INO/issues/INO-456) (INO-31 Phase B3, doc 26 §5 row `ino-orderlist + ino-picklist`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made. Shares this file's lineage/pairing context with
`web/src/app/components/picklist/SPEC.md` — the two components ship from one spec row but are
separate components (single list vs. dual list), so each gets its own component-specific record.

---

## 1. No drag-and-drop — buttons + keyboard only

Doc 26 §5 calls for "buttons + keyboard" with "documented button alternatives to drag." Rather
than building HTML5 drag-and-drop *and* a button/keyboard fallback for it, this component
implements only the button/keyboard path and documents drag as a deliberate omission:

- HTML5 DnD has no single accessible story across browsers without a non-trivial amount of
  ARIA-live scaffolding (APG's own reorder pattern recommends buttons as the primary mechanism,
  not a fallback), and this repo has no existing DnD-accessible precedent to extend (the closest,
  `ino-table`'s column-reorder, *also* ships only `‹`/`›` buttons — see
  `web/src/app/components/table/ino-table.component.html` — never native `draggable`-attribute
  DnD for its accessible path).
- Building drag now and bolting buttons on as "the a11y alternative" inverts the effort: the
  buttons alone are a complete, fully keyboard-operable implementation on their own, so drag would
  be pure additive surface area with no component this program has already validated it against.

If a product screen later needs pointer-drag reordering specifically, that is a scoped follow-up
on top of this component, not a blocker to its first publish.

---

## 2. `options`/`optionsChange` is order; `value`/`valueChange` is selection

Every other Tier-1 control in this repo uses `value`/`valueChange` for its one piece of bound
state. A reorder list has two: **which rows are checked** (to know what the next move button acts
on) and **what order the rows are in**. Collapsing both into `value` would mean a single `value`
emission sometimes means "selection changed" and sometimes means "order changed," which the caller
would have to disambiguate out-of-band.

Instead:

- `value: string[]` / `valueChange` — the Tier-1 **selection** contract, structurally identical to
  `ino-listbox`'s `multiple` mode (toggle-without-losing-the-rest, click/`Space`).
- `options: InoOrderListOption[]` / `optionsChange` — the **ordered catalog**. Array order is list
  order; a move operation clones (never mutates the input array in place, matching this repo's
  immutable-update convention) and emits the new order.

A caller that only cares about final order ignores `valueChange`; a caller that wants to know
what's currently checked (e.g. to show a count) ignores `optionsChange` unless a move happened.

---

## 3. Reuses `ino-listbox`'s multi-select listbox core, not its filter/virtualization

The list itself is `ino-listbox`'s always-visible APG Listbox pattern in multi-select mode:
`role="listbox"` `[aria-multiselectable]`, roving-`tabindex` `role="option"` rows, a decorative
checkbox per row, click/`Space` toggles membership. See
`web/src/app/components/listbox/SPEC.md` §2/§5 for the pattern itself.

**Not reused:** the filter box and `<ino-virtual-scroller>` integration. Doc 26 §5's row for this
component names no filter requirement, and a reorder list's whole interaction model assumes the
visible rows are the full, stable set being reordered — a filter that hides rows mid-reorder would
make "move up" ambiguous (up relative to the filtered view, or the real array?). If a future
product screen needs filtering *and* reordering together, that tension needs its own design pass,
not a default-on inherited filter box.

---

## 4. `moved-flash` — new state, no repo precedent

Doc 26 §5 names `moved-flash` as a state specific to this component pair. A repo-wide search found
no existing transient-highlight-after-an-action pattern to extend (`ino-table`'s column reorder
has no flash; nothing else in the catalog flashes after a move). This component introduces the
smallest version that satisfies the requirement:

- A plain CSS `background`/`box-shadow` transition (`--ino-motion-duration-slow`, 480ms — the same
  token every other motion effect in this codebase reads, not a new duration), guarded by
  `prefers-reduced-motion: no-preference` like every other animated state here.
- The flashed set is computed in the component (not CSS-only) because it has to track *which*
  values just moved, cleared via `setTimeout` after `MOVED_FLASH_MS` (600ms — long enough to read
  past the transition, short enough not to look stuck).
- The clear callback runs outside any template event, so it explicitly calls
  `ChangeDetectorRef.markForCheck()` — this component is `OnPush`, and a bare timer callback does
  not mark an OnPush component dirty on its own the way a bound template event does.

---

## 5. Sizing: `compact`/`comfortable`, not `sm`/`default`/`lg`

Doc 26 §5 names this component's sizing axis as "compact/comfortable" — the same axis
`ino-accordion` and `ino-panel-menu` already established for list/menu-shaped components (see
`web/src/app/components/accordion/ino-accordion.component.ts`'s own doc comment), not the
`InoControlSize` (`sm`/`default`/`lg`) scale `control-size.ts` defines for leaf form controls.
`comfortable` (default) reads the unsuffixed `--ino-control-*` aliases; `compact` re-points to the
`-sm` tier. Both still compose under `[data-density="dense"|"fluid"]` for free, since those
aliases are themselves re-declared inside tokens.css's density blocks.
