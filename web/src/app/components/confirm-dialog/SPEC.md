# `<ino-confirm-dialog>` — ConfirmDialog — INO-31 T-25 / INO-148 component spec

Parity benchmark: PrimeNG 22.1.1 `ConfirmDialog` (`specs/primeng/llms-22.1.1.txt` line 48, route
`https://primeng.dev/confirmdialog`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
in this directory imports it. The `llms-22.1.1.txt` digest only lists the route + one-line
description for ConfirmDialog/ConfirmPopup (no expanded API table), so the variant/input surface
below was derived from the general PrimeNG confirmation-dialog pattern (severity, icon, blocking
confirm) rather than transcribed from a table.

This file records the decisions the DoD requires to be written down rather than silently made. It
is shared with `../confirm-popup/SPEC.md`'s sibling document for the anchored variant; read both if
comparing the pair.

---

## 1. Definition-of-Done disposition (plan rev 9 §2, all eleven rows)

| # | Row | Disposition |
|---|---|---|
| 1 | Zero hardcoded values | **Satisfied.** Every colour/space/radius/duration/shadow/font-size in `ino-confirm-dialog.component.scss` resolves through a `var(--ino-*)` token. No `data-theme` branch anywhere. `node scripts/check-ds-adherence.mjs` reports zero violations in this directory. |
| 2 | Three web themes render correctly | **Satisfied.** Nothing here defines its own color — it consumes `--ino-color-overlay-scrim`, `--ino-color-surface-raised` (via `<ino-card variant="overlay">`), and the button/text roles `<ino-button>` and this file's own type rules already carry through all three themes. `node scripts/check-theme-parity.mjs` passes. |
| 3 | Size API (`sm`/`default`/`lg`) | **Satisfied.** `size: InoControlSize` is forwarded to both `<button ino-button>` actions, which are the reference adoption of the Wave 0 control-size scale (see `ino-button.component.ts`); this component adds no size-dependent CSS of its own beyond that forwarding — the dialog panel's own padding/typography is intentionally size-invariant (see §2). |
| 4 | Density (dense / fluid, `--ino-row-min-height`) | **Deliberate omission.** A confirm dialog is a full-viewport-centered overlay, not a row in a list or table — there is no ambient row height for it to fill or clear. `--ino-control-height`/`--ino-row-min-height` still flow correctly into the two action buttons via the size API (row 3), which is the only row-based surface this component contains. |
| 5 | Eight states | See §2 below — full per-state table. |
| 6 | Variants | See §3 below. |
| 7 | Motion | **Satisfied.** Enter uses `--ino-motion-duration-base` / `--ino-motion-easing-decelerate` (panel) and `-standard` (scrim), matching `<ino-modal>`'s existing motion contract exactly — a caller should not be able to tell dialog and modal apart by feel. `@media (prefers-reduced-motion: no-preference)` gates both keyframes, so `reduce` collapses to an instant, un-animated open — the working reduced-motion branch, not a gap. |
| 8 | Accessibility | See §4 below. |
| 9 | Mobile parity | **Explicit web-only decision.** See §5. |
| 10 | Docs artifact | **Satisfied.** `docs/brand/06-angular-components/confirm-dialog.md` + `docs/brand/06-angular-components/previews/confirm-dialog.html` (first line `<!-- @dsCard group="Overlay" -->`). |
| 11 | Merge hygiene | **Satisfied, with one recorded deviation.** See §6. |

---

## 2. Eight states (DoD row 5)

A confirm dialog is a shell around two buttons and static text, not an input control — most of the
eight states belong to its **action buttons**, which this component deliberately does not
re-implement: it renders `<button ino-button>` and lets that component own hover/active/focus-visible
/disabled entirely, the same way `<ino-toast-container>`'s SPEC documents for its projected
`<ino-alert>`. Re-declaring `:hover`/`:active`/`:focus-visible` rules here targeting the buttons
would be exactly the kind of duplicate implementation this repo's component boundaries exist to
avoid.

| State | Applies to | Disposition |
|---|---|---|
| Default | Panel + both buttons | Satisfied — panel via `<ino-card variant="overlay">`, buttons via `<ino-button>` |
| Hover | Both buttons | **Owned by `<ino-button>`.** Nothing to add here. |
| Active/pressed | Both buttons | **Owned by `<ino-button>`,** including `--ino-color-accent-active`. |
| Focus-visible | Both buttons + panel | **Owned by `<ino-button>`** for the buttons. The panel itself is a `tabindex="-1"` programmatic-focus fallback (only reachable if the dialog opens with no tabbable content, which never happens here since it always renders two buttons) — its `:focus-visible { outline: none }` is the same "invisible programmatic anchor" idiom `<ino-modal>` and `[inoFocusTrap]`'s own container-fallback use, not a hand-rolled ring suppressing a real one. |
| Disabled | Cancel button | **Satisfied.** Cancel is `[disabled]="loading"` — while an async confirm is in flight, cancelling out from under it would leave the caller's promise/observable with nowhere to report back to. Confirm itself is never `disabled`; it uses `loading` instead (below), matching `<ino-button>`'s own contract of keeping the label in the DOM. |
| Readonly | — | **N/A / deliberate omission.** A confirm dialog holds no editable value; there is nothing for "readonly" to mean here, same reasoning `focus-trap`'s SPEC records for its own N/A rows. |
| Invalid | — | **N/A / deliberate omission,** same reasoning as readonly — no form value to validate. |
| Loading/busy | Confirm button | **Satisfied.** `@Input() loading` forwards to the confirm `<ino-button [loading]>`, which shows its inert spinner + `aria-busy` and blocks re-clicks — exactly the API shape named in the issue ("confirm button can be `loading` while an async confirm handler runs"). While `loading`, Escape and backdrop-click are also suppressed (`onKeydown`/`onBackdropClick` both check `!this.loading`) so the whole surface, not just the button, resists dismissal mid-flight. |

---

## 3. Variants (DoD row 6)

| Variant axis | Shipped | Notes |
|---|---|---|
| `severity: 'default' \| 'danger'` | ✅ | Maps straight onto `<ino-button>`'s existing `primary`/`danger` variants (INO-156) — no new color pairing invented, this dialog reuses the audited danger role exactly as `ino-button` already carries it. PrimeNG's ConfirmDialog groups this under `acceptButtonProps`/`severity`; the closed two-value union is the intentionally narrower INOVIXUX equivalent (see `ino-button`'s own variant doc comment for why `danger` — not `warning`/`info` — is the one severity axis this design system carries on filled buttons). |
| Icon slot | ❌ **deliberate omission** | PrimeNG's ConfirmDialog accepts an `icon` per-call option (rendered beside the message). Not added here: this repo's icon system is SVG-via-projection everywhere else (`ino-button` has no icon `@Input()` either; `ino-icon-field`/`ino-input-group` exist specifically so icons are a *wrapper* concern, per `ino-input`'s SPEC.md §1). The unnamed `<ng-content>` slot after `message` already lets a caller project an icon + custom body if they need one; baking a second, parallel `icon` `@Input()` in would contradict that established boundary rather than extend it. |
| Positions | N/A here | Centering is the entire point of the modal variant; anchored positioning is `<ino-confirm-popup>`'s job (see its own SPEC.md §3). |
| Service-driven imperative API (`ConfirmationService`) | ❌ **deliberate omission** | PrimeNG's ConfirmDialog is normally driven by an injectable `ConfirmationService.confirm(...)` so any component can trigger it without template wiring. This repo has no such singleton-overlay-service pattern yet (`ToastService` is the closest precedent, and it queues *toasts*, not confirm/cancel flows with two possible outcomes). Building one is a reasonable follow-up once a second consumer needs it, but doing so here would be exactly the premature "public API beyond what's needed" the issue brief warns against — `[(open)]` + `@Output()`s is sufficient for every current caller and matches `<ino-modal>`'s existing, already-adopted contract. |

---

## 4. Accessibility contract (DoD row 8)

**Role.** `role="alertdialog"`, not `role="dialog"`. The WAI-ARIA APG distinguishes them by purpose:
`dialog` is a modal that contains arbitrary, possibly unrelated content; `alertdialog` is
specifically "a modal dialog that interrupts the user's workflow to communicate an important
message and acquire a response" — exactly what a confirm prompt is, by definition, every time.
`<ino-modal>` correctly keeps `role="dialog"` (it is a generic content shell); this component is not
a themed re-skin of that shell, it is a different semantic surface, hence the different role.

**Labeling.** `aria-labelledby` → `headingId` when `heading` is set (same optional-heading pattern as
`<ino-modal>`). `aria-describedby` → `messageId` when the `message` `@Input()` is set. If a caller
instead projects custom body content via the unnamed `<ng-content>` slot (§3), `aria-describedby` is
**not** wired to it automatically — this component cannot know the projected content's structure or
which part of it is the description, so pointing at it blindly could describe the wrong thing (e.g. a
projected checkbox's own label). A caller doing this should supply their own `aria-describedby` on
the host pointing at whatever content actually serves as the description.

**Keyboard map.**

| Key | Result |
|---|---|
| `Tab` / `Shift+Tab` | Moves between Cancel and Confirm; wraps via `[inoFocusTrap]` on the panel — not reimplemented here (INO-130). |
| `Escape` | Cancels (`closeOnEscape`, default `true`), unless `loading`. |
| `Enter` / `Space` on either button | Native `<button>` activation — no custom key handling needed. |

**Focus.** `[inoFocusTrap]` on the panel supplies capture-on-open (defaults to the first tabbable
element, i.e. Cancel), containment, and restore-on-close entirely — see the component's own doc
comment for why no duplicate focus-management code exists in the `.ts` file. `restoreFocus` (the
directive's default `true`) returns focus to whatever triggered the dialog, satisfying SC 2.4.3
without this component doing anything extra.

**Contrast (SC 1.4.11 / 1.4.3).** Heading uses `--ino-color-on-surface`, message uses
`--ino-color-on-surface-muted` — both audited text roles against `--ino-color-surface-raised`
(`<ino-card variant="overlay">`'s fill) in all three themes, per `check-theme-parity.mjs`'s
high-contrast pair table. Buttons inherit `<ino-button>`'s own audited pairs.

**Target size (SC 2.5.8).** Both actions are `<button ino-button [size]>`, which floors at
`--ino-control-height-sm` = 36px (above the 24px minimum) and reaches 44px/52px at `default`/`lg`
(the 44px comfortable recommendation) — the same guarantee `ino-input`'s SPEC records for its own
size rungs.

**RTL.** `.ino-confirm-dialog__panel`/`__footer`/`__heading`/`__message` use no `left`/`right`/`top`/
`bottom` physical values; `inset: 0` on the fixed wrapper and `justify-content: flex-end` on the
footer are already direction-agnostic (`flex-end` flips automatically under `dir="rtl"`).

---

## 5. Mobile: web-only, and why (DoD row 9)

**Decision: web-only**, matching the issue's explicit instruction. No Capacitor/React
Native/Flutter counterpart ships with INO-148.

This is a scope decision, not a deferred-but-equivalent port: mobile platforms have their own native
idiom for a destructive/blocking confirmation — an action sheet anchored to the bottom of the screen
(iOS `UIAlertController` `.actionSheet` style, Android's Material bottom sheet / dialog patterns),
not a centered card-with-scrim borrowed from the web dialog pattern. The design-system home for that
idiom is a future `ino-confirm-action-sheet` component with its own API (most likely no `severity`
button-styling axis at all, since native action sheets style by row semantics, not filled/danger
buttons) — a mechanical "port this component's props" exercise would produce something that doesn't
look or behave like a native confirmation on either platform. That gets its own issue in a later
wave, per the porting rule in INO-31 plan rev 9 §5.

`<ino-confirm-popup>`'s SPEC.md §5 records the identical decision for the anchored variant, for the
same reason.

---

## 6. Merge hygiene (DoD row 11)

Touches only:
- `web/src/app/components/confirm-dialog/**` (this component)
- `web/src/app/components/confirm-popup/**` (the sibling component from the same issue)
- `docs/brand/06-angular-components/confirm-dialog.md` + `confirm-popup.md`
- `docs/brand/06-angular-components/previews/confirm-dialog.html` + `confirm-popup.html`

**One deviation from the issue brief's row 11 wording**, recorded here rather than silently
resolved, following the precedent `focus-trap/SPEC.md` §6 and `input/SPEC.md` §9 already set for
this exact question: the brief asks for "one appended line in `scripts/check-theme-parity.mjs`'s
component registry." Reading that script confirms — again — that no such registry exists; it is a
pure token-level audit (byte-parity of `tokens.css` across web/Capacitor, RN/Flutter palette
completeness, contrast budgets) with no per-component list anywhere in it. **No edit was made to
that script.** The component-aware gate is its sibling, `scripts/check-ds-adherence.mjs`, which walks
`web/src` automatically and needs no registration step — confirmed by this component contributing
**zero** violations to it (§7). `web/src/tokens.css` was not touched; every value this pair of
components needed already existed.

---

## 7. Verification

| Gate | Result |
|---|---|
| `npx ng build` | passes (component compiled and template-type-checked via a temporary route added, built, then reverted — see PR notes; not part of the shipped diff) |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs --json` | `filesLinted: 278`, `violations: []` (zero violations in this directory or repo-wide) |
