# `<ino-dataview>` — component spec

**Issue:** INO-454 (INO-31 Phase B3, Data display group).
**Parity benchmark:** PrimeNG 22.1.1 `DataView` — `specs/primeng/llms-22.1.1.txt` line 51, route
`https://primeng.dev/dataview`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Spec seed:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 — "list/grid
layout switch; paginator integration; item templates" / states "loading, empty" / sizing "grid gap
scales" / labels "list label" / a11y "`role=list/listitem`; layout toggle announced" / notes
"Port both (list mode)".

This file records the decisions the §2 Component Publish Contract requires to be written down
rather than silently made.

---

## 1. Composition, not reinvention

Two sub-parts are reused outright rather than rebuilt:

- **Layout switch** — `<ino-select-button>` (single-select, `iconOnly`, two options: List `☰` /
  Grid `☷`). This is the exact icon pair `select-button-demo.component.ts` already seeds for a
  "List / Grid" demo row, so the choice is consistent with a precedent already on the docs site,
  not invented here.
- **Paginator** — `<ino-paginator>`, with the identical controlled-component integration
  `ino-table.component.ts` already established: `paginator`/`rows`/`first`/`totalRecords`/`lazy`
  inputs, a `page` output carrying `InoPaginatorPageEvent`, and client-side slicing
  (`windowedItems`) unless `lazy` is set, in which case `value` is trusted to already hold the
  loaded page. A second, differently-shaped paging contract here would be exactly the kind of
  drift the design-system discipline exists to prevent.

`showLayoutSwitcher="false"` lets a host page drive `[layout]` itself (e.g. a page-level
list/grid toggle shared across several dataviews) without rendering a duplicate switch.

---

## 2. Item templates (doc 26 §5 row)

Two structural directives, `inoDataViewListItem` / `inoDataViewGridItem` (`ino-dataview.templates.ts`)
— one per layout, mirroring `ino-virtual-scroller.templates.ts`'s "one directive per slot" rule
rather than PrimeNG's `pTemplate="list"` / `pTemplate="grid"` string-keyed convention (a directive
selector is a compile-time-checked contract; a template-reference-name string is not, and does not
survive a consumer wrapping the dataview in its own component).

**A consumer that supplies only `inoDataViewListItem` still gets a working grid.** `activeItemTemplate`
falls back to the list item template when no grid-specific one is registered — the pragmatic default
for the common case (a card that looks the same whether it's in a column or a tile), while still
letting a consumer who wants a genuinely different grid-cell layout (e.g. list rows show a table-ish
row, grid cells show a photo card) register `inoDataViewGridItem` separately.

An `inoDataViewEmpty` directive overrides the default `emptyMessage` text with custom markup (e.g. an
illustration + a "Create your first record" CTA) — same "consumer template wins, built-in fallback
otherwise" rule `ino-virtual-scroller`'s `emptyDef` uses.

---

## 3. Sizing — grid gap scales (doc 26 §5 row)

The grid/list gap rebinds `--ino-dataview-gap` from the existing `--ino-control-padding-inline-sm`/
`-default`/`-lg` aliases per `[data-size]`, the same rebind-on-host-attribute idiom
`ino-paginator.component.scss` §4 uses for its own size rows. This was a deliberate reuse, not an
invented token: those aliases already resolve correctly per `size` **and** per `[data-density]`
(tokens.css §12 re-declares them inside both `[data-density="dense"]` and `[data-density="fluid"]`),
so the dense/fluid density behaviour the §2 contract's Sizing point requires falls out for free —
there is nothing bespoke in this component's own CSS that needs a separate dense/fluid branch.

`gridMinColumnWidth` (default `'220px'`) is deliberately **not** part of the token scale — a grid
cell's minimum width is a function of the card content a consumer puts inside it (a KYB risk-report
tile is a different width than a compact avatar card), the same class of "intentionally free input"
`ino-virtual-scroller`'s `scrollHeight`/`scrollWidth` are for their own component.

---

## 4. States: loading, empty (doc 26 §5 row), plus the standard 8

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `.ino-dataview__item` base rule |
| Hover / focus-visible / active | N/A at this component's level | A dataview row/card's own interactive affordances (if any) belong to the item template's own content, not to this component — same boundary `ino-virtual-scroller`'s `SPEC.md` draws around row-level interaction |
| Disabled / readonly / invalid | **Deliberately N/A** | A pure read/present component has no form-validity or editable-state concept, same reasoning `ino-paginator`'s `SPEC.md` §1 records for its own non-form state set |
| Loading | ✅ | `loading` input → host `[data-loading]` + `aria-busy`; renders `skeletonItemCount` (falls back to `rows`, else 6) shimmer placeholders in the current layout shape, same shimmer idiom `ino-table.component.scss` uses (`aria-hidden`, independent `@keyframes` name per component by convention) |
| Empty | ✅ | `isEmpty` (no items, not loading) renders `emptyDef` or `emptyMessage` |

---

## 5. ARIA contract (doc 26 §5 row — "`role=list/listitem`; layout toggle announced")

**Role** — the items container is `role="list"`; every rendered item (including skeleton
placeholders) is `role="listitem"`. This holds in **both** layouts: a card grid is still
semantically a list of records, not a 2-D `role="grid"` — the spec row names exactly these two
roles and nothing else, and introducing `grid`/`gridcell`/`row` semantics would impose a 2-D
arrow-key navigation contract the spec never asked for (that is `ino-treetable`'s `role=treegrid`
row, not this one).

**Accessible name** — `aria-labelledby` points at the visible `label` (the "list label" the doc 26
§5 Labels column calls out) when one is given; otherwise `aria-label` falls back to the `ariaLabel`
input (default `'Data view'`).

**Layout toggle announced** — `<ino-select-button>` already gives the switch itself full
`radiogroup`/`radio` semantics (and now visibly/audibly reflects the pressed option). On top of
that, a transient `role="status" aria-live="polite"` region (`#announcer`) speaks "List view" /
"Grid view" on every change and clears itself after 1s — the same visually-hidden,
imperatively-written announcer idiom `ino-inputtags.component.ts`'s `announce()` method uses for its
own live region (`ino-inputtags.component.html` line 96). This is in addition to, not instead of,
the switch's own native radiogroup announcement: a screen-reader user hears both "Grid view, radio
button, selected" from the control and "Grid view" from the region narrating the *effect* of the
choice on the content below, mirroring how `ino-virtual-scroller`'s `rangeAnnouncement` narrates an
effect its own interactive element doesn't say out loud by itself.

**Keyboard** — every interactive element here (the layout switch's radio inputs, the paginator's
buttons/select/input) is a native focusable control already covered by `ino-select-button`'s and
`ino-paginator`'s own keyboard contracts; this component adds no new key handling of its own.

---

## 6. RTL

Header is a plain `display: flex` row and the grid uses `auto-fill`/`minmax` tracks — both reflow
for the inline axis automatically under `dir="rtl"`, one DOM order. All spacing uses only logical
properties (`margin-block-*`, `padding-block-*`, `inline-size`). No physical-direction glyph
exception exists in this component (unlike `ino-paginator`'s nav chevrons) — the `☰`/`☷` layout-switch
icons are direction-agnostic.

---

## 7. Mobile: web-first, list mode only (doc 26 §5 Notes column)

**Decision: "Port both" means the RN and Flutter ports ship list-mode only — no grid layout, no
layout switch, no paginator sub-component.** This is the literal reading of the doc 26 §5 row's own
Notes text ("Port both (list mode)"), and it matches the reasoning `ino-paginator`'s `SPEC.md` §1
already recorded for a related decision: a numbered-page-link paginator is a desktop idiom, and
both mobile tracks already answer "get more data" with native infinite scroll instead of a ported
paginator. A list-mode data view is exactly a styled `FlatList`/`ListView.builder` over the same
item shape — see `mobile/react-native/src/components/InoDataView.tsx` and
`mobile/flutter/lib/widgets/ino_dataview.dart`.

A grid-mode mobile port, if a product screen ever needs one, is a different component shape (closer
to a native photo/card grid) and gets its own issue in a later wave, per the same "a different
component, later wave" deferral `ino-paginator`'s SPEC.md records for its own mobile counterpart.

---

## 8. `check-theme-parity.mjs` — not modified

Same finding every Tier-1/B-phase component's `SPEC.md` records independently (see
`paginator/SPEC.md` §7, `virtual-scroller/SPEC.md` §6): the script is a token-contract audit, not a
per-component registry. Nothing was appended; `node scripts/check-theme-parity.mjs` passes
unchanged.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (in `web/`) | ✅ passes |
| `node scripts/check-theme-parity.mjs` | ✅ passes |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations in this directory |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branches in the component | none |
