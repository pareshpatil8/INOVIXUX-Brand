# `<ino-confirm-popup>` — ConfirmPopup — INO-31 T-25 / INO-148 component spec

Parity benchmark: PrimeNG 22.1.1 `ConfirmPopup` (`specs/primeng/llms-22.1.1.txt` line 49, route
`https://primeng.dev/confirmpopup`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
in this directory imports it. See `confirm-dialog/SPEC.md`'s header for the same note about the
digest's limited detail for this pair of components.

Sibling document: `confirm-dialog/SPEC.md`. Read both if comparing the pair — this file only
covers what's genuinely different about the anchored variant; it does not re-derive the
confirm/cancel action contract, which is identical.

---

## 1. Definition-of-Done disposition (plan rev 9 §2, all eleven rows)

| # | Row | Disposition |
|---|---|---|
| 1 | Zero hardcoded values | **Satisfied.** Every colour/space/radius/duration/shadow/font-size in the stylesheet resolves through a token. The one apparent exception — `[style.top.px]`/`[style.left.px]` bound from computed JS coordinates — is layout geometry, not a design value (no different in kind from `[inoFocusTrap]`'s sentinel `position:fixed` inline style being exempt from this row); see §2 below for why it's physical, not logical. `node scripts/check-ds-adherence.mjs`: zero violations. |
| 2 | Three web themes render correctly | **Satisfied.** `--ino-color-surface-raised`, `--ino-color-border`, `--ino-elevation-neutral-3` (menu/dropdown/popover-weight shadow, per that token's own doc comment in tokens.css §2) all resolve per theme; `node scripts/check-theme-parity.mjs` passes. |
| 3 | Size API | **Satisfied,** identically to `<ino-confirm-dialog>` — forwarded to both action buttons via `<ino-button [size]>`. |
| 4 | Density | **Deliberate omission,** same reasoning as `<ino-confirm-dialog>`'s SPEC §1 row 4: an anchored popup has no ambient row to fill; density still reaches the action buttons via the size API. |
| 5 | Eight states | Identical disposition to `<ino-confirm-dialog>`'s SPEC §2 — the action buttons own hover/active/focus-visible/disabled/loading, this component adds nothing. Readonly/invalid are N/A for the same reason (no editable value). |
| 6 | Variants | See §3. |
| 7 | Motion | **Satisfied.** A single `--ino-motion-duration-fast` / `-easing-decelerate` scale-in, gated by `@media (prefers-reduced-motion: no-preference)` — deliberately faster than the dialog's `-duration-base` (§2 below explains why) and a plain opacity/scale fade with **no directional slide**, so there is nothing to re-mirror per `position`/`effectivePosition` or under `dir="rtl"`, unlike `<ino-toast-container>`'s per-edge slide direction. |
| 8 | Accessibility | See §4. |
| 9 | Mobile parity | **Explicit web-only decision** — identical reasoning to `<ino-confirm-dialog>`'s SPEC §5; not re-derived here. |
| 10 | Docs artifact | **Satisfied.** `docs/brand/06-angular-components/confirm-popup.md` + `docs/brand/06-angular-components/previews/confirm-popup.html` (`<!-- @dsCard group="Overlay" -->`). |
| 11 | Merge hygiene | **Satisfied** — see `confirm-dialog/SPEC.md` §6, which covers both components in the pair; not duplicated here. |

---

## 2. Positioning is physical on purpose, and why the motion is faster than the dialog's

**Why `top`/`left`, not `inset-block-start`/`inset-inline-start`.** `overlay-position.ts`'s
`computeOverlayPlacement` takes its anchor rectangle from `Element.getBoundingClientRect()`, which
always reports coordinates in physical viewport space (top-left origin), *already correctly
reflecting the mirrored layout* when the page is `dir="rtl"` — a right-anchored button in an RTL
layout simply has a smaller `.left` value, exactly as it visually appears. If this component instead
wrote that same physical `left` value into the *logical* property `inset-inline-start`, the browser
would re-interpret it a second time relative to `dir` and mirror an already-mirrored coordinate —
placing the popup on the wrong side of its anchor under RTL. Using physical `top`/`left` for a
JS-computed, `getBoundingClientRect()`-derived position is the standard, RTL-correct technique used
by essentially every anchored-overlay library (Floating UI, Popper) for exactly this reason. The
DoD row 8 "logical properties only" rule is written for *static, declarative* CSS; it does not
extend to coordinates computed from a physical measurement API, and treating it as if it did would
introduce the actual RTL bug the rule exists to prevent.

Everything else in the stylesheet — the panel's padding/radius/border, the arrow's border sides per
`effectivePosition`, the footer's gap — uses logical properties throughout, same as every other
component in this repo.

**Why the enter motion is `fast`, not `base`.** `<ino-confirm-dialog>` uses `-duration-base` because
it's a full-attention interruption with a scrim — the slightly slower entrance matches
`<ino-modal>`'s existing feel and gives the scrim fade time to register before the content arrives.
`<ino-confirm-popup>` has no scrim and is anchored to something the user just clicked; a `base`-speed
entrance here would read as sluggish for what is functionally closer to a menu/tooltip appearing.
`-duration-fast` matches the weight class `--ino-elevation-neutral-3` (menu/dropdown/popover) already
implies for this surface in tokens.css §2's own comments.

---

## 3. Variants (DoD row 6)

| Variant axis | Shipped | Notes |
|---|---|---|
| `position: 'top' \| 'bottom' \| 'left' \| 'right'` | ✅ | Named exactly in the issue's API-shape section. `computeOverlayPlacement` flips once to the opposite side if the preferred side doesn't fit the viewport, then clamps — see `overlay-position.ts`'s own doc comment for why that's the deliberate stopping point rather than a full auto-placement engine (start/end cross-axis variants, `top-start`/`top-end` etc.) are not built; PrimeNG's own ConfirmPopup ships the same four cardinal directions, not the finer 12-way grid some popover libraries offer, so this matches the stated benchmark rather than under- or over-shooting it. |
| `severity: 'default' \| 'danger'` | ✅ | Same as `<ino-confirm-dialog>`, same `InoConfirmSeverity` type (imported from `../confirm-dialog/ino-confirm-dialog.component`, not duplicated) — one axis, one type, shared by both halves of the pair. |
| Icon slot, service-driven imperative API | ❌ deliberate omission | Same reasoning as `<ino-confirm-dialog>`'s SPEC §3 rows for both; not re-derived here. |

---

## 4. Accessibility contract (DoD row 8)

**Role, without `aria-modal`.** `role="alertdialog"` for the same reason as `<ino-confirm-dialog>`
(§4 there) — it's still an interruption demanding a yes/no response. `aria-modal` is deliberately
**omitted** here (vs. `aria-modal="true"` on the dialog): `aria-modal` tells assistive technology
that everything outside the dialog is inert and hidden from the accessibility tree while it's open,
which is true for the backdrop-blocked `<ino-confirm-dialog>` but is **not** true here — there is no
scrim, the rest of the page stays visually present and mouse-operable, and a screen reader user could
reasonably still want to reach it. Asserting `aria-modal="true"` on a surface that doesn't actually
block the rest of the page would be an accessibility-tree lie, not a stricter guarantee.

**Focus is still trapped for keyboard users despite not being ARIA-modal.** `[inoFocusTrap]` on the
panel confines `Tab`/`Shift+Tab` while open, same mechanism as the dialog. This is a deliberate,
narrower guarantee than `aria-modal` would imply: *pointer* users can still interact with the rest of
the page (there's no scrim blocking clicks), but a *keyboard* user tabbing through the popup won't be
walked back out into content that's now partially obscured by the floating panel — the WAI-ARIA APG
explicitly allows non-modal dialogs to still manage focus this way. `restoreFocus` (the directive's
default) returns focus to the anchor element on close, which for the common `toggle()` call path is
exactly the button the user just pressed.

**Dismissal.** Three independent routes, matching the "click outside closes it" expectation for any
anchored popup: `Escape` (`closeOnEscape`, default `true`, suppressed while `loading` — same rule as
the dialog), a `Cancel` button click, and a capture-phase `pointerdown` outside both the panel and
the anchor element. The outside-pointerdown listener is deliberately registered on the next macrotask
after opening (`setTimeout`, `runOutsideAngular`), not synchronously — see `ino-confirm-popup.component.ts`'s own doc
comment on `activate()`: the same click that opened the popup (e.g. via `toggle($event)`) is still
bubbling to `document` on the tick it fires, and a synchronously-attached listener would see that
bubbling click and close the popup it just opened.

**Keyboard map, labeling, contrast, target size.** Identical to `<ino-confirm-dialog>`'s SPEC §4 —
same `<button ino-button>` actions, same `aria-labelledby`/`aria-describedby` wiring pattern against
this component's own `headingId`/`messageId`, same audited text roles, same size-driven target
floor. Not re-derived here.

---

## 5. Mobile: web-only, and why (DoD row 9)

Identical decision and reasoning to `<ino-confirm-dialog>`'s SPEC §5 — no Capacitor/React
Native/Flutter port ships with this issue; an anchored-popup confirmation is even less native-idiomatic
on mobile (touch targets are typically too small/close together for a precisely-anchored floating
panel to reliably avoid covering its own anchor), reinforcing rather than contradicting that decision.

---

## 6. Merge hygiene (DoD row 11)

See `confirm-dialog/SPEC.md` §6 — covers both components in this issue together, including the
one recorded deviation (no line appended to `scripts/check-theme-parity.mjs`, because it has no
per-component registry to append to).

---

## 7. Verification

| Gate | Result |
|---|---|
| `npx ng build` | passes (see `confirm-dialog/SPEC.md` §7 note on how template type-checking was exercised) |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs --json` | zero violations |
