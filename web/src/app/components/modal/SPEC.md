# `<ino-modal>` — component spec

**Issue:** INO-162 (INO-31 U-7, Wave 1 uplift)
**Parity benchmark:** PrimeNG 22.1.1 `Dialog` — `specs/primeng/llms-22.1.1.txt` line 53, route
`https://primeng.dev/dialog`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it. The static index has no per-prop variant list for Dialog (just the one-line
description + route); the size/maximize/drag surface below is built against this repo's own DoD
rather than a scraped live page, same practice `tag/SPEC.md` and `virtual-scroller/SPEC.md`
followed for their own benchmarks.
**Depends on:** W0-2 (INO-124, control-size scale) and T-11 (FocusTrap) — both already merged onto
this branch before this issue started.
**Closes:** pending item **P-1** in `docs/brand/16-design-system-parity-vs-echeque-reference.md`
(modal focus trap, WCAG 2.1.2, previously "asserted but never tested" — see focus-trap/SPEC.md's
own framing of the same item) and the Dialog row in that doc's gap table ("⚠️ centred only; no
maximize/drag/size").

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. What changed vs. the pre-uplift component

| Before | After |
|---|---|
| No `size` input | `size: 'sm' \| 'default' \| 'lg'` (`InoControlSize`), default `'default'` — unchanged visual behavior for every existing caller that doesn't set it |
| Centred only, fixed 480px width | Same 480px `default` width; `sm` (360px) / `lg` (720px) added |
| No maximize | `maximizable` + two-way `[(maximized)]`, off by default |
| No drag | `draggable`, off by default |
| Tab-trap + focus capture/restore hand-rolled in this component (`focusableElements()`, `focusFirst()`, `previouslyFocused`) | Deleted. `[inoFocusTrap]` (T-11) placed on `.ino-modal__panel` owns all of it |
| `Escape` handled here | Unchanged — the trap deliberately owns no dismissal keys (focus-trap/SPEC.md §3) |

Every new input defaults to today's behavior, so no existing call site changes appearance or
behavior by upgrading.

---

## 2. DoD disposition, row by row

### Row 1 — Zero hardcoded values

Every colour/space/radius/duration/shadow/font-size in the stylesheet resolves through a token.
The three panel widths (360/480/720px) are **not** in that list — width is not one of the six
fields row 1 names, and this repo already has precedent for a component-owned pixel width with no
backing token (`ino-alert.component.scss`'s 360px `max-width`). `tokens.css` is frozen after Wave
0; no new token was requested or added. No `[data-theme]` branch anywhere in the component.

### Row 2 — Three web themes

`node scripts/check-theme-parity.mjs` passes unchanged (nothing here needed a new colour role — the
component already consumed `--ino-color-overlay-scrim` / `--ino-color-surface-raised` /
`--ino-elevation-2` pre-uplift via `<ino-card variant="overlay">`).

### Row 3 — Size API, and why width isn't part of the control-size scale

`size` is a typed `InoControlSize` input, imported from `../control-size` (no local union — same
rule `control-size-scale.md` §3 states). It drives two things through the **existing** Wave 0
aliases, the same adoption recipe every other Wave 1 component uses:

- The header icon buttons (`.ino-modal__close`, `.ino-modal__maximize`): `width`/`height` read
  `--ino-control-height`, icon `width`/`height` read `--ino-control-icon-size`. A `sm`/`lg` panel
  re-points both aliases exactly like `:host(.ino-btn--sm)` re-points them for `ino-button`.
- Nothing else — no `--ino-control-padding-inline` or `--ino-control-gap` consumer exists in this
  component (the header/body/footer already have their own space-token gaps that don't vary by
  dialog size; making a dialog's internal gutter row-relative would be the wrong axis, since a
  dialog is a page-level surface, not a row).

**What size does NOT drive: panel width.** The control-size scale's six fields (control-size-scale.md
§2) are all shaped for an interactive *control* — height, inline padding, font-size, icon-size,
gap. None of them is a container footprint, and the scale's largest space step (`--ino-space-11`,
96px) is nowhere near dialog scale. Forcing panel width through that scale would mean inventing a
seventh field the other 16+ consumers of the scale don't have and don't need — worse than the
alternative, which is what `ino-alert` already does: a plain component-owned constant. `sm`/`lg`
therefore pick constants (360px / 720px) around the unchanged 480px `default`, the same shape of
decision `ino-alert.component.scss` made for its own single width, just extended to three rungs.

### Row 4 — Density

Not row-based; nothing here reads `--ino-row-min-height`. The header icon buttons still resolve
correctly under `[data-density="dense"]` because they read the *bare* `--ino-control-height` alias,
which every density block re-resolves (`control-size-scale.md` §4) — this component needed zero
density-specific code of its own.

### Row 5 — Eight states

| State | Carried | Where |
|---|---|---|
| Default | ✅ | `--ino-color-surface-raised` via `<ino-card variant="overlay">` |
| Hover | ✅ | Close/maximize buttons: `--ino-color-surface-sunken` fill |
| Active/pressed | ✅ | Close/maximize buttons: `--ino-color-accent-active` on-colour, same shape as `ino-button`'s ghost press |
| Focus-visible | ✅ | Close/maximize buttons: `--ino-focus-ring` + `--ino-focus-ring-offset`, never hand-rolled. The panel itself sets `outline: none` at `:focus-visible` deliberately — it is the FocusTrap's programmatic fallback target (focus-trap/SPEC.md §3's "container" case), not something a keyboard user lands on while any real content exists, so an outline there would flash on every open |
| Disabled | ✅ (vacuous but present) | `.ino-modal__close`/`.ino-modal__maximize` carry the same `&:disabled` rule as every other icon control in this repo (dimmed + `pointer-events: none`), for a caller that disables the maximize action mid-drag-resize elsewhere. Neither button ships `disabled` from this component's own logic today — recorded as unused-but-correct plumbing, not a state this component drives itself |
| Readonly | N/A — not carried | A dialog is a container, not a form control; "readonly" has no meaning for a surface that has no value of its own to protect from edits |
| Invalid | N/A — not carried | Same reasoning as readonly — no value, no validation |
| Loading/busy | N/A — not carried | The modal has no async data-fetch state of its own; a caller showing a loading spinner puts it in the projected body content, same as any other `ng-content` consumer would |

### Row 6 — Variants

| Named in the issue | Shipped |
|---|---|
| Size API (sm/default/lg) | ✅ §3 above |
| Maximize | ✅ `maximizable` + `[(maximized)]`, toggle button in header, `aria-pressed` |
| Drag | ✅ `draggable`, pointer-drag on the header, clamped so the panel can never leave the viewport entirely (§4 below) |
| Footer action shelf | ✅ already existed (`[ino-modal-footer]` projection through `<ino-card>`'s footer slot) — DoD row didn't ask for a change here, listed for completeness against the gap table's "⚠️ projected, no named slot" line, which was already stale before this issue (the slot has been named since the component's original build) |
| Edge positioning (Drawer) | ❌ deliberately out of scope — gap table rebaselines this to a separate `Drawer` component (T-24), not `ino-modal` |

### Row 7 — Motion

Scrim fade + panel rise reuse the pre-existing `--ino-motion-duration-base` /
`--ino-motion-easing-standard` / `--ino-motion-easing-decelerate` tokens, gated on
`prefers-reduced-motion: no-preference`, unchanged from before this issue. The rise animation is
skipped for a `--maximized` panel (`:not(.ino-modal__panel--maximized)`) — a maximize/restore
toggle is a state change on an already-open dialog, not an entrance, so replaying the "rise from
below" entrance on every toggle would misrepresent what just happened; the maximize/restore size
change itself is not animated for the same reason PrimeNG's own Dialog and every native OS window
manager leave maximize instantaneous — animating a large-area resize is exactly the kind of motion
`prefers-reduced-motion` readers are most likely to be sensitive to, and there is no accessibility
requirement forcing it to be animated. Drag has no motion of its own by construction: the panel
tracks the pointer 1:1, which is correct interaction feedback, not something to ease.

### Row 8 — Accessibility

**Role/ARIA.** `role="dialog"` + `aria-modal="true"` on the panel (unchanged). `aria-labelledby`
points at the heading when one is supplied (unchanged). Maximize button: `aria-label` toggles
"Maximize"/"Restore" with the action, `aria-pressed` reflects `maximized` — the same toggle-button
pattern as the theme switcher in `ino-nav.component.html`.

**Keyboard map.** `Tab`/`Shift+Tab` contained by `[inoFocusTrap]` (focus-trap/SPEC.md §3).
`Escape` closes when `closeOnEscape` (unchanged, owned here per focus-trap's explicit non-goal).
Close/maximize buttons are native `<button>` elements — `Enter`/`Space` activate them for free.
**Drag has no keyboard equivalent** and this is a deliberate, WCAG-conformant omission, not a gap:
SC 2.5.7 (Dragging Movements) requires a single-pointer *non-dragging* alternative for anything a
drag gesture is the only way to accomplish. Nothing here is drag-only — the dialog is fully usable,
including being moved into view of content it might occlude, without ever touching the header,
because closing/reopening or maximizing are always available as the non-drag alternative to "the
dialog is somewhere inconvenient." Dragging only repositions a surface that already has a complete
non-drag task path.

**Focus.** Delegated to `[inoFocusTrap]` in full: initial focus into the panel, contained
Tab-cycling, restore-on-close. This component no longer touches `document.activeElement` itself.

**Contrast / non-text contrast.** Unchanged token pairs, already audited. The maximize icon (new)
uses `stroke="currentColor"` against the same `--ino-color-on-surface-muted` /
`--ino-color-on-surface` pair the close icon already used — no new colour to audit.

**Target size.** Close/maximize buttons are `--ino-control-height` square — 36/44/52px across
sm/default/lg, all above the 24px SC 2.5.8 floor and at/above the 44px comfortable target at
`default`/`lg`.

**RTL.** No physical `left`/`right`/`top`/`bottom` added. The drag transform
(`translate3d(x, y, 0)`) is computed from raw pointer deltas in viewport pixels, which is correct
in both directions by construction — a drag gesture follows the pointer, it does not mirror; this
is the same reasoning a native OS window manager's title-bar drag uses, and mirroring it under RTL
would make the dialog visually disagree with the pointer, which is the actual bug a mirrored
implementation would introduce. `margin-inline-start: auto` (header actions) and the pre-existing
logical properties are unchanged.

### Row 9 — Mobile parity

See §4 below — all three tracks, per the issue text.

### Row 10 — Docs artifact

`docs/brand/06-angular-components/modal.md` + `docs/brand/06-angular-components/previews/modal.html`
(first line `<!-- @dsCard group="Overlay" -->`).

### Row 11 — Merge hygiene, and the same `check-theme-parity.mjs` deviation prior issues recorded

Only `web/src/app/components/modal/**`, this issue's own docs/preview files, and
`docs/brand/16-design-system-parity-vs-echeque-reference.md`'s Dialog row (a table-cell status
edit, not a shared script) are touched. `web/src/tokens.css` is untouched — no new token was
needed.

Same finding `tag/SPEC.md` §8 and `virtual-scroller/SPEC.md` §6 already recorded: row 11's "one
appended line in the `check-theme-parity.mjs` component registry" describes a registry that does
not exist in that file (it is a token-contract audit script, not a component list).
**Nothing appended; `node scripts/check-theme-parity.mjs` passes unmodified.**
`check-ds-adherence.mjs`'s directory-scope walk covers component-level adherence instead — **zero
violations** in `web/src/app/components/modal/` (confirmed via `--json`, filtered to this
directory).

---

## 3. Drag — implementation notes

- Handle: the header (`.ino-modal__header`), excluding its buttons (`pointerdown` bails via
  `event.target.closest('button')` so the close/maximize buttons keep working under a draggable
  header).
- State: a single `signal({ x, y, active })`, not a plain field. `pointermove`/`pointerup` are
  attached to `document` (not the template) because a fast drag routinely leaves the header's
  bounds mid-gesture, and only `document`-level listeners keep tracking it. This app runs zoneless
  Angular; a plain field written from a listener attached outside a template binding never marks
  the OnPush view dirty (the exact trap `focus-trap/SPEC.md` §7 already documents from its own test
  harness), so the offset has to be a signal for `[style.transform]` to actually repaint.
- Clamp: `clampDrag()` keeps at least 80px of the panel reachable on every edge, computed against
  the panel's `getBoundingClientRect()` captured once at drag-start plus `window.innerWidth/Height`
  read live — a dialog has no scrollbar of its own, so letting it go fully off-screen would strand
  it with no recovery path except closing and reopening.
- Reset: offset zeroes on close (`syncOpenState()`) and on every maximize/restore toggle
  (`toggleMaximize()`) — a maximized panel ignores the transform entirely
  (`.ino-modal__panel--maximized { transform: none !important }`), and restoring to a stale drag
  offset from before maximizing would put the dialog somewhere the user never actually dragged it
  to.
- Suspended, not merely visually inert, while `maximized`: `onHeaderPointerDown` returns early, so
  a maximized dialog can't accumulate a drag offset that then jumps into view on restore.

---

## 4. Mobile parity (DoD row 9)

**All three tracks, per the issue text** — this overrides the general Wave-2 porting-rule table
(`17-phase-2-implementation-program.md` §5), which is scoped to Tier-1/Wave-2 components and lists
`ConfirmDialog(web)` (a different, not-yet-built component, T-25) as web-only, not `ino-modal`.

- **Capacitor**: not a port. `mobile/capacitor/app`'s `ino-confirm-action-sheet` already wraps
  `<ino-modal>` directly (`@web-app/components/modal/ino-modal.component`), so this track gets the
  full size/maximize/drag surface automatically the moment `web/` rebuilds — no file in
  `mobile/capacitor/**` needed to change for this issue. Verified: the confirm-action-sheet wrapper
  doesn't set `size`/`maximizable`/`draggable`, so it keeps exactly its pre-uplift 480px centred
  behavior, which is what a delete-confirmation sheet should look like — no regression.

- **React Native / Flutter — real ports, with `maximize` and `drag` recorded as web-only.**
  `mobile/react-native/src/components/InoModal.tsx` and `mobile/flutter/lib/widgets/ino_modal.dart`
  ship the base dialog: `size` (sm/default/lg width), `open`/`onClose`, backdrop dismiss, Escape
  has no mobile equivalent so the hardware back button/gesture (RN `onRequestClose` /
  Flutter `PopScope`) is wired as its platform equivalent instead. Neither port ships
  `maximizable`/`draggable`:
  - **Maximize** has no meaning on a platform where every dialog already renders inside a
    fixed-size screen with its own native chrome (status bar, home indicator/nav bar) — "bigger
    than the default dialog size" on mobile is simply "use a full-screen route," a navigation
    decision the call site makes by presenting a screen instead of a dialog, not a runtime toggle
    on the dialog itself. Neither RN's `Modal` nor Flutter's `Dialog`/`showDialog` has a
    maximize concept for this reason.
  - **Drag** is the same desktop-idiom call the porting rule already makes for `ino-modal`'s
    sibling `ConfirmActionSheet` (a bottom sheet — dismissed by drag-to-dismiss on both RN and
    Flutter, a *different* gesture with different semantics than desktop's drag-to-reposition).
    Repositioning a centred dialog by dragging its title bar is a mouse-and-window-manager
    interaction with no mobile counterpart; touch platforms reposition content by scrolling the
    *screen*, not by picking up a floating window. Building it would be re-implementing a
    convention neither platform's own dialog primitive has.
  - Both omissions are the same shape as `virtual-scroller/SPEC.md`'s "three desktop-idiom
    features with no mobile counterpart" and `focus-trap/SPEC.md` row 3/4 — recorded per row 6,
    not silently dropped.
  - Focus containment: RN sets `accessibilityViewIsModal` on the dialog's root view (iOS) and Android
    gets the same behavior from `Modal`'s own native presentation; Flutter's `showDialog` already
    scopes focus via `FocusScope` by construction — both are the platform-native equivalent
    `focus-trap/SPEC.md` §5 already decided FocusTrap itself would not try to replace.

---

## 5. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (web) | ✅ passes |
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs --json`, filtered to `components/modal/` | ✅ zero violations |
| Hardcoded colour/space/radius/duration/font-size | none — every value in that set resolves through a token; the three panel widths are the one recorded, precedented exception (§2 row 1) |
| `[data-theme]` branch in the component | none |
| Automated component test | none added — no other Wave 1 uplift (`ino-button` U-1, `ino-tag` T-12, `ino-virtual-scroller` T-3) added an Angular TestBed spec either; `[inoFocusTrap]` itself already carries 15 passing tests (`focus-trap/ino-focus-trap.spec.ts`) covering the exact Tab-containment/restore behavior this component now delegates to, rather than this file, entirely |
