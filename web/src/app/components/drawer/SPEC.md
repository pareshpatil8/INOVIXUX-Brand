# `<ino-drawer>` — component spec

**Issue:** INO-151 (INO-31 T-24, Tier 1 / Overlay group)
**Parity benchmark:** PrimeNG 22.1.1 `Drawer` — `specs/primeng/llms-22.1.1.txt` line 57, route
`https://primeng.dev/drawer`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Depends on:** T-11 — `[inoFocusTrap]` (INO-130), merged before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Zero hardcoded values (DoD row 1)

Every colour/radius/duration/easing/font-size resolves through a semantic token
(`--ino-color-*`, `--ino-radius-*`, `--ino-motion-*`, `--ino-type-h3-*`, `--ino-target-comfortable`,
`--ino-elevation-2`, `--ino-safe-area-{top,bottom}`). No `data-theme` branch exists anywhere in the
component. `node scripts/check-ds-adherence.mjs web/src/app/components/drawer` passes with zero
violations.

The three structural dimensions (400/320/480px panel width for `start`/`end`, 360/240/480px panel
height for `top`/`bottom`) are declared directly rather than through a token, the same precedent
`<ino-modal>` already set with its 480px `max-width` (`ino-modal.component.scss`) — overlay-panel
geometry is not on the Wave 0 control-height scale, which governs form-control rows, not panel
shells.

## 2. Three web themes (DoD row 2)

`node scripts/check-theme-parity.mjs` passes. The panel reads `--ino-color-surface-raised` /
`--ino-color-border-soft` / `--ino-color-on-surface` / `--ino-color-on-surface-muted` /
`--ino-color-accent-active` / `--ino-color-overlay-scrim`, all of which are already audited for
contrast across dark / light / high-contrast by the existing token-layer checks in
`check-theme-parity.mjs` — no new color role was introduced.

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` is the closed `InoControlSize` union (`control-size.ts`). Unlike a
form control, size does not drive `--ino-control-height` here — it drives the panel's cross-axis
dimension (width for `start`/`end`, height for `top`/`bottom`), per §1.

## 4. Density (DoD row 4)

**Deliberate omission.** `<ino-drawer>` is not row-based — it has no repeating list rows and no
`--ino-row-min-height` concern. Its interior content (whatever the caller projects) inherits
whatever density mode is active on the page exactly as `<ino-modal>`'s content does today; the
drawer shell itself contributes no row height to opt into a scale.

## 5. Eight states (DoD row 5): 4 of 8 carried on the shell, 1 on the close control, 3 N/A

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | Panel base rule |
| Loading/busy | ✅ | `loading` `@Input` → `[data-loading]` host attr (0.75 opacity dim + `cursor: progress`, same treatment `ino-paginator` uses) + `[attr.aria-busy]="true"` on the panel, for async drawer content (e.g. a record still fetching) |
| Hover | ✅ (close button only) | `.ino-drawer__close:hover` |
| Active/pressed | ✅ (close button only) | `.ino-drawer__close:active`, pressed-accent foreground — no fill to darken on a ghost-style button, same rationale `web/src/app/components/paginator/SPEC.md` §3 records for its own buttons |
| Focus-visible | ✅ (close button only) | `--ino-focus-ring` / `--ino-focus-ring-offset` — never a hand-rolled outline. The panel's own `tabindex="-1"` programmatic-focus fallback explicitly suppresses its outline (`&:focus-visible { outline: none }`), same as `<ino-modal>`'s panel, because that focus is never reached by keyboard navigation — it's the focus-trap's container-of-last-resort target (see `[inoFocusTrap]` SPEC.md §3) |
| Disabled | ❌ **N/A** | A drawer is not a control that can be disabled. The correct way to prevent dismissal is `closeOnEscape="false"` / `closeOnBackdrop="false"`, already shipped — a `disabled` input would duplicate that with a confusing name |
| Readonly | ❌ **N/A** | Same reasoning as Disabled — no notion of a write-restricted overlay container |
| Invalid | ❌ **N/A** | No form-validity concept to fail, same reasoning `web/src/app/components/paginator/SPEC.md` §3 records for its own non-form container state |

## 6. Variants (DoD row 6)

PrimeNG's `Drawer` ships `position` (`left`/`right`/`top`/`bottom`/`full`), `modal`, `dismissible`
(backdrop-click), `showCloseIcon`, `closeOnEscape`, `blockScroll`.

| PrimeNG variant | Shipped | Notes |
|---|---|---|
| `position="left"` / `"right"` | ✅ as `position="start"` / `"end"` | Logical names, not physical — the API itself states the RTL contract instead of leaving it to CSS alone, same convention `ino-toast-container`'s `-start`/`-end` position names already set (`toast-container/SPEC.md` §2) |
| `position="top"` / `"bottom"` | ✅ | Unchanged names — top/bottom are block-axis and unambiguous under RTL |
| `position="full"` | ❌ **deliberately omitted** | Full-screen is not a fifth position value here — it is the automatic mobile-breakpoint behavior every position already gets (DoD row 9, §9 below). A caller who wants a full-viewport panel on desktop too can already reach it: `size="lg"` on `start`/`end` plus a wide viewport, or the mobile breakpoint on narrow ones. Adding a distinct `full` position would be a second way to express the same box with no new capability |
| `modal` | ✅ | Default `true`. `false` renders a persistent, non-blocking panel: no scrim, `[inoFocusTrapDisabled]="true"`, no body-scroll lock, no `aria-modal` attribute |
| `dismissible` | ✅ as `closeOnBackdrop` | Renamed for symmetry with `closeOnEscape`, both already-established input names carried over unchanged from `<ino-modal>` |
| `showCloseIcon` | ❌ **deliberately omitted** | `<ino-modal>` ships no such toggle either; the close button is a required dismissal affordance for a modal-mode panel (WCAG 2.1.1 keyboard-operable close, not reachable by Escape alone if `closeOnEscape="false"`). Omitting it would let a caller ship a modal panel with no visible or keyboard way to close it |
| `closeOnEscape` | ✅ | Unchanged name, carried from `<ino-modal>` |
| `blockScroll` | ✅, folded into `modal` | A non-modal drawer is explicitly non-blocking by definition (§6 `modal` row above), so a separate `blockScroll` toggle would be a second flag expressing the same "does this drawer block the page" decision already carried by `modal` |

## 7. Motion (DoD row 7)

Enter animation only — `<ino-modal>` sets the same precedent (no exit animation; `*ngIf` removes
the element immediately on close). Duration/easing are named tokens
(`--ino-motion-duration-base` / `--ino-motion-easing-decelerate` for the panel,
`--ino-motion-duration-base` / `--ino-motion-easing-standard` for the scrim fade — identical pairing
to `<ino-modal>`). The entire `@media (prefers-reduced-motion: no-preference)` block is the gate;
under `reduce`, the panel simply appears at its resting position with no animation.

**The one motion decision worth writing down:** each position's keyframe animates the same logical
inset property the panel is placed with (`inset-inline-start` for `start`, `inset-inline-end` for
`end`, `inset-block-start` for `top`, `inset-block-end` for `bottom`) from `-100%` to the panel's
resting value, rather than a `transform: translateX(...)`. CSS transforms are physical-axis only —
a hardcoded `translateX(-100%)` always moves left, so a `start`-edge panel (physically *right* under
`dir="rtl"`) would slide in from the wrong side. Animating the logical inset property instead means
the browser already resolves "off past the correct edge" per the active writing direction — one
keyframe set, not two, which is the RTL contract DoD row 8 requires.

## 8. Accessibility (DoD row 8)

- **Role/ARIA:** `role="dialog"` always; `aria-modal="true"` only when `modal` (omitted, not
  `"false"`, when non-modal — matching the WAI-ARIA APG guidance that non-modal dialogs simply omit
  the attribute); `aria-labelledby` bound to the heading when one is projected, exactly as
  `<ino-modal>` does.
- **Keyboard map:** `Escape` closes when `closeOnEscape` (default on); `Tab`/`Shift+Tab` wrap
  within the panel while `modal` is true, via `[inoFocusTrap]` — see that directive's own keyboard
  contract (`focus-trap/SPEC.md` §3). When `modal` is false the trap is disabled
  (`[inoFocusTrapDisabled]="true"`) and focus moves and wraps normally with the rest of the page, by
  design — a non-modal drawer does not own the page's focus.
- **Focus:** on open, `[inoFocusTrap]`'s `autoFocus` (default on) moves focus to the first tabbable
  element inside the panel; on close, `restoreFocus` (default on) returns it to whatever had focus
  before open. Both are the directive's defaults — the component sets no override.
- **Visible focus:** `--ino-focus-ring` / `--ino-focus-ring-offset` on the close button; never a
  hand-rolled outline.
- **Contrast:** all color roles used are already audited across 3 themes by `check-theme-parity.mjs`
  (§2); no new pair introduced.
- **Target size:** `.ino-drawer__close` is `--ino-target-comfortable` (44px) square — the
  comfortable, not just the 24px minimum, tier.
- **RTL:** logical properties only end to end — `inset-inline-{start,end}`,
  `inset-block-{start,end}`, `border-{start,end}-{start,end}-radius`, `margin-inline-start`,
  `padding-inline-end` (none present; padding is symmetric) — never `left`/`right`/`top`/`bottom`.
  See §7 for the motion-specific RTL decision.

## 9. Mobile parity (DoD row 9) — explicit web-only-for-now decision

**Capacitor:** covered for free — same Angular component, same CSS, per DoD row 9's "Capacitor is
not a port" rule (plan rev 9 §5). The 640px full-screen breakpoint (§ below) and the 44px close
target both already satisfy Capacitor's own gate.

**React Native and Flutter:** **not shipped in this issue.** Recorded here as a scoping decision,
not a permanent exemption — the same kind of move `<ino-select>` makes (pending INO-152; not yet
landed on this merge base as settled precedent). Rationale:

1. Plan rev 9 §5 prices a real RN/Flutter port at "≈40% of the web component" *each* — two more
   ports is not a small add-on to an already-full web scope (4 positions × 3 sizes × modal/non-modal
   × full-screen-mobile breakpoint × `[inoFocusTrap]` integration × 3 web themes).
2. Unlike `<ino-modal>` (centered, single geometry), a Drawer's edge-anchored, direction-aware
   sliding panel does not map onto RN's `Modal` / Flutter's `showModalBottomSheet` primitives as a
   thin wrapper — it needs real platform-native gesture/animation work (swipe-to-dismiss,
   native-feeling velocity-based slide) to not feel like a web page. `ConfirmActionSheet.tsx` /
   `confirm_action_sheet.dart` are the nearest existing precedent (bottom-anchored, modal, with a
   backdrop) and are the right starting point for that follow-up, but they are single-position,
   single-size, and have no `start`/`end`/`top` equivalent to extend from today.
3. A rushed, lower-fidelity port shipped just to check the row-9 box would be worse than a written
   scoping decision plus a tracked follow-up — it would read as parity that isn't actually there,
   which is precisely what DoD row 9's "or record an explicit web-only decision with a reason" escape
   hatch exists to prevent.

Follow-up: filed as a child issue against this ticket for the React Native + Flutter Drawer ports,
scoped to the same `start`/`end`/`top`/`bottom` × `sm`/`default`/`lg` × `modal`/non-modal matrix,
extending `ConfirmActionSheet`'s scrim/dismiss pattern per point 2 above.

**Full-screen on mobile:** shipped, web-side, for all four positions — `@media (max-width: 640px)`
(same breakpoint `ino-toast-container` already uses) resets the panel to `inset: 0`, full width and
height, zero radius, plus `--ino-safe-area-{top,bottom}` padding so content clears the notch / home
indicator on Capacitor. Left/right (inline-axis) safe-area insets are deliberately not added: the
safe-area tokens (`--ino-safe-area-left` / `--ino-safe-area-right`, `tokens.css` §11) are physical,
and a physical-to-logical mapping that depends on writing direction has no existing token to express
it — the same gap, not introduced here, that would affect any full-bleed inline-axis panel. Recorded
rather than silently worked around.

## 10. Docs artifact (DoD row 10)

`docs/brand/06-angular-components/drawer.md` + `docs/brand/06-angular-components/previews/drawer.html`
(first line `<!-- @dsCard group="Overlay" -->`).

## 11. Merge hygiene (DoD row 11)

Touches only `web/src/app/components/drawer/**`, this issue's own docs + preview files, and one
appended line in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (alphabetically inserted
between `datepicker` and `focus-trap`). No change to `web/src/tokens.css` — every value used already
existed.

---

## Files touched

- `web/src/app/components/drawer/ino-drawer.component.ts`
- `web/src/app/components/drawer/ino-drawer.component.html`
- `web/src/app/components/drawer/ino-drawer.component.scss`
- `docs/brand/06-angular-components/drawer.md`
- `docs/brand/06-angular-components/previews/drawer.html`
- `scripts/check-theme-parity.mjs` — one appended `COMPONENT_REGISTRY` entry
- This file
