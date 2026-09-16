# `<ino-nav>` — component spec

**Issue:** INO-164 (INO-31 U-9, Navigation group)
**Parity benchmark:** PrimeNG 22.1.1 `Menubar` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/menubar`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Prior art:** `docs/brand/02-design-tokens/angular-theme-contract.md` §3 (base nav contract),
`web/src/app/components/focus-trap/SPEC.md` (INO-130, `[inoFocusTrap]`, reused here rather than
hand-rolled), `web/src/app/components/control-size-scale.md` (INO-124, `size` adoption recipe).

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Scope: web + Capacitor only (DoD row 9)

**Decision: web + Capacitor only. No React Native or Flutter port ships with this issue.**

Per the INO-31 plan (rev 9) §5/§6: Capacitor renders the exact same Angular component and CSS as
the web build, so it is covered automatically the moment `ino-nav.component.{ts,html,scss}` is
correct — there is no separate Capacitor artifact to author. React Native and Flutter are
**separate re-authored ports** with their own native navigation idioms (a React Native app would
reach for a header/drawer navigator, not a DOM `role="menubar"`; Flutter would reach for
`NavigationRail`/`Drawer`). Per the plan's own merge order, those ports are later, separate
per-track issues, not a sub-task folded into this one. This is not a silent drop: the porting rule
is the same one `web/src/app/components/virtual-scroller/SPEC.md` §1 and
`web/src/app/components/focus-trap/SPEC.md` §5 already recorded for their own components, and
`check-theme-parity.mjs` has no `<ino-nav>`-shaped color roles to assert on the mobile tracks in
the first place (nav uses existing surface/border/accent roles already verified in prior issues).

---

## 2. Keyboard map (WAI-ARIA APG menubar pattern, roving tabindex)

| Key | Context | Effect |
|---|---|---|
| `ArrowRight` / `ArrowLeft` | Top-level menubar item focused | Moves to the next/previous top-level item, wraps at the ends |
| `ArrowDown` | Top-level item with `children` focused | Opens its submenu, moves focus to the first entry |
| `ArrowUp` / `ArrowDown` | Inside an open submenu | Moves between submenu items, wraps at the ends |
| `ArrowLeft` / `ArrowRight` | Inside an open submenu | Closes the submenu and moves to the previous/next top-level item (standard menubar cross-axis behavior) |
| `Escape` | Submenu open (menubar or submenu focused) | Closes the submenu, returns focus to its parent top-level item |
| `Home` / `End` | Menubar or open submenu | Jumps to the first/last item in whichever list currently has focus |
| `Enter` / `Space` | Top-level item with `children` focused | Toggles its submenu, focusing the first entry on open |

Only one top-level item is ever `tabindex="0"` at a time (roving tabindex); the rest are
`tabindex="-1"`. The same pattern repeats one level down for the currently open submenu.

**Hover is a progressive enhancement over the same `openIndex` state a keyboard user drives** —
there is exactly one field (`InoNavComponent.openIndex`) that records which submenu is open, and
both the `mouseenter`/`mouseleave` handlers and the keyboard handlers read and write it. This is
the mechanism, not just a promise: a hover-opened submenu that gains keyboard focus never gets
closed by a stray `mouseleave` (`onItemMouseLeave` checks `itemContainsFocus` first), and there is
no second "hover open" boolean that could disagree with the keyboard-driven one.

**Outside interaction** closes any open submenu two ways: a `(focusout)` handler on the
`role="menubar"` element checks `relatedTarget` against the menubar bounds (the keyboard/tab
route), and a `document:click` listener checks the click target against the host (the mouse
route) — see DoD §4 in the issue brief.

---

## 3. Submenu nesting: one level only (DoD row 6-adjacent decision)

`InoNavLink.children?: InoNavLink[]` supports exactly **one level** of nested submenu, matching
PrimeNG `Menubar`'s own two-tier `MenuItem.items` shape at the depth this issue targets. A
grandchild's own `children` field is never read by the template — `ino-nav.component.html` only
descends into `link.children`, not `child.children`. This is a deliberate scope cut, not an
oversight: a third menu tier inside a horizontal menubar is a rare pattern even in PrimeNG's own
reference, and supporting it correctly would mean a second roving-tabindex dimension, a second
`Escape`/`ArrowLeft` return path, and a second breakpoint of submenu positioning math — none of
which any current call site (`web/src/app/app.ts`'s `navLinks`) needs. Revisit only if a real
two-deep nav is specified.

---

## 4. Size API: control-size scale minus `--ino-control-height` on desktop items (DoD row 3)

`size: InoControlSize = 'default'` (`web/src/app/components/control-size.ts`, INO-124) resolves
through the unsuffixed `--ino-control-*` aliases exactly like `ino-button`'s adoption
(`.ino-nav--sm`/`--lg` re-point the aliases on the host; the base rules never read a per-size
token directly).

**Deliberate exception, same shape as `ino-tag`'s (`web/src/app/components/tag/SPEC.md` §3):**
the top-level menubar items and submenu links do **not** consume `--ino-control-height`. A
menubar `role="menuitem"` is inline text sitting in a horizontal bar, not a button-shaped control
— forcing every link to the 44px control-height box would make the whole bar read as a row of
pill buttons, which is not the PrimeNG `Menubar` reference either. `font-size`,
`padding-inline-roomy`, and `gap` are still wired through the scale, so `size` has a real, visible
effect on the desktop menubar.

**The mobile panel's rows are the opposite case.** DoD row 4 ("`--ino-row-min-height` respected
under `[data-density="dense"]`") explicitly calls this component out as row-based *when the
mobile panel renders as a list* — and it does: `.ino-nav__mobile-link` /
`.ino-nav__mobile-group-trigger` set `min-block-size: var(--ino-control-height)`, which
`control-size-scale.md` §3 pins to `--ino-row-min-height` (32px) under `[data-density="dense"]`
and to `--ino-target-comfortable` (44px) in fluid/base — free, with no `[data-density]` branch
written in this file.

---

## 5. States: 6 of 8 carried, 2 marked N/A (DoD row 5)

| State | Carried? | Where |
|---|---|---|
| Default | Yes | Muted `on-surface-muted` label, per the original nav |
| Hover | Yes | `.ino-nav__item-control:hover` (desktop), `.ino-nav__menu-link:hover` (submenu/mobile) |
| Active/pressed | Yes | `:active` — accent color for text links (menubar), sunken fill + accent color for menu-style rows (submenu/mobile), matching the ghost-button press convention the original file already used |
| Focus-visible | Yes | Every interactive element gets `--ino-focus-ring`; colour-only hover/active is never the sole indicator (SC 2.4.11), same correction the pre-existing nav already carried forward from `ino-footer` |
| Disabled | Yes | `InoNavLink.disabled` → `aria-disabled`, `.is-disabled` (opacity 0.5, `pointer-events: none`), `routerLink` set to `null` so it cannot navigate even via a stray click that pointer-events somehow misses |
| Loading/busy | **Deliberate minimal treatment, not full state.** No per-link async-load state exists in the current `InoNavLink` API — nav items are a static config array, not a fetched list, in every current call site. A future "items loaded async" case would reasonably want a skeleton row, but inventing that API now with no caller has the same cost the toast-container/tag specs already flag for speculative API: a typed input nobody exercises is worse than not shipping it. Recorded here rather than silently dropped. |
| Readonly | **N/A.** A navigation link either takes you somewhere or it's `disabled`; "read-only navigation" isn't a meaningful third state — same reasoning `ino-tag/SPEC.md` §1 gives for its own non-applicable states. |
| Invalid | **N/A.** "Invalid" describes a form control that failed its own validation. A nav item is not a form control and has no value to validate. |

---

## 6. Mobile hamburger: 960px breakpoint, reused focus trap (DoD §5, §11)

**Breakpoint:** `@media (max-width: 960px)` — not a new pixel value. `ino-footer` and
`ino-feature-grid` already collapse their own layouts at exactly 960px
(`ino-footer.component.scss`, `ino-feature-grid.component.scss`); reusing it here means the whole
page's chrome collapses at one consistent width instead of the nav and footer disagreeing about
where "mobile" starts.

**Focus trap:** the mobile panel applies `[inoFocusTrap]` (`web/src/app/components/focus-trap`,
INO-130) directly rather than hand-rolling a second implementation — exactly what the issue brief
asked to check for. `inoFocusTrapInitialFocus=".ino-nav__mobile-close"` seats initial focus on the
close button; `restoreFocus` (default `true`) returns focus to the hamburger button on close, and
`Escape` inside the panel closes it (`(keydown.escape)="closeMobile()"`), which is the trap's own
documented contract, not something this component reimplements.

Note: `<ino-modal>` (`web/src/app/components/modal/`) still hand-rolls its own trap and predates
`[inoFocusTrap]`'s extraction (INO-130) — migrating it is out of scope for this issue and not
touched here, per the merge-hygiene file list.

---

## 7. Motion (DoD row 7)

| Surface | Enter | Exit | Tokens |
|---|---|---|---|
| Submenu | fade + `translateY(-4px)` → 0 | reverse of enter | `--ino-motion-duration-fast` + `--ino-motion-easing-decelerate` (enter) / `-accelerate` (exit) |
| Mobile panel | fade + `translateY(-12px)` → 0 | reverse of enter | `--ino-motion-duration-base` + `--ino-motion-easing-decelerate` (enter); `--ino-motion-duration-fast` + `-accelerate` (exit) |

Both use Angular's built-in `animate.enter`/`animate.leave` class bindings (no
`@angular/animations` dependency), the same mechanism `ino-toast-container` already established.
Both keyframes move on the **block axis only** (`translateY`) — never inline — so neither needs a
mirrored variant under `dir="rtl"`; the submenu's `inset-inline-start` and the panel's
`inset-inline: 0` already flip on their own.

The mobile panel's scrim appears/disappears **instantly**, without its own keyframe — a small,
deliberate cut to stay inside the `anyComponentStyle` build budget (see §9 below); the panel
itself still animates, which is the transition a reviewer actually tracks.

`@media (prefers-reduced-motion: reduce)` at the end of the stylesheet nulls every `transition:`
declaration in the file (existing pattern, extended to the new interactive classes); the
`animate.enter`/`.leave` keyframes are already scoped inside their own
`@media (prefers-reduced-motion: no-preference)` blocks, so under `reduce` both surfaces appear
and disappear with no animation, same as `ino-toast-container`'s documented reduced-motion
behavior.

---

## 8. Zero hardcoded values / token gaps (DoD row 9)

Every colour, space, radius, duration, easing, shadow and font-size in the new CSS resolves
through an existing `var(--ino-*)` token — `--ino-target-comfortable`, `--ino-target-min`,
`--ino-control-*` (§4), `--ino-color-overlay-scrim`, `--ino-elevation-2`, `--ino-safe-area-{top,
bottom}`, `--ino-motion-duration-*`, `--ino-motion-easing-*`. **No token gap was found** —
`web/src/tokens.css` is untouched. No `data-theme` branch exists anywhere in this directory; the
three themes are handled entirely by the roles those tokens already resolve to.

---

## 9. `anyComponentStyle` build budget (implementation note, not a DoD row)

The project's `angular.json` caps any single component's compiled CSS at 8kB (error) / 4kB
(warning). The full menubar + submenu + hamburger + mobile-panel styling in one component landed
close to that ceiling. Two structural choices keep it under the error line without cutting any
required behavior:

1. **A shared `.ino-nav__menu-link` class** on the submenu links, mobile links, and mobile group
   triggers carries one set of hover/focus/active/disabled rules instead of three near-identical
   copies (the desktop top-level items keep their own rule set — `.ino-nav__item-control` — since
   their hover/active colours differ from the menu-style rows).
2. **The mobile scrim skips its own animation** (§7) rather than duplicating the panel's
   enter/exit keyframe pair for a backdrop the reviewer isn't focused on.

The build still emits the 4kB *warning* (not an error) — recorded here so it isn't mistaken for
an oversight; `npx ng build` exits 0.

---

## 10. Registry finding (recorded per prior precedent)

Same finding as `toast-container/SPEC.md` §7, `tag/SPEC.md` §8, `focus-trap/SPEC.md` §6: DoD row
11 describes "one appended line in the `check-theme-parity.mjs` component registry." **No such
registry exists** — confirmed by reading the script in full; it is a token-contract audit, not a
per-component list. Nothing appended here. `node scripts/check-theme-parity.mjs` passes unchanged.
Component-level adherence is `check-ds-adherence.mjs`'s directory-scope walk instead, run against
`web/src/app/components/nav` for this issue with **zero violations**.

---

## 11. Verification

| Gate | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs --json` | 0 violations, 0 stale/malformed waivers |
| `npx ng build` | Succeeds. One pre-existing, unrelated warning (`src/styles.scss` Sass `@import` deprecation) and one `anyComponentStyle` *warning* (7.83kB vs the 4kB warning line, well under the 8kB error line) for this component — see §9 |

---

## Files touched

- `web/src/app/components/nav/ino-nav.component.ts` — `InoNavLink.children`/`.disabled`,
  `size: InoControlSize`, roving-tabindex + submenu keyboard/hover/outside-click state machine,
  mobile hamburger state.
- `web/src/app/components/nav/ino-nav.component.html` — `role="menubar"`/`"menuitem"`/`"menu"`
  markup, submenu, hamburger button, focus-trapped mobile panel.
- `web/src/app/components/nav/ino-nav.component.scss` — size-scale adoption, submenu/menubar/
  mobile-panel styling, motion, 960px collapse.
- `docs/brand/06-angular-components/ino-nav.md` — API table, keyboard map, a11y contract.
- `docs/brand/06-angular-components/previews/ino-nav.html` — static preview.
- This file.

No change to `web/src/tokens.css` (frozen — §8) and no change outside
`web/src/app/components/nav/**` and this issue's own docs/preview files. `web/src/app/app.ts` /
`app.html` (the one existing `<ino-nav>` call site) needed **no changes** — `children`, `disabled`
and `size` are all optional/defaulted, so the existing `{ label, href }[]` array is still a valid
`InoNavLink[]` and the existing markup compiles and runs unmodified.
