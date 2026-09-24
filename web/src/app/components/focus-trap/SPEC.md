# FocusTrap — INO-31 T-11 / INO-130 component spec

Parity benchmark: PrimeNG 22.1.1 `FocusTrap` (`specs/primeng/llms-22.1.1.txt`). PrimeNG is a
benchmark, **not a runtime dependency** — nothing in this directory imports it.

Closes pending item **P-1** in `docs/brand/16-design-system-parity-vs-echeque-reference.md`
(modal focus trap, WCAG 2.2 SC 2.1.2): that row was an assertion in a document with no executable
check behind it. `ino-focus-trap.spec.ts` is the executable check.

---

## 1. What this component is

A **behaviour-only primitive**. It renders no box, no background, no border, no text and has no
intrinsic size. Its entire output is a change in where keyboard focus can go, plus two
`aria-hidden`, zero-opacity sentinel spans that exist to be tab stops and nothing else.

That fact determines most of this document. Eight of the eleven Definition-of-Done rows in
INO-31 plan rev 9 §2 are written for components that *paint*. Rather than invent visual API to
satisfy them, each is recorded below as either satisfied, vacuous, or a deliberate omission with
a reason. **A vacuous row is recorded, not silently dropped** — that is what plan rev 9 §2 row 6
requires.

Two forms ship, backed by one implementation:

| Form | Use when |
|---|---|
| `[inoFocusTrap]` directive | You already own the container element. `<ino-modal>` puts it directly on `.ino-modal__panel`, so the `role="dialog"` element and its content stay adjacent. |
| `<ino-focus-trap>` component | You want to wrap projected content and do not own a container. |

The component applies the directive via `hostDirectives`, so it adds **no wrapper node** — the
trap operates on the `<ino-focus-trap>` host itself, and the two forms cannot drift because there
is only one implementation.

---

## 2. Definition-of-Done disposition (plan rev 9 §2, all eleven rows)

| # | Row | Disposition |
|---|---|---|
| 1 | Zero hardcoded values | **Satisfied, vacuously.** The component declares no colour, space, radius, duration, shadow or font-size at all, so there is nothing to route through a token. The only CSS it emits is `:host { display: block }`, an `outline: none` on the `tabindex="-1"` container-fallback state, and the sentinel's structural inline style (`position/inset/width/height/opacity/pointer-events`). None of those is a design value. No `data-theme` branch exists anywhere in the directory. Confirmed by `node scripts/check-ds-adherence.mjs`: **zero violations** in this directory. |
| 2 | Three web themes render correctly | **Satisfied, vacuously.** Nothing here resolves a colour role, so there is no per-theme rendering to differ and no contrast pair to audit. `node scripts/check-theme-parity.mjs` passes. The trap deliberately never touches the focus ring of the elements it contains — those keep whatever `--ino-focus-ring` their own component paints, which is how the ring stays correct in all three themes for free. |
| 3 | Size API (`sm`/`default`/`lg`) | **Deliberate omission.** A focus trap has no height, no padding and no text; a `size` input would be a typed input that changes nothing observable. Adding one to satisfy the row would be worse than omitting it — it would imply the Wave 0 control-height scale applies here, and a consumer could reasonably expect `size="lg"` to do something. The container's size is whatever the consumer's own element is. Recorded here per row 6. |
| 4 | Density (dense / fluid, `--ino-row-min-height`) | **Deliberate omission,** same reason as row 3. The trap is not row-based and contributes no height. Density is correct through it by construction: the trap changes no layout, so projected content lays out exactly as it would have without it. `display: block` (not `display: contents`) is the one layout decision — see §4. |
| 5 | Eight states | **Partially applicable.** `disabled` is real and is the PrimeNG-parity input (`inoFocusTrapDisabled` ↔ `pFocusTrapDisabled`); it suspends containment and releases focus. The other seven (default, hover, active/pressed, focus-visible, readonly, invalid, loading/busy) are **visual** states of a painted control and have no meaning for a primitive that paints nothing — the trap has no surface to hover, press, or mark invalid. It never hand-rolls an outline; the single `outline: none` is scoped to `:host([tabindex='-1']:focus)`, the programmatic container-fallback focus the user cannot reach by keyboard. Real focus rings on projected controls are never touched. |
| 6 | Variants | **Satisfied.** PrimeNG's `FocusTrap` ships one behaviour and one option (`pFocusTrapDisabled`); there is no variant axis to match. We ship that option plus three additions the four consumers need — `autoFocus`, `initialFocus`, `restoreFocus` (§3). All omissions from rows 3, 4 and 5 are recorded in this file rather than dropped. |
| 7 | Motion | **Deliberate omission.** The component animates nothing: focus movement is instantaneous by definition, and animating it would be an accessibility defect, not a feature. There is therefore no duration or easing token to name and no `prefers-reduced-motion` branch to write — a reduced-motion branch guarding zero animation would be dead code. Enter/exit motion belongs to the *consuming* surface (Modal, Drawer, Popover), which owns its own transition. |
| 8 | Accessibility | **Satisfied — this row is the component.** Full contract in §3 and in `docs/brand/06-angular-components/focus-trap.md`. Summary: no role or ARIA of its own (the trap is a mechanism, not content; the consumer owns `role="dialog"`/`aria-modal`); sentinels are `aria-hidden="true"` so virtual-cursor users never meet them; SC 2.1.2 satisfied in both directions — focus is *contained* while active and *released* on disable/destroy, which is the half hand-rolled traps usually miss; SC 2.4.3 satisfied by `restoreFocus`. No text and no non-text contrast to audit (row 2). No target size to audit — the sentinels are not pointer targets (`pointer-events: none`) and are unreachable by mouse. RTL-safe: the sentinel style uses `inset-block-start`/`inset-inline-start`, never `top`/`left`. |
| 9 | Mobile parity | **Explicit web-only decision.** See §5. |
| 10 | Docs artifact | **Satisfied.** `docs/brand/06-angular-components/focus-trap.md` plus `docs/brand/06-angular-components/previews/focus-trap.html`, whose first line is `<!-- @dsCard group="Misc" -->`. |
| 11 | Merge hygiene | **Satisfied.** Only `web/src/app/components/focus-trap/**` and the two docs files are touched. `web/src/tokens.css` is **not** modified — no new token was needed, since the component consumes none. See §6 for the one deviation from the row's literal wording. |

---

## 3. API and accessibility contract

| Input (directive / component alias) | Type | Default | Behaviour |
|---|---|---|---|
| `inoFocusTrapDisabled` / `disabled` | `boolean` | `false` | Suspends the trap without removing the directive. PrimeNG parity input. Flipping back to `false` re-activates **and re-runs auto-focus** — the behaviour a Drawer wants on re-open. |
| `inoFocusTrapAutoFocus` / `autoFocus` | `boolean` | `true` | Moves focus into the container on activation. Defaults `true` because every consumer is a dialog-like surface and APG requires initial focus to land inside. |
| `inoFocusTrapInitialFocus` / `initialFocus` | `string` | `''` | CSS selector resolved within the container. Falls back to the first tabbable element, then the container itself. Preferred over the `autofocus` attribute, which browsers apply inconsistently to dynamically inserted DOM. |
| `inoFocusTrapRestoreFocus` / `restoreFocus` | `boolean` | `true` | On deactivate or destroy, returns focus to whatever held it before activation — SC 2.4.3. |

Method: `refresh()` re-reads tabbable content after a DOM change the host's own `childList`
observer cannot see (e.g. a deep descendant becoming enabled). Sentinel placement is maintained
automatically and needs no call.

**Keyboard map.** `Tab` from the last tabbable element wraps to the first; `Shift+Tab` from the
first wraps to the last. Everything in between is the browser's native tab order, untouched. The
trap defines **no other keys** — in particular it does *not* handle `Escape`. Dismissal is the
consuming surface's decision and its `Escape` handler, because only the consumer knows whether
closing is permitted (a ConfirmDialog mid-submit may refuse).

**Why sentinels instead of a `keydown` handler.** The superseded implementation inside
`<ino-modal>` intercepted `Tab`, computed the focusable list and called `preventDefault()` at the
boundaries. That cannot see focus it never receives a keydown for: focus moved by browser chrome
(address bar, Find bar, devtools), by an `<iframe>`'s internal tab order, or programmatically by
third-party script. Two `tabindex="0"` sentinels as first and last child let the browser's native
tab order do the work — focus landing on a sentinel *means* "you tabbed off the end", so wrapping
is a plain focus move rather than a cancelled keystroke. A capture-phase document `focusin` guard
catches the remaining escape routes.

**Nesting.** Active traps form a stack; only the topmost enforces containment. A ConfirmDialog
opened over an open Modal takes over cleanly and hands control back on close, instead of the two
fighting over `document.activeElement`. One shared document listener serves every trap.

**Tab order fidelity.** `tabbables()` returns positive `tabindex` values first in ascending order,
then `tabindex="0"` elements in document order — the order the browser itself uses. A naive
`querySelectorAll` order would wrap to the wrong element whenever a consumer uses a positive
`tabindex`.

---

## 4. Two implementation decisions worth recording

**`display: block`, not `display: contents`.** `contents` would remove the host from layout
entirely, which is superficially the right answer for a component that should be invisible to
layout. It also removes it as a containing block and breaks the `tabindex="-1"` empty-container
fallback in some engines. `block` is deliberate.

**Visibility test walks ancestors; it is not `offsetParent === null`.** The superseded modal code
used the `offsetParent` shortcut. `offsetParent` is `null` for *any* `position: fixed` element, so
a fixed-position action bar inside a dialog would have been silently dropped from the trap.

---

## 5. Mobile: web-only, and why

**Decision: web-only.** No React Native or Flutter counterpart ships with this issue.

This is not a porting shortcut — the component has no mobile counterpart to port. A focus trap
exists because a pointer-and-keyboard document has a single linear tab order that a modal surface
must fence off. Neither mobile platform has that construct:

- **React Native** has no DOM tab order. The equivalent concern is the accessibility focus order,
  handled by `accessibilityViewIsModal` (iOS) and `importantForAccessibility="no-hide-descendants"`
  (Android) — declarative platform flags set on the *overlay*, not a wrapping trap component.
- **Flutter** already ships `FocusScope`/`FocusTrap` semantics in the framework; a modal route
  scopes focus by construction. Re-implementing it would fight the framework.

The mobile counterpart is therefore a **different component with a different API**, and gets its
own issue in a later wave, per the porting rule in INO-31 plan rev 9 §5. Nothing in this
directory is a candidate for mechanical translation.

---

## 6. One deviation from row 11's literal wording

Row 11 asks for "one appended line in the `check-theme-parity.mjs` component registry."
**That registry does not exist.** `scripts/check-theme-parity.mjs` is a token-level audit — it
compares `tokens.css` against the React Native and Flutter mirrors and checks contrast budgets.
It has no per-component list to append to, and nothing in it is component-aware.

The component-aware gate is its Wave 0 sibling, `scripts/check-ds-adherence.mjs`, which **walks
`web/src` automatically**. A new component directory is picked up with no registration step, so
there is no line to append there either. Both scripts were run; parity passes, and this directory
contributes zero adherence violations.

No edit was made to either script. Flagging it here rather than inventing a registry to append to.

---

## 7. Verification

| Gate | Result |
|---|---|
| `npx ng test --watch=false` | 15/15 pass (13 directive + 2 component form) |
| `npx ng build` | passes |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs` | **zero violations in this directory** (`--json`, filtered to `focus-trap`). The script's repo-wide total moves independently as other Phase 2 issues land; this component contributes nothing to it and touches no file outside its own scope, per row 11. |

**A note on the test harness.** The host components in `ino-focus-trap.spec.ts` hold state in
signals, not plain fields. Under Angular 22's zoneless change detection a plain field assignment
never marks the view dirty, so `fixture.detectChanges()` refreshes nothing and a test that flips
an input silently asserts against the *previous* binding. `changeDetectorRef.markForCheck()` does
not rescue it; a signal write is what schedules the refresh. Three tests failed this way before
the fix, and none of the three failures was a defect in the trap.
