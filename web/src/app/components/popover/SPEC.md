# `<ino-popover>` — Popover — INO-31 T-23 / INO-150 component spec

Parity benchmark: PrimeNG 22.1.1 `Popover` (`specs/primeng/llms-22.1.1.txt` line 96, route
`https://primeng.dev/popover`). PrimeNG is a benchmark, **not a runtime dependency** — nothing in
this directory imports it. The pinned digest only carries one summary line for this route (no
per-prop table), same limited-detail situation `confirm-popup/SPEC.md` notes for its pair.

Sibling document: `confirm-popup/SPEC.md`. Both components share a placement primitive and a
focus-containment primitive, but solve genuinely different problems: ConfirmPopup is a fixed
confirm/cancel action pair, Popover is an anchored container for arbitrary projected content (a
filter form, a menu, a preview) — closer to PrimeNG's own Popover/OverlayPanel than to its
ConfirmPopup.

---

## 1. Definition-of-Done disposition (plan rev 9 §2, all eleven rows)

| # | Row | Disposition |
|---|---|---|
| 1 | Zero hardcoded values | **Satisfied.** Every colour/space/radius/duration/shadow/font-size in the stylesheet resolves through a token. `[style.top.px]`/`[style.left.px]` bound from computed JS coordinates are layout geometry, not a design value — same exemption `confirm-popup`'s SPEC §1 row 1 documents, and `[inoFocusTrap]`'s sentinel inline style. `z-index: 1100` and the `scale(0.96)` motion keyframe are structural/geometric, not colour/space/radius/duration/shadow/font-size, and match the exact values already in use by `<ino-confirm-popup>` for the same surface weight. `node scripts/check-ds-adherence.mjs`: zero violations. |
| 2 | Three web themes render correctly | **Satisfied.** `--ino-color-surface-raised`, `--ino-color-border`, `--ino-color-on-surface`, `--ino-elevation-neutral-3` (menu/dropdown/popover-weight shadow, per that token's own doc comment in tokens.css §2) all resolve per theme; `node scripts/check-theme-parity.mjs` passes. |
| 3 | Size API | **Satisfied.** `size: 'sm' \| 'default' \| 'lg'` drives the panel's own padding scale (`--ino-space-4/5/6`, via `[data-size]` host attribute selectors) and is forwarded to the optional close-icon button via `<ino-button [size]>`. |
| 4 | Density | **Deliberate omission**, same reasoning as `<ino-confirm-popup>`'s SPEC §1 row 4: an anchored floating panel has no ambient row to fill; density still reaches the optional close button via the size API. |
| 5 | Eight states | See §4 below — the only interactive chrome this component owns is the optional close-icon button, which inherits hover/active/focus-visible/disabled straight from `<ino-button>`. Readonly/invalid/loading are N/A: Popover has no editable value and no async operation of its own to represent as busy (unlike ConfirmDialog/ConfirmPopup's `loading` input, which blocks a pending confirm action — Popover has no equivalent action to block). |
| 6 | Variants | See §3. |
| 7 | Motion | **Satisfied.** A single `--ino-motion-duration-fast` / `-easing-decelerate` opacity/scale fade, identical weight class to `<ino-confirm-popup>`'s (§2 there explains why `fast` not `base` for an anchored, scrim-less surface), gated by `@media (prefers-reduced-motion: no-preference)`. No directional slide, so nothing to re-mirror per `position`/`effectivePosition` or under `dir="rtl"`. |
| 8 | Accessibility | See §4. |
| 9 | Mobile parity | **Explicit web-only decision.** See §5. |
| 10 | Docs artifact | **Satisfied.** `docs/brand/06-angular-components/popover.md` + `docs/brand/06-angular-components/previews/popover.html` (`<!-- @dsCard group="Overlay" -->`). |
| 11 | Merge hygiene | **Satisfied at the time this component landed** (PR #38), scoped to `web/src/app/components/popover/**` only — `overlay-position.ts` was a temporary **fork** of `confirm-popup`'s copy rather than a shared-file edit, deliberately, because promoting it was out of scope for that issue. INO-271 has since promoted the module to `overlay/overlay-position.ts` (see `overlay/SPEC.md` §1); this component now imports the shared copy and no fork remains. |

---

## 2. Why content is projected rather than typed `heading`/`message` inputs (like ConfirmPopup)

`<ino-confirm-popup>` has a fixed shape (heading, message, confirm/cancel buttons) because its job
is always the same interaction. Popover's job — per the PrimeNG benchmark and the issue's own
"anchored overlay with … dismiss-on-outside-click/escape" framing — is to host *arbitrary* content:
a filter form, a short menu, a preview card. Typing that as inputs would mean either a large
speculative prop surface or silently under-serving real call sites. `<ng-content>` is the correct
shape; `heading` stays as an *optional* convenience input (renders a header row and supplies
`aria-labelledby` for free) because most real popovers do want a short title, not because the
component assumes a fixed structure.

---

## 3. Positioning, and why "flip/shift" here means one flip + a clamp

Same primitive and same physical-`top`/`left` reasoning as `<ino-confirm-popup>`
(`confirm-popup/SPEC.md` §2) — not re-derived here. One addition specific to this issue's wording:
the issue text asks for "flip/shift collision handling." `computeOverlayPlacement` here does both
halves of that phrase, just not as two independently-configurable middleware passes the way Floating
UI models them:

- **Flip** — if the preferred side doesn't fit the viewport, try the opposite side once.
- **Shift** — regardless of which side won, clamp the result to the viewport with an 8px margin so
  the panel never overhangs the edge, sliding along the cross-axis as needed.

A full Floating UI-style engine (independently toggleable flip/shift/size/arrow middleware,
cross-axis `start`/`end` placements, a 12-way placement grid) is explicitly out of scope — this
issue's own benchmark (PrimeNG Popover) ships the same four-cardinal-direction model, not a richer
one, so matching it is matching the stated benchmark rather than under-shooting it.

---

## 4. Accessibility contract (DoD row 8)

**Role, without `aria-modal`.** `role="dialog"` — the page behind the panel stays visible and
mouse-operable (no scrim), so `aria-modal="true"` would misdescribe it, identical reasoning to
`<ino-confirm-popup>`'s `alertdialog` choice. `dialog` rather than `alertdialog` specifically:
arbitrary projected content is not inherently an interruption demanding a yes/no response the way a
confirm prompt is.

**Accessible name is the caller's responsibility, by design.** Pass `heading` (visible header text,
also wired to `aria-labelledby`) or `ariaLabel` (invisible name, for panels whose projected content
already reads as self-describing without a header row — e.g. a single labeled form). Neither is
enforced at compile time: Angular has no mechanism to require "at least one of these two inputs" at
the type level without a runtime check that would itself need to decide what to do when violated
(throw? warn? silently degrade?), and a popover used purely as a positioned container for content
that supplies its own heading element (e.g. an `<h2>` inside the projected content, pointed at by a
caller-supplied `aria-labelledby` on a wrapping element) is a legitimate pattern this component
should not block. This mirrors `<ino-modal>`'s own `heading`-optional, not-enforced contract.

**Focus is still trapped for keyboard users despite not being ARIA-modal.** `[inoFocusTrap]` on the
panel confines `Tab`/`Shift+Tab` while open — pointer users can still reach the rest of the page,
but a keyboard user tabbing through the popover won't be walked into now-partially-obscured content.
`restoreFocus` (the directive's default) returns focus to the anchor element on close, which for the
common `toggle()`/`show()` call path is exactly the button the user just pressed.

**Dismissal.** `Escape` (`closeOnEscape`, default `true`), and a capture-phase `pointerdown` outside
both the panel and the anchor element, gated by `dismissable` (default `true` — PrimeNG's own prop
name for this exact toggle). The optional close-icon button (`showCloseIcon`) is a third, explicit
route for pointer/touch/keyboard users who don't know or trust the implicit dismiss gestures. The
outside-pointerdown listener is deliberately registered on the next macrotask after opening
(`setTimeout`, `runOutsideAngular`) — same reasoning as `<ino-confirm-popup>`'s `activate()`: the
click that opened the popover is still bubbling to `document` on the tick it fires.

**Keyboard map.** `Tab`/`Shift+Tab` cycle within the panel (via `[inoFocusTrap]`); `Escape` closes
(unless `closeOnEscape="false"`). No other component-owned keys — content-specific keys (e.g. arrow
navigation inside a projected menu) are the projected content's own responsibility, same as
`<ino-modal>`.

**Contrast, target size, RTL.** Text against `--ino-color-surface-raised` and the optional
close-icon button both meet the same WCAG 2.2 AA text/non-text contrast and 24px/44px target-size
floors already verified for every other component reading these tokens (`--ino-color-on-surface`,
`ino-button`'s `icon` variant sizing). Positioning math is RTL-safe by construction (§3); every
static style in the stylesheet uses logical properties.

---

## 5. Mobile: web-only, and why (DoD row 9)

**Web-only**, per the issue description's own instruction: "Desktop idiom; the mobile counterpart
is a different component and gets its own issue in a later wave" — the plan rev 9 §5 porting rule
for desktop-idiom components (same rule `<ino-table>` and `<ino-virtual-scroller>` cite). An
anchor-positioned floating panel keyed to `getBoundingClientRect()` and mouse/keyboard dismiss
gestures (hover-adjacent outside-click, Escape) is a desktop pointer-and-keyboard idiom; the native
mobile equivalents (an action sheet, a bottom sheet, a full-screen menu) are different components
with different interaction models, not a themed port of this one.

---

## 6. Variants (DoD row 6)

| Variant axis | Shipped | Notes |
|---|---|---|
| `position: 'top' \| 'bottom' \| 'left' \| 'right'` | ✅ | Same four cardinal directions as `<ino-confirm-popup>` and the PrimeNG benchmark; see §3 for why a finer placement grid is out of scope. |
| `size: 'sm' \| 'default' \| 'lg'` | ✅ | Drives panel padding + the optional close button's size — see §1 row 3. |
| `showCloseIcon` (header close button) | ✅ | PrimeNG ships an equivalent explicit-dismiss affordance; off by default because `Escape` + outside-click already cover dismissal for most call sites, and an always-on close button would visually compete with a short, non-`heading` popover. |
| `heading` (optional header row) | ✅ | See §2 for why this is the one typed convenience input instead of a full typed content contract. |
| Nested/cascading popovers (a popover opening another popover) | ❌ deliberate omission | `[inoFocusTrap]`'s stack already supports this mechanically (topmost trap wins), but this issue ships the single-level case only — no explicit test/demo of nesting, and PrimeNG's own Popover doesn't document a nesting contract either. |

---

## 7. Verification

| Gate | Result |
|---|---|
| `npx ng build` | passes |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs --json` | zero violations |
