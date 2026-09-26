# `<ino-tabs>` / `<ino-tab-panel>` — component spec

**Issue:** INO-135 (INO-31 T-26, Tier 1 / Panel group)
**Parity benchmark:** PrimeNG 22.1.1 `Tabs` — `specs/primeng/llms-22.1.1.txt` line 116, route
`https://primeng.dev/tabs` ("Tabs is a container component to group content with tabs"). PrimeNG is
a benchmark, **not a runtime dependency**; nothing here installs it.
**Depends on:** W0-2 (INO-124, control-size scale), W0-1 (INO-122, `--ino-focus-ring`), W0-5
(INO-127, motion contract) — all merged before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Interactive: 7 of 8 states carried, 1 folded into another (DoD row 5)

Unlike `ino-tag` (a presentational label whose SPEC.md §1 declares four states N/A), this component
**is** a control: it owns focus, takes keyboard input, and changes application state. Every state in
the DoD list is therefore real here, and all of them are implemented.

| State | Carried? | Surface |
|---|---|---|
| Default | ✅ | `--ino-color-on-surface-muted` label, transparent 2px `border-block-end` — the inactive rung |
| Hover | ✅ | Label promotes to `--ino-color-on-surface`. Suppressed on `readonly` non-active tabs (§below) and on `:disabled`, so hover never promises an activation the handler will refuse |
| Active/pressed | ✅ | `:active:not(:disabled)` → `--ino-color-accent-active` (the W0 pressed-fill role, INO-123). Never hand-rolled |
| Focus-visible | ✅ | `outline: var(--ino-focus-ring)` with a **negative** `outline-offset` — see §8 |
| Disabled | ✅ | Native `[disabled]` on the tab `<button>` + `--ino-color-on-surface-subtle`. Skipped by arrow-key navigation and by the uncontrolled-mode initial pick |
| Readonly | ✅ | `data-readonly` on the tablist. Focus model is untouched (arrows still move, tabs still focusable); `selectTab()` and `closeTab()` both refuse, the ✕ affordance is not rendered, and non-active tabs get `aria-disabled="true"` |
| Invalid | ✅ | `--ino-color-danger-text-safe` label + a 6px dot before it (so validity is never colour-only, SC 1.4.1) + `aria-invalid="true"` on the tab |
| Loading/busy | ✅ | Spinner replaces the invalid dot in the tab, `aria-busy="true"` on both the tab and the panel; the panel body renders a centred spinner while the content loads. The label never leaves the DOM (same rule as `ino-button`'s loading state) |

**Selected vs. active/pressed — two different things.** The DoD's "active/pressed" row means `:active`
(the mouse-held moment). A tab's *selected* state is `aria-selected` + the accent underline, and is
not one of the eight. Both exist and neither is spelled with the other's tokens.

**`disabled` is native, not `aria-disabled`.** The APG suggests keeping a disabled tab focusable so
it stays discoverable. We use the native attribute anyway because it gives click-blocking, Enter/
Space-blocking and the AT "dimmed" announcement for free, with no chance of the three drifting apart;
the discoverability cost is small on a strip that is, by construction, entirely visible at once.
`readonly` is the state that *does* need focusable-but-inert, and that's exactly what it implements —
which is also why both states exist rather than one.

---

## 2. Size API: the full control-size scale (DoD row 3)

`size="sm" | "default" | "lg"`, typed as the shared `InoControlSize` union from
`web/src/app/components/control-size.ts` — imported, never re-declared locally.

The host maps it to the Wave 0 aliases in exactly the recipe `tokens.css` §12 documents (a
`:host([data-size='…'])` block re-pointing the bare alias), so every value below is the scale's, not
this component's invention:

| Alias | Used for |
|---|---|
| `--ino-control-height` | tab `min-block-size`; scroll-button `inline-size`/`block-size` |
| `--ino-control-padding-inline-roomy` | tab `padding-inline` — the *roomy* rung, matching `ino-button`, because a tab is a label-only target that needs the wider grip |
| `--ino-control-font-size` | tab label |
| `--ino-control-gap` | gap between spinner/dot, label and ✕ |
| `--ino-control-icon-size` | ✕ glyph box (floored at `--ino-target-min`, §8) |

No off-scale sizes exist: `--ino-control-height-default` is 44px fluid / 32px dense, both of which
this component takes verbatim.

---

## 3. Density (DoD row 4)

Dense and fluid both work **for free**, because the density blocks in `tokens.css` §10 redefine the
control-size aliases themselves — the component reads `--ino-control-height`, not `44px`, so a
`[data-density="dense"]` ancestor shrinks the strip to a 32px rung with no component-level branch.
`prefers-reduced-motion`, theme and density are thus all "ancestor decides, component obeys".

**`--ino-row-min-height` is deliberately not read.** That token is the floor for a *row* in a
row-based surface (a table row, a list item in `ino-metric-panel`) so that a control dropped into a
dense row cannot be shorter than the row that contains it. A tab strip is not row-based: it is a
horizontal band of controls whose own height *is* the band's height, and there is no enclosing row
whose floor it could fall below. Applying it would be a second, competing height source next to
`--ino-control-height` — the drift the scale exists to prevent. (`ino-tag` reads it for the opposite
reason: a tag is inline content that *does* sit inside other people's rows.)

---

## 4. Variants (DoD row 6)

| Named in the issue | Shipped | Surface |
|---|---|---|
| Scrollable | ✅ | `scrollable` @Input — horizontal overflow + ‹/› buttons, which appear only when `hasOverflow` (a `ResizeObserver` on the track) is true |
| Closable | ✅ | `closable` on the **panel**, not the strip — closability is per-tab. Emits `(tabClose)`; the component never removes the panel itself (§7) |
| Disabled | ✅ | `disabled` on the panel; the strip skips it in keyboard nav and in the uncontrolled initial pick |
| Controlled / uncontrolled | ✅ | `[activeId]` bound → controlled (consumer owns selection); `activeId` omitted → the component picks the first enabled panel and owns selection from then on |

### Against the PrimeNG benchmark

PrimeNG 22 ships Tabs as a four-part composition — `Tabs` / `TabList` / `Tab` / `TabPanels` /
`TabPanel`. This component collapses that to **two** parts (`ino-tabs` + `ino-tab-panel`) and derives
the tablist from the projected panels.

- **`TabList` / `TabPanels` as separate authorable elements — deliberately omitted.** Their only job
  in PrimeNG is to let a consumer re-order or re-style the strip vs. the panel region independently.
  Splitting them here would let a caller emit a `TabList` whose `Tab` set doesn't match the
  `TabPanel` set — a broken `aria-controls` graph that no amount of component code can repair. One
  declaration site for both halves makes that state unrepresentable, and is what lets the ids
  (`{id}-tab` / `{id}-panel`) be generated rather than hand-wired.
- **Vertical orientation — deliberately omitted.** The issue scopes this to a Panel-group tab strip;
  `aria-orientation="horizontal"` is stated explicitly on the tablist and the arrow-key map is the
  horizontal one. A vertical tablist is a different keyboard map (Up/Down) and a different indicator
  edge (`border-inline-start`); it can be added later as an `orientation` input without breaking any
  of the decisions above, and is recorded here rather than quietly dropped.
- **Manual activation — deliberately omitted.** The APG allows either automatic (selection follows
  focus) or manual (arrows move focus, Enter/Space selects). We implement **automatic**, which the
  APG prefers when panel content is cheap to render, *and* still honour Enter/Space so the manual
  muscle memory is not punished. A `loading` panel is the expensive case, and it is handled by
  showing a busy panel rather than by changing the activation model.
- **`Tabs` scroll buttons** exist in PrimeNG behind `scrollable`; same here.

---

## 5. Motion (DoD row 7)

| Moving thing | Duration | Easing |
|---|---|---|
| Tab label colour, tab background | `--ino-motion-duration-fast` | `--ino-motion-easing-standard` |
| Active underline (`border-color`) | `--ino-motion-duration-base` | `--ino-motion-easing-standard` |
| Panel enter (opacity + `--ino-space-1` rise) | `--ino-motion-duration-base` | `--ino-motion-easing-decelerate` |
| Tab / panel loading spinner | `--ino-motion-duration-slow` | `linear` (a rotation has no start or end to ease) |

The underline is slower than the label because it is the element the eye tracks across the strip;
the label is a colour swap that should feel instantaneous. Both are named tokens, never a literal ms.

**Panel exit is instant, on purpose.** The outgoing panel is unmounted the moment `active` flips.
Animating it out would keep stale content painted while the incoming tab's content is already being
announced — a correctness problem, not a taste one.

**`prefers-reduced-motion: reduce`** has two branches, because CSS alone cannot cover this component:

1. The stylesheet branch kills the tab transition, and both spinners + the panel-enter animation are
   declared *inside* `@media (prefers-reduced-motion: no-preference)` so they never start.
2. `scrollBy()` reads the media query **from JS** (`prefersReducedMotion()`), because the ‹/›
   buttons' smooth scroll is a script-driven animation (`ScrollToOptions.behavior`) that no CSS
   branch can reach. Under reduce it becomes an instant jump.

---

## 6. Keyboard map (DoD row 8)

Roving tabindex: exactly one tab is `tabindex="0"` (the selected one); every other is `-1`. So one
Tab press enters the strip and one leaves it, regardless of how many tabs there are.

| Key | Action |
|---|---|
| `Tab` | Moves into the strip (landing on the selected tab), then out of it to the panel |
| `ArrowRight` | Focus + select the next enabled tab, wrapping. **RTL-aware**: reversed when the computed `direction` is `rtl` |
| `ArrowLeft` | Focus + select the previous enabled tab, wrapping. Same RTL flip |
| `Home` | First enabled tab |
| `End` | Last enabled tab |
| `Enter` / `Space` | Select the focused tab (a no-op under automatic activation, kept for muscle memory and for `readonly`-aware symmetry) |
| `Delete` / `Backspace` | Close the focused tab if it is `closable` — the APG "tabs with close buttons" key. `Backspace` is included because that is what an unmodified Mac Delete key emits |

Disabled tabs are skipped by every movement key, not merely refused on activation. Under `readonly`,
every movement key still works and every activation/close key is refused.

---

## 7. ARIA contract (DoD row 8)

| Element | Contract |
|---|---|
| Track | `role="tablist"`, `aria-orientation="horizontal"` |
| Tab | `role="tab"`, `id="{id}-tab"`, `aria-controls="{id}-panel"`, `aria-selected`, roving `tabindex`, plus `aria-busy` / `aria-invalid` / `aria-disabled` (readonly) as applicable |
| Panel | `role="tabpanel"`, `id="{id}-panel"`, `aria-labelledby="{id}-tab"`, `aria-busy` while loading, `hidden` while inactive, `tabindex="0"` |
| Scroll buttons | Plain `<button>`s with `aria-label="Scroll tabs backward/forward"`. In the tab order on purpose — they are the only pointer-free way to reach an off-screen tab for a user who does not use arrow keys |

Ids are **derived**, never hand-wired: `panelId`/`tabButtonId` are computed from the panel's `id`
(itself defaulted to a module-scoped counter), so the `aria-controls` ↔ `aria-labelledby` pair cannot
be mismatched by a caller. This is the concrete payoff of collapsing PrimeNG's `TabList`/`TabPanels`
split (§4).

**The panel is always `tabindex="0"`.** The APG only requires this when the panel holds no focusable
element, but the panel's content is arbitrary projected markup, so the component cannot know which
case it is in without walking the subtree on every change. A permanently focusable panel is the safe
side of that trade: a redundant tab stop, rather than an unreachable region.

**The ✕ is not a nested control.** A `<button>` (or anything with `role="button"`) inside the tab
`<button>` is invalid HTML and unreachable for keyboard and AT users — the original markup had a
`role="button" tabindex="-1"` span, which is both. The shipped form is:

- a **presentational** `aria-hidden` ✕ span that handles pointer clicks (`stopPropagation`, so
  closing does not also select),
- the `Delete`/`Backspace` key on the tab itself for the keyboard path (§6),
- and a visually-hidden `", closable — press Delete to close"` suffix, so the affordance and its key
  are part of the tab's accessible name instead of an invisible control.

**Close is a request, not a mutation.** `(tabClose)` emits an id; the consumer removes the panel from
its own list. The component cannot remove a projected content child it did not create. When the
removal lands, `@ContentChildren.changes` re-runs `syncPanels()`, which re-picks an active tab in
uncontrolled mode if the closed one was selected.

---

## 8. Contrast, target size, RTL (DoD rows 2 and 8)

**Contrast.** Every colour is a semantic role already audited across dark / light / high-contrast by
`node scripts/check-theme-parity.mjs`: `--ino-color-on-surface` (selected label),
`--ino-color-on-surface-muted` (idle), `--ino-color-accent` (underline + focus ring),
`--ino-color-accent-active` (pressed), `--ino-color-danger-text-safe` (invalid — the *text-safe* red,
not the fill red, exactly because this is text on a surface), `--ino-color-on-surface-subtle`
(disabled — decorative-only by that token's own contract, which is why disabled is never the sole
carrier of meaning). `--ino-color-border` carries the 1px strip rule; the selected tab is
additionally distinguished by a 2px accent underline, so the essential boundary clears 3:1 in all
three themes without relying on the hairline.

**No `[data-theme]` branch exists anywhere in the component** (DoD rows 1–2) — the three themes are
purely a token re-resolution, including high-contrast's thicker `--ino-focus-ring` (3px).

**Target size (SC 2.5.8).** Tabs are `--ino-control-height` tall (44px fluid — the *comfortable*
rung; 32px dense, still above the 24px floor) and at least
`2 × --ino-control-padding-inline-roomy` wide. The scroll buttons are a full control-height square.
The ✕ needed a fix: `--ino-control-icon-size` is 20px fluid / 16px dense, both **under** 24px, so its
hit box is `max(var(--ino-control-icon-size), var(--ino-target-min))` — `max()` rather than a flat
24px so that `lg`'s 24px icon is not shrunk.

**Focus ring.** `outline: var(--ino-focus-ring)` with `outline-offset: calc(-1 * var(--ino-focus-ring-offset))`.
The offset is **negated** (drawn inside the tab) rather than taken as-is, because a scrollable
tablist is an `overflow-x: auto` box: an outward ring on the first or last tab would be clipped by
the scroll container exactly when it matters. The ring is never hand-rolled — width, colour and
per-theme thickness all come from the W0 token.

**RTL.** The stylesheet is logical-property-only: `inline-size`/`block-size`,
`min-inline-size`/`min-block-size`, `padding-inline`, `margin-inline-end`,
`border-block-end`/`border-inline-start-color`. No `left`/`right`/`top`/`bottom` declarations, and no
`margin-left`-style physical shorthand. Two places needed explicit handling because logical CSS does
not reach them:

1. **Arrow keys** — `ArrowRight` must mean "previous" in RTL; the component reads the computed
   `direction` and flips the step.
2. **`scrollBy()`** — `ScrollToOptions.left` is physical, so the sign is flipped in RTL. Without
   this, the ‹/› buttons scroll away from the content on an Arabic or Hebrew locale.
3. **The ‹/› glyphs themselves** are directional *meaning*, not layout: `:host(:dir(rtl))` mirrors
   them with `scaleX(-1)`. Their box positions already reverse for free with the flex row.

---

## 9. Mobile parity (DoD row 9)

**All three tracks ship.**

- **Capacitor** — not a separate port, and not an omission: `mobile/capacitor/app/src/` contains only
  `app/`, `index.html`, `main.ts`, `styles.scss` and imports web components through the `@web-app/*`
  path alias (root `package.json` workspace note / INO-99). The same Angular component and SCSS run
  in the WebView. Same finding as `ino-tag` SPEC.md §7 and plan rev 9 §5 ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoTabs.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_tabs.dart`.

**Why RN/Flutter ship rather than taking a "web-only" decision.** The precedent in this repo is that
*interactive* components get ported: `InoButton.tsx` / `ino_button.dart` are full ports with press
state, disabled, loading and the control-size scale, and they drop only the states with no
touch-platform meaning (hover, `:focus-visible`), documenting the drop in their header comments. A
tab strip is a navigation surface that appears in the mobile screen inventory in the same way a
button does; declaring it web-only would be a bigger claim than the evidence supports.

**Scope of the ports — a controlled tab *strip*, not a tab *system*.**

| Web feature | RN / Flutter |
|---|---|
| Controlled `activeId` + change callback | ✅ — parent always owns the active id (there is no uncontrolled mode; see below) |
| `size` (sm/default/lg) | ✅ — `control` / `InoControlSize` from the mobile token files |
| `scrollable` | ✅ — `ScrollView horizontal` / `SingleChildScrollView`, without ‹/› buttons (a touch surface scrolls by dragging; the buttons exist on web only because a mouse has no drag-to-scroll) |
| `closable` | ✅ — a real tappable ✕ (unlike web, where it must not be a nested control: RN/Flutter have no "interactive inside interactive" HTML restriction, and the close target gets its own 44px `hitSlop`/`InoTarget.comfortable` box) |
| `disabled`, `invalid`, `loading`, `readonly` | ✅ |
| Content panels | ❌ — the ports render the **strip only** and return the active id; the parent renders content. RN and Flutter both already have first-class ways to hold per-tab content (a parent `switch`, `IndexedStack`, a navigator) and none of them are content projection. Re-implementing `<ng-content>` semantics would be inventing a worse version of the platform's own idiom |
| Uncontrolled mode | ❌ — deliberate. Web has it because an Angular template can declare tabs without any backing state; RN/Flutter callers always have a state hook/`State` already, so an internal fallback would just be a second source of truth for the active tab |
| Keyboard map, roving tabindex, focus ring | ❌ — no equivalent. External-keyboard focus is an OS-level highlight on both platforms; same drop, for the same reason, that `InoButton` documents for `:focus-visible` and `hover` |
| RTL arrow/scroll sign flips | N/A — no arrow keys and no `scrollBy()`; both platforms mirror their own scroll axis |

**No new mobile tokens were invented.** The ports read only existing fields:
`colors.{onSurface,onSurfaceMuted,onSurfaceSubtle,accent,accentActive,border,surfaceRaised,dangerTextSafe}`,
`control[size]`, `radius`, `space`, `targetComfortable`, `motion` (RN) and their `InoPalette` /
`InoControlSize` / `InoRadius` / `InoSpace` / `InoTarget` / `InoMotion` equivalents (Flutter). The
mobile palettes are dark/light/high-contrast mirrors of the same roles, so all three themes work
there for the same reason they work on web.

**The OS bottom tab bar is a different component.** `InoTabs` here is the in-content tab strip that
mirrors `<ino-tabs>`. A platform bottom tab bar (safe-area insets, badges, icon+label stacking,
navigator integration) is not on the register yet and is not this issue.

---

## 10. Merge hygiene (DoD row 11)

**`scripts/check-theme-parity.mjs` was not modified**, and the DoD row is not being silently ignored.
Re-verified for this issue, the way `ino-tag` SPEC.md §8 and `ino-virtual-scroller` SPEC.md §6 both
did: row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but
**no such registry exists in that file** — it is a pure token-contract audit (CSS mirror byte-parity,
colour roles across 3 themes × 2 mobile ports, space/radius/target/duration/control-size scales,
form-label set). `git log -- scripts/check-theme-parity.mjs` shows its most recent commits (INO-163,
INO-125, INO-124, INO-92) all changed *token* assertions; none added a per-component list. Inventing
one unilaterally would put a new shared structure in the single file every other in-flight component
branch also touches — exactly the conflict surface row 11 exists to prevent.

Component-level token adherence is covered instead by `scripts/check-ds-adherence.mjs`, which walks
`web/src`, `mobile/react-native/src` and `mobile/flutter/lib` by directory and needs no registration.
It caught one real violation in this component during development (a legacy `margin: -1px` in the
sr-only helper) which was fixed rather than waived — see the comment on `.ino-tabs__sr-only`.

**`web/src/tokens.css` was not touched** (frozen after Wave 0). No token gap was found: every value
this component needs already had a semantic role. The two places where a literal survives are a `1px`
/ `2px` border width and the 6px invalid dot — neither has a token scale in this design system (there
is no `--ino-border-width-*` set), and both match the literals `ino-tag` and `ino-alert` already use
for the same shapes. Recorded here as the only known gap, not as a request to unfreeze.

**Files touched by this issue:** `web/src/app/components/tabs/**`,
`docs/brand/06-angular-components/tabs.md`, `docs/brand/06-angular-components/previews/tabs.html`,
`mobile/react-native/src/components/InoTabs.tsx`, `mobile/flutter/lib/widgets/ino_tabs.dart`.
Nothing else.

---

## 11. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (file unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ `0 violations · 0 stale waivers` (no waiver added for this component) |
| `cd web && npx ng build` | ✅ `Application bundle generation complete` |
| Hardcoded colour / space / radius / duration / font-size | none — every one resolves through a token (§10 records the two border-width/dot literals) |
| `[data-theme]` branch in the component | none |
| Physical `left`/`right`/`top`/`bottom` in the SCSS | none — §8 |
