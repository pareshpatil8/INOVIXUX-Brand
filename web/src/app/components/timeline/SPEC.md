# `<ino-timeline>` — component spec

**Issue:** INO-134 (INO-31 T-4, Tier 1 / Data group)
**Parity benchmark:** PrimeNG 22.1.1 `Timeline` — `specs/primeng/llms-22.1.1.txt` line 121, route
`https://primeng.dev/timeline`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap register:** closes the `Timeline` row (`[new]`) in
`docs/brand/16-design-system-parity-vs-echeque-reference.md` §205, the third of the three
Data-group prerequisites the 38-component plan missed (alongside `ino-paginator`, INO-137, and
`ino-virtual-scroller`, INO-129, both already shipped) — the fit named in that row is the KYB
audit trail: who verified what, when, and what the human approver decided.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Mobile: web-only (DoD row 9)

**Decision: web-only. No React Native, Capacitor or Flutter port ships with this issue.**

Reason, per plan rev 9/10 §5 (the desktop-idiom porting rule) and the precedent
`virtual-scroller/SPEC.md` §1 and `paginator/SPEC.md` §1 both record for the same question on
other Data-group components: the porting rule asks whether this is *the same component wearing a
different skin* on mobile, or a desktop-idiom shape that has no honest mobile equivalent.

`<ino-timeline>` fails that test more thoroughly than either sibling, for a reason specific to its
own design: it is **data-driven with three per-event content-projection slots**
(`inoTimelineContent`, `inoTimelineOpposite`, `inoTimelineMarker` — `ino-timeline.templates.ts`),
not a fixed-shape row renderer. A port has two options, and both are wrong:

1. **Port the three-`ng-template`-slot contract literally.** Angular's `TemplateRef` /
   `ngTemplateOutlet` has no equivalent in React Native (JSX children are eager, not lazily
   re-instantiated per data item with a typed context) or Flutter (`Widget Function(BuildContext)`
   builders exist, but three independently-optional named slots with a shared per-event context
   object is an Angular structural-directive idiom, not a cross-platform one). Reproducing the
   *contract*, not just the visual result, would mean inventing a different API on each platform —
   at which point it is not a "port" of this component, it is three unrelated components that
   happen to share a name.
2. **Collapse to a fixed-field row** (title/subtitle/timestamp strings instead of templates) to
   make the port mechanical. This throws away the exact feature — arbitrary per-event content,
   the reason PrimeNG's `Timeline` and this component are template-driven at all rather than
   `@Input() label: string` — that a consumer building a KYB audit trail actually needs (a
   decision chip, a reviewer avatar, a diff snippet all appear in a real audit row).

Unlike `ino-virtual-scroller` (windowing has a strictly-better native answer, `FlatList`/
`ListView.builder`) and `ino-paginator` (paging has a strictly-better native answer, infinite
scroll), a mobile audit-trail feed is not a solved problem with an existing native primitive to
defer to — it is a **simple vertical list**, which is exactly the case the issue brief's "lightweight
port of a reasonably simple data-only renderer" carve-out describes. But the "reasonably simple,
no custom templates" precondition for that carve-out is what this component does not meet: templates
are not an edge case here, they are two-thirds of its public surface (`contentDef` is not optional
in practice — the empty-content fallback renders nothing). A cheap mobile port that only handles the
no-template case would be cheap because it silently drops the component's actual reason for
existing, which is worse than not shipping one.

The mobile counterpart — a native list view where each row is a platform-idiomatic card, built by
whichever screen needs an audit trail, using each platform's own list primitive
(`FlatList`/`ListView.builder`) directly rather than through this component's template contract —
is a **different component** and gets its own issue in a later wave, same as the virtual-scroller
and paginator precedents.

**This decision has a consequence for `check-theme-parity.mjs`:** that script audits colour roles
across web + 2 mobile ports. It stays untouched by this issue (see §7), so nothing here asserts a
mobile palette for a component that has no mobile port.

---

## 2. Variants built (DoD row 6)

The PrimeNG route's feature list, and what shipped:

| PrimeNG feature | Shipped | Surface |
|---|---|---|
| Vertical layout | ✅ | `layout="vertical"` (default) |
| Horizontal layout | ✅ | `layout="horizontal"` — a real horizontal rail (flex row of column-triplets), not vertical CSS rotated |
| `align="left"` / `"right"` | ✅ | `align="start"` / `"end"` — named for the logical axis, not a physical side (see the `InoTimelineAlign` doc comment in the .ts) |
| `align="alternate"` | ✅ | `align="alternate"` — zig-zags `data-side` per row index, both layouts |
| `opposite` content template | ✅ | `[inoTimelineOpposite]` |
| Custom marker | ✅ | `[inoTimelineMarker]`, context includes the resolved `role` |
| `dataKey` | ✅ | `dataKey` — identity function for `@for`/`trackBy`, defaults to index |
| Marker colour/severity | ✅ | `markerRole` resolver fn → closed `InoTimelineMarkerRole` union (`neutral`/`info`/`success`/`warning`/`danger`), same shape as `ino-tag`'s `severity` |
| Loading / skeleton rows | ✅ | `loading` + `skeletonCount` |
| Interactive/selectable rows | ✅ *(beyond PrimeNG)* | `interactive` — roving-tabindex listbox, `itemSelect`/`focusedIndexChange` outputs |
| Inline style / class passthrough | ❌ **deliberate omission** | See below |

**Deliberate omissions, with reasons:**

- **`[style]` / `[styleClass]` passthrough inputs.** Same reasoning `virtual-scroller/SPEC.md` §2
  and `paginator/SPEC.md` records: an arbitrary style bag is the unsanctioned Layer-4 escape hatch
  (`docs/brand/16-…-parity-vs-echeque-reference.md` §4.3, register item N-11), and
  `check-ds-adherence.mjs` cannot lint a value that arrives as a runtime string.
- **Raw marker colour `@Input`.** PrimeNG's `Timeline` lets a caller set an arbitrary
  `marker.data.color` on each event. This component resolves colour through the closed
  `markerRole` union instead, same trade-off `ino-tag`'s `severity` @Input makes over a free-form
  colour prop: the token pair for each role lives entirely in this component's SCSS, so
  `check-theme-parity.mjs`/`check-ds-adherence.mjs` can audit it, and every theme repaints for
  free.

**Additions beyond PrimeNG**, required by our DoD rather than the benchmark:

- `interactive` mode: a roving-tabindex, arrow-key-navigable listbox — PrimeNG's `Timeline` is
  purely presentational. A reviewer scanning a long audit trail and picking one entry to inspect
  needs a keyboard-operable, `role="listbox"`/`role="option"` shape; forcing every consumer that
  just wants to *display* a trail to deal with focus management would be wrong, so it is opt-in.
- `loading` + `skeletonCount`: PrimeNG's `Timeline` has no first-load state of its own (a consumer
  is expected to build one from scratch). An audit trail is fetched, so a loading state was added.

---

## 3. Eight states: 7 of 8 carried as designed, one is opt-in gated (DoD row 5)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `.ino-timeline__row` base rule per layout |
| Hover | ✅ *(only when `interactive`)* | `:host(.ino-timeline--interactive) .ino-timeline__row:hover` — a non-interactive (read-only log) row has nothing to hover *for*, so no hover affordance is drawn unless a row is actually clickable, matching this component's own "non-interactive by default" design note in the .ts header |
| Active/pressed | ✅ *(only when `interactive`)* | Same gating as hover, plus the marker dot itself swaps to the pressed-accent fill |
| Focus-visible | ✅ *(only when `interactive`)* | `--ino-focus-ring`/`--ino-focus-ring-offset`, never hand-rolled. A non-interactive row is never in the tab order (`rowTabIndex()` returns `-1`), so it has nothing to show a focus ring for either |
| Disabled | ✅ | `[data-disabled]` host attr — dims + `pointer-events: none` on every row |
| Readonly | ✅ | `[data-readonly]` host attr — same "stays legible, only the hover affordance withdraws" trade `paginator/SPEC.md` §3 and `virtual-scroller/SPEC.md` record for the same state on other row-based components: an audit trail must stay fully readable in a locked/reviewed state |
| Invalid | ✅ | `[data-invalid]` host attr — a danger-coloured accent bar (`border-inline-start`, `border-block-start` in horizontal layout) on every row, border only, same "fill stays neutral" rule `virtual-scroller/SPEC.md` records for its own invalid state |
| Loading/busy | ✅ | Two sub-states: **first load** (`value` empty) renders `skeletonCount` placeholder rows; **refresh** (`value` non-empty) dims real rows to 0.75 opacity + `cursor: progress` on interactive rows, `aria-busy` on the host either way |

The hover/active/focus-visible gating behind `interactive` is a deliberate reading of DoD row 5, not
a shortcut: those three states exist to acknowledge a *pointer or keyboard gesture landing on this
element*, and a non-interactive row accepts no such gesture (it has `tabindex="-1"`, no click
handler wired, `role="listitem"` not `"option"`). Drawing a hover highlight over dead input would be
a lie about the row's own affordance — the same reasoning `ino-timeline.component.ts`'s header
comment gives for making `interactive` opt-in in the first place.

---

## 4. Size API (DoD row 3)

Reads four Wave 0 control-size aliases — `--ino-control-height`, `--ino-control-font-size`,
`--ino-control-padding-inline`, `--ino-control-gap` — plus a fifth, non-alias local property
(`--ino-timeline-dot-size`) bound to `--ino-control-icon-size-{sm,default,lg}` per step, since the
marker dot is the one visual element on this component that scales like an icon, not like row
padding or a label. `--ino-control-height` is read only where an `interactive` row needs a real
minimum target size (§5); a non-interactive row's block extent is intrinsic to its content, the
same trade-off `ino-tag`'s SPEC.md §3 makes for a static label versus `ino-button`'s real control.
No local sizing values were invented — every number in the size blocks resolves through
tokens.css §12's existing scale.

`--ino-row-min-height` (DoD row 4) applies only to `interactive` rows (§5), not to every row
unconditionally — a read-only audit-log row has no interaction to guarantee a target size for.

---

## 5. Accessibility contract (DoD row 8)

**Role.** The host is `role="list"` by default, `role="listbox"` when `interactive`; `null` while
`value` is empty and not loading (an empty region announces nothing false). Rows are
`role="listitem"` / `role="option"` to match. `aria-setsize`/`aria-posinset` are set per row from
the true collection length — the same "report the true length, not the rendered window" principle
`virtual-scroller/SPEC.md` §4 records, though here the whole collection is always rendered (no
windowing), so it is a smaller version of the same discipline rather than a load-bearing fix.

**Target size (SC 2.5.8).** `interactive` rows get `min-block-size: var(--ino-row-min-height,
44px)` — the 44px fluid-density comfortable target, never below the 24px floor at any density
rung, per the issue brief's "24px minimum, 44px comfortable" instruction. Non-interactive rows are
exempt: there is no interactive target to size when a row does nothing on click.

### Keyboard map (`interactive` only)

Roving tabindex, one row always at `tabindex="0"` (the rest `-1`), same shape `ino-virtual-
scroller`'s viewport keymap uses for a different unit of navigation:

| Key | Action |
|---|---|
| `ArrowDown` (vertical) / `ArrowRight` (horizontal) | Move to the next row |
| `ArrowUp` (vertical) / `ArrowLeft` (horizontal) | Move to the previous row |
| `Home` / `End` | First / last row |
| `Enter` / `Space` | Emit `itemSelect` for the focused row |

Arrow-key direction is layout-aware (`onRowKeydown()` in the .ts picks the axis from `layout`), and
because it is expressed as `ArrowRight`/`ArrowLeft` rather than "next"/"previous" in the DOM, RTL
gets no special-case: the browser's own key events do not remap under `dir="rtl"`, but neither does
this component claim they do — the axis, not the direction, is what the .ts checks. Genuine RTL
mirroring is a CSS-layer concern (§6), which is where the actual `order`-swap correctness lives; the
key handler only needs to agree with whichever side the CSS actually put the next row on, and
`order` already flips under `dir="rtl"` by the flexbox spec — so this needs no separate branch.

**Contrast and targets.**

- Marker role colours (`--ino-color-info`/`-success`/`-warning`/`-danger`, and
  `--ino-color-on-surface-muted` for `neutral`) are all `check-theme-parity.mjs`-audited pairs; no
  new colour role was introduced.
- The invalid-state accent bar reuses `--ino-color-danger`, the same role `ino-virtual-scroller`
  and `ino-paginator`'s own invalid/danger surfaces already use.
- The dot's separating ring (`border: 2px solid var(--ino-color-surface)`) is `border`, not
  `box-shadow`: `check-ds-adherence.mjs`'s `non-token-shadow` rule requires every `box-shadow` to be
  an elevation token, and this ring is a colour separator between the dot and the connector line
  behind it, not a depth cue — a `box-shadow` would have been the wrong primitive for the job
  regardless of the lint.

---

## 6. RTL

Every declaration in the stylesheet uses logical properties (`margin-inline-start`,
`padding-block-end`, `inset-inline-start`-shaped reasoning throughout — see the file header). The
row triplet's ordering is driven entirely by the CSS `order` property inside a `display: flex` row
(vertical layout) or column (horizontal layout's own row triplet); `order` resolves against the
flex container's own inline/block axis, which flexbox itself flips under `dir="rtl"` — so the
alternating zig-zag (`align="alternate"`) is one code path for both writing directions, the same
guarantee `paginator/SPEC.md` §6 records for its own flex row.

**No known physical-direction exception.** Unlike `ino-paginator`'s nav-icon chevrons (SPEC.md §6)
or `ino-virtual-scroller`'s skeleton shimmer gradient (SPEC.md §5), this component draws no glyph
that has an inherent left/right chirality and no gradient — the shimmer here (`ino-timeline-
shimmer`) is a horizontal sweep exactly like `ino-virtual-scroller`'s, and inherits the same
"aria-hidden decoration behind a `prefers-reduced-motion: no-preference` guard" exemption that
component's SPEC.md records, for the same reason (logical gradient directions are not portably
supported). Recorded here rather than silently omitted.

---

## 7. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

DoD row 11 permits "one appended line in the `check-theme-parity.mjs` component registry." **That
registry does not exist.** The script is a token-contract audit (CSS mirror byte-parity, colour
roles across 3 themes × 2 mobile ports, space/radius/target/duration scales, focus-ring shape,
control-size scale invariants), not a per-component list. No component through this DoD so far —
`ino-alert`/`ino-toast-container`, `ino-virtual-scroller`, `ino-tag`, `ino-paginator` — has added
one either; see `virtual-scroller/SPEC.md` §6 and `paginator/SPEC.md` §7 for the same finding,
recorded independently by each.

- **Nothing appended.** `node scripts/check-theme-parity.mjs` passes unchanged.
- Component-level adherence runs through `check-ds-adherence.mjs`'s whole-scope walk, so this
  directory is linted the moment it exists, with nothing to register.

If a registry is wanted, it should be designed once as a Wave 0 amendment against INO-31 rather than
improvised by whichever component issue lands first.

---

## 8. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (in `web/`) | ✅ passes, no errors. One non-blocking `anyComponentStyle` budget warning (7.34 kB vs. the 4 kB warning threshold, well under the 8 kB error threshold) — the two-layout (vertical/horizontal) × three-order (`start`/`end`) grid plus the full eight-state contract is kept rather than trimmed to chase the warning away, the same call `paginator/SPEC.md` §8 makes for its own budget warning |
| `node scripts/check-theme-parity.mjs` | ✅ passes |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations |
| `node scripts/check-spec-citations.mjs` | ✅ 0 dangling citations |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branches in the component | none |
