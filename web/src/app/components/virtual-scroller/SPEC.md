# `<ino-virtual-scroller>` — component spec

**Issue:** INO-129 (INO-31 T-3, Tier 1 / Data group)
**Parity benchmark:** PrimeNG 22.1.1 `VirtualScroller` — `specs/primeng/llms-22.1.1.txt` line 130,
route `https://primeng.dev/virtualscroller`. PrimeNG is a benchmark, **not a runtime dependency**;
nothing here installs it.
**Gap register:** closes the `VirtualScroller` row (`[new]`) in
`docs/brand/16-design-system-parity-vs-echeque-reference.md` §208, a prerequisite for **H-2**
(Table / dense data component).

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Mobile: web-only (DoD row 9)

**Decision: web-only. No React Native, Capacitor or Flutter port ships with this issue.**

Reason, per plan rev 9/10 §5 (the desktop-idiom porting rule): virtual scrolling on mobile is not
the same component wearing a different skin. Both mobile tracks already have a platform-native,
platform-optimised answer that is strictly better than a port of this one would be:

| Track | Native equivalent | Why porting this component would be worse |
|---|---|---|
| React Native | `FlatList` / `FlashList` | Windowing is done off the JS thread by the native list view; a JS-side offset table re-implements it worse and fights the recycler |
| Flutter | `ListView.builder` / `SliverList` | Same — `RenderSliverList` already windows lazily against the viewport |

Beyond the recycler argument, three things this component does are desktop-idiom by construction
and have no mobile counterpart:

- **Keyboard scroll map.** PageUp/PageDown/Home/End/Ctrl+Home on a focusable scroll region. There is
  no hardware keyboard to serve on the mobile tracks.
- **Scrollbar-driven affordance.** The hover and `:active` border states exist to acknowledge a
  pointer gesture on the scrollbar. Touch has no hover, and no scrollbar to grab.
- **`sessionStorage` scroll restoration.** The mobile tracks restore list position through their own
  navigation-state mechanisms, not through a web storage API.

The mobile counterpart is a **different component** and gets its own issue in a later wave.

**This decision has a consequence for `check-theme-parity.mjs`:** that script audits colour roles
across web + 2 mobile ports. It stays untouched by this issue (see §6), so nothing here asserts a
mobile palette for a component that has no mobile port.

---

## 2. Variants built (DoD row 6)

The PrimeNG route's feature list, and what shipped:

| PrimeNG feature | Shipped | Surface |
|---|---|---|
| Vertical scrolling | ✅ | `orientation="vertical"` (default) |
| Horizontal scrolling | ✅ | `orientation="horizontal"` |
| Grid (both axes) | ✅ | `orientation="both"`, row-major 2-D `items` |
| Fixed item size | ✅ | `itemSize`, or inherited from the control-height scale |
| Variable item size | ✅ | `autoSize` + `estimatedItemSize` / `itemSizeFn` |
| Lazy loading | ✅ | `lazy`, `totalRecords`, `(lazyLoad)` |
| Loader / skeleton | ✅ | `showLoader`, `loaderItemCount`, `[inoVirtualScrollerLoader]` |
| Scroll delay | ✅ | `delay` (ms coalescing window) |
| Templates (item/loader/header/footer/empty) | ✅ | Five structural directives — see §3 |
| `scrollToIndex` | ✅ | Plus `align: 'start' \| 'center' \| 'end' \| 'auto'` |
| Inline style / class inputs | ❌ **deliberate omission** | See below |

**Deliberate omissions, with reasons:**

- **`[style]` / `[styleClass]` passthrough inputs.** PrimeNG exposes these on every component. We do
  not: an arbitrary style bag is precisely the Layer-4 escape hatch that
  `docs/brand/16-…-parity-vs-echeque-reference.md` §4.3 leaves unsanctioned (register item N-11),
  and `check-ds-adherence.mjs` cannot lint a value that arrives as a runtime string. Sizing goes
  through `size`, height through `scrollHeight` / `scrollWidth`, everything else through the host
  element's own class attribute, which a consumer already controls.
- **`#content` template (PrimeNG's "take over the whole viewport" slot).** It exists in PrimeNG so a
  consumer can supply their own `<table>` wrapper. Our answer to that case is INO-155 (Table)
  *composing* this component, not a slot that lets a consumer bypass the windowing contract.

**Additions beyond PrimeNG**, both required by our DoD rather than by the benchmark:

- Scroll-position restoration (`scrollRestorationKey`, `save`/`restoreScrollPosition()`), which
  PrimeNG has no equivalent for. This is the reviewer-workflow requirement in the issue.
- RTL correctness as a first-class contract (§5).

---

## 3. Template slots

Five structural directives rather than PrimeNG's `#item` / `#loader` template-reference-name
convention. Rationale is in the header of `ino-virtual-scroller.templates.ts`: a
`@ContentChild(TemplateRef)` keyed on a local ref name is a stringly-typed contract the compiler
cannot check, and it breaks the moment a consumer wraps the scroller in their own component.

| Directive | Context |
|---|---|
| `[inoVirtualScrollerItem]` | `$implicit` (item, or the visible column slice in grid mode), `index`, `count`, `columnOffset`, `columnSize`, `even`, `odd` |
| `[inoVirtualScrollerLoader]` | `$implicit` = null, `index`, `count` |
| `[inoVirtualScrollerEmpty]` | — |
| `[inoVirtualScrollerHeader]` | — |
| `[inoVirtualScrollerFooter]` | — |

Header and footer render **outside** the scroll port, so a sticky column header or a paginator does
not scroll away with the rows and does not participate in the scroll math.

---

## 4. ARIA contract (DoD row 8)

`role` is an **`@Input`, not a constant**, because this component is a windowing primitive with
three legitimate semantic framings and no way to guess which applies:

| `role` | `itemRole` | When |
|---|---|---|
| `group` (default) | `listitem` → set to `null` | Arbitrary projected content. Safe default: announces a boundary without claiming list/grid semantics it cannot guarantee. |
| `list` | `listitem` | The rows genuinely are a list. |
| `presentation` | `null` | An ancestor owns the semantics — this is what INO-155 (Table) sets, so the scroller does not inject a second, conflicting structure into the a11y tree. |

The load-bearing accessibility decision is **`aria-setsize` / `aria-rowcount` report the true
collection length, not the rendered window** (`rowCountForAria`). Without it the a11y tree says
"item 3 of 30" when it is item 3 of 100,000 — the single most common virtual-scroller a11y defect.
In `lazy` mode with an unknown total it reports `-1`, the ARIA-sanctioned "size unknown", rather
than a number it would have to invent.

A sighted user perceives virtualization from the scrollbar. The equivalent signal for a
screen-reader user is the polite `role="status"` live region (`.ino-vs__sr`) naming the rendered
window — "Items 4,120 to 4,149 of 100,000".

### Keyboard map

The viewport is focusable (`tabindex="0"`, `-1` when disabled). A mouse-only scroll container is a
keyboard trap for the content inside it (SC 2.1.1), so every gesture a wheel can make has a key:

| Key | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | One item along the block axis |
| `ArrowRight` / `ArrowLeft` | One column along the inline axis — **direction-aware**, so `ArrowRight` decreases the logical offset in RTL |
| `PageDown` / `PageUp` | One viewport along the primary axis |
| `Home` / `End` | Start / end of the primary axis |
| `Ctrl+Home` / `Ctrl+End` | Also resets / maxes the inline axis (grid mode) |

### Contrast and targets

- Row min extent is `--ino-row-min-height` (32px dense, above the SC 2.5.8 24px floor);
  `size="default"` in fluid density resolves to the comfortable 44px.
- Non-text contrast (SC 1.4.11) for the viewport boundary is carried by `--ino-color-border`, which
  `check-theme-parity.mjs` already audits at ≥3:1 against all three surface roles in every theme.
- The component sets **no text colours of its own** beyond `--ino-color-on-surface` /
  `--ino-color-on-surface-muted`, both audited at ≥7:1 in high-contrast.

---

## 5. RTL

Offsets are logical end to end. `scrollLeft` is normalised on read (`Math.abs`) and de-normalised on
write, so `getScrollPosition().inline` is `>= 0` in both directions; the DOM is positioned with
`inset-inline-start`; the stylesheet contains no `left`/`right`/`top`/`bottom`. One code path, not
two.

**Known cosmetic exception:** the built-in skeleton shimmer uses `linear-gradient(90deg, …)`, a
physical direction, so it sweeps the same way in RTL. It is `aria-hidden` decoration behind a
`prefers-reduced-motion: no-preference` guard, and logical gradient directions are not portably
supported. Recorded here rather than silently left.

---

## 6. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

DoD row 11 permits "one appended line in the `check-theme-parity.mjs` component registry". **That
registry does not exist.** The script (134 lines, read in full) is a *token-contract* audit: CSS
mirror byte-parity, the Capacitor import path, colour roles across 3 themes × 2 mobile ports,
space/radius/target/duration scales, focus-ring shape, and pressed-accent contrast. It has no
per-component list to append to, and INO-128 (Alert/Toast, the one component already through this
DoD) did not add one either.

Inventing a registry here would put a new shared structure in a file that **every** remaining
component branch also touches — the exact merge-conflict surface row 11 exists to prevent. So:

- **Nothing appended.** `node scripts/check-theme-parity.mjs` passes unchanged.
- Component-level adherence is already covered automatically: `check-ds-adherence.mjs` walks
  `web/src` and `docs/brand/06-angular-components/src` as whole scopes (its `SCOPES` array), so this
  directory is linted the moment it exists, with nothing to register.

If a registry is wanted, it should be designed once as a Wave 0 amendment against INO-31 rather than
improvised by whichever component issue lands first.

---

## 7. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (in `web/`) | ✅ passes, no errors, no budget warnings |
| `node scripts/check-theme-parity.mjs` | ✅ passes |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations in this directory |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branches in the component | none |
