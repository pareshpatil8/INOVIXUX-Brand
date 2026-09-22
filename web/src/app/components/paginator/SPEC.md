# `<ino-paginator>` — component spec

**Issue:** INO-137 (INO-31 T-2, Tier 1 / Data group)
**Parity benchmark:** PrimeNG 22.1.1 `Paginator` — `specs/primeng/llms-22.1.1.txt` line 92, route
`https://primeng.dev/paginator`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap register:** closes the `Paginator` row (`[new]`) in
`docs/brand/16-design-system-parity-vs-echeque-reference.md` §203/§860, a prerequisite for **H-2**
(Table / dense data component) alongside `ino-virtual-scroller` (INO-129, already shipped).
**Depends on:** W0-2 (INO-124, control-size token scale) — merged before this branch started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Mobile: web-only (DoD row 9)

**Decision: web-only. No React Native, Capacitor or Flutter port ships with this issue.**

Reason, per plan rev 9 §5 (the desktop-idiom porting rule): a row of numbered page-link buttons is
a desktop/pointer-and-keyboard idiom, not the same component wearing a different skin on mobile.
Both mobile tracks already have a platform-native, platform-optimised answer to "get more data"
that is strictly better than a port of this one would be:

| Track | Native equivalent | Why porting this component would be worse |
|---|---|---|
| React Native | Infinite scroll (`onEndReached` on `FlatList`/`FlashList`) | Touch lists are scrolled, not paged; a row of small tap targets for page numbers fails the 44px comfortable target on a phone-width screen the moment the page count exceeds ~4 |
| Flutter | `ScrollController` end-of-list listener on `ListView`/`SliverList` | Same — mobile data views load-more on scroll, they don't paginate with numbered links |

The current-page-report and rows-per-page concepts still exist on mobile, but as part of whatever
native list/infinite-scroll component eventually ships — not as a port of this control. The mobile
counterpart is a **different component** and gets its own issue in a later wave.

**This decision has a consequence for `check-theme-parity.mjs`:** that script audits colour roles
across web + 2 mobile ports. It stays untouched by this issue (see §6), so nothing here asserts a
mobile palette for a component that has no mobile port.

---

## 2. Variants built (DoD row 6)

The PrimeNG route's feature list, and what shipped:

| PrimeNG feature | Shipped | Surface |
|---|---|---|
| Page links | ✅ | `pageLinks` getter, sliding window sized by `pageLinkSize` with `…` collapse — always keeps page 1 and the last page visible |
| First / Prev / Next / Last | ✅ | `showFirstLastIcon` toggles the outer two; Prev/Next always render |
| Rows-per-page dropdown | ✅ | `rowsPerPageOptions` — empty (default) hides the control entirely |
| Current page report | ✅ | `showCurrentPageReport` + `currentPageReportTemplate` (`{first}`/`{last}`/`{rows}`/`{page}`/`{pageCount}`/`{totalRecords}` placeholders) |
| Jump-to-page input | ✅ | `showJumpToPageInput` |
| `alwaysShow` | ✅ | Hides the host (`[hidden]`) when there's exactly one page and `alwaysShow="false"` |
| Fully custom template composition (`currentPageReportTemplate` as a *template*, arbitrary segment reordering) | ❌ **deliberate omission** | See below |

**Deliberate omissions, with reasons:**

- **Arbitrary template-segment composition.** PrimeNG lets a consumer reorder/re-slot every segment
  (`FirstPageLink`, `PageLinks`, `CurrentPageReport`, `RowsPerPageDropdown`, …) via `[template]`
  strings. This component fixes the layout order (report → rows-per-page → links → jump) behind
  boolean/string `@Input`s instead — the same trade-off `docs/brand/16-…-parity-vs-echeque-reference.md`
  §4.3 makes against unstructured Layer-4 escape hatches (register item N-11): a fixed, audited
  layout that `check-ds-adherence.mjs` can reason about, versus a free-form slot the component can't
  guarantee stays token-correct. A future consumer that genuinely needs a different order composes
  the sub-parts (rows-select, page links, report) directly rather than reconfiguring this component.
- **`dropdownAppendTo` / overlay-portaled rows-per-page dropdown.** The rows-per-page control is a
  plain native `<select>` (same reasoning as `ino-select`: real keyboard/AT behavior for free), so
  there is no overlay to portal.

---

## 3. Eight states: 7 of 8 carried, 1 deliberately N/A (DoD row 5)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `.ino-paginator__btn` base rule |
| Hover | ✅ | Per-button `:hover:not(:disabled)` |
| Active/pressed | ✅ | Per-button `:active:not(:disabled)`, pressed-accent foreground (no fill to darken on a ghost-style button, same rationale as `ino-btn--ghost`) |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset` on every interactive control — never a hand-rolled outline |
| Disabled | ✅ | `disabled` `@Input` → native `disabled` attribute on every button/select/input + `[data-disabled]` host attr for the 0.5 opacity dim |
| Readonly | ✅ | `readonly` `@Input` → `[data-readonly]` host attr. Deliberately **not** dimmed (see §… below) — every control stays focusable and visually normal so a keyboard/AT user can still perceive the current page; only the hover affordance is suppressed. Click/change handlers no-op via the `interactive` guard in the component class rather than a native `disabled`, because a truly `disabled` control would also drop out of the tab order, which is wrong for a "look but don't touch" state. The rows-per-page `<select>` is a native browser control, so a `readonly` no-op still lets the browser commit the user's DOM selection before the handler runs; `onRowsPerPageChange()` resets `select.value` back to the true `rows` state in that case instead of leaving the control showing an option the component never adopted. |
| Loading/busy | ✅ | `loading` `@Input` → `[data-loading]` host attr (lighter 0.75 dim + `cursor: progress`) + `[attr.aria-busy]` on the host; the native controls are also disabled while loading since triggering another page change mid-fetch would race the in-flight one |
| Invalid | ❌ **deliberately N/A** | A page-navigation control has no form-validity concept to fail — there is no "wrong" first/rows/totalRecords value the user typed, unlike a form field. Same reasoning `ino-tag`'s `SPEC.md` §1 records for the same state on a different kind of non-form component. |

---

## 4. Size API (DoD row 3)

Reads all six Wave 0 control-size aliases, including `--ino-control-height` — unlike `ino-tag` (a
static label), every page/nav button here is a real interactive control, so it follows the
`ino-button` / `ino-virtual-scroller` precedent of sizing the full alias set rather than the
label-only subset. `size="default"` in fluid density resolves to 44px (`--ino-target-comfortable`);
`sm`/`lg` and the dense re-resolution follow the same tokens.css §10/§12 scale every other component
uses — no local sizing values were invented.

`--ino-row-min-height` (DoD row 4) sets a density floor on the whole host, since the paginator
typically sits directly below a table body as a row-like bar; the 44px fallback outside a
`[data-density]` ancestor matches the fluid default, the same fallback idiom `ino-tag` uses.

---

## 5. ARIA contract (DoD row 8)

**Role** — the host is `role="navigation"` with `aria-label="Pagination"` (overridable via the
`ariaLabel` @Input for a page with multiple paginators, e.g. "Pagination, users table"). Page links
render as a plain `<ul>`/`<li>`/`<button>` list rather than a `role="list"` overlay so the native
list semantics AT already understands are free.

The active page link carries `aria-current="page"`; every icon-only nav button (`first`/`prev`/
`next`/`last`) carries an explicit `aria-label` since it has no visible text. The current-page
report region is `aria-live="polite"` so a screen-reader user hears "1–10 of 248" update after a
page change without a full re-announcement of the whole control.

### Keyboard map

Every button/select/input is a native focusable element in normal tab order — no roving tabindex or
custom key handling was added, matching the PrimeNG benchmark's own tab-per-control model:

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between report (n/a, not focusable) → rows-select → first → prev → page links → next → last → jump input, in DOM order |
| `Enter` / `Space` | Activate the focused button (native `<button>` behavior) |
| `↑` / `↓` (rows-select), native number spinners (jump input) | Native `<select>`/`<input type="number">` behavior — not re-implemented |

### Contrast and targets

- Every nav/page button is square at `min(--ino-control-height, --ino-control-height)`, i.e. never
  below 28px (dense `sm`) and never below the 24px SC 2.5.8 floor at any rung — the same guarantee
  `ino-button--icon` and `check-theme-parity.mjs` already assert for the control-size scale.
- The active page link's accent fill / on-accent pair, and the danger-free hover/press surfaces,
  reuse `check-theme-parity.mjs`-audited role pairs (`--ino-color-accent` / `--ino-color-on-accent`,
  `--ino-color-surface-sunken` / `--ino-color-on-surface`) — no new pair was introduced.

---

## 6. RTL

Layout is a plain `display: flex` row with no `flex-direction` override, so it mirrors automatically
against the inline axis under `dir="rtl"` — one DOM order, not two. Padding/sizing use only logical
properties (`padding-inline`, `inline-size`, `min-inline-size`/`min-block-size`).

**Known, deliberate physical-direction exception:** the four nav-icon SVGs (first/prev/next/last)
are drawn as literal left- and right-pointing chevrons. Under RTL the semantic direction of "back"
and "forward" reverses, so `:host-context([dir='rtl']) .ino-paginator__btn--nav svg` applies
`transform: scaleX(-1)`. This is the same class of "logical properties can't express glyph
chirality" exception `ino-virtual-scroller`'s `SPEC.md` §5 records for its skeleton shimmer
gradient — recorded here rather than silently left as an RTL bug.

---

## 7. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

DoD row 11 permits "one appended line in the `check-theme-parity.mjs` component registry." **That
registry does not exist.** The script is a token-contract audit (CSS mirror byte-parity, colour
roles across 3 themes × 2 mobile ports, space/radius/target/duration scales, focus-ring shape,
control-size scale invariants), not a per-component list. No component through this DoD so far
(`ino-alert`/`ino-toast-container`, `ino-virtual-scroller`, `ino-tag`) has added one either — see
`virtual-scroller/SPEC.md` §6 and `tag/SPEC.md` §8 for the same finding, recorded independently by
each.

- **Nothing appended.** `node scripts/check-theme-parity.mjs` passes unchanged.
- Component-level adherence runs through `check-ds-adherence.mjs`'s whole-scope walk, so this
  directory is linted the moment it exists, with nothing to register.

If a registry is wanted, it should be designed once as a Wave 0 amendment against INO-31 rather than
improvised by whichever component issue lands first.

---

## 8. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (in `web/`) | ✅ passes, no errors. One non-blocking `anyComponentStyle` budget warning (4.11 kB vs. the 4 kB warning threshold, well under the 8 kB error threshold) — this component has more interactive sub-parts (rows-select, jump-input, nav/page buttons, ellipsis, report) than any prior Tier-1 component, and the full six-alias size-scale read (§4) is kept rather than trimmed to chase the warning away. |
| `node scripts/check-theme-parity.mjs` | ✅ passes |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations in this directory |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branches in the component | none |
