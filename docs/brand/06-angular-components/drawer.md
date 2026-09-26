# `<ino-drawer>` — Drawer

> Parity benchmark: PrimeNG 22.1.1 `Drawer` (`specs/primeng/llms-22.1.1.txt`, line 57,
> `https://primeng.dev/drawer`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Depends on: `[inoFocusTrap]` (T-11, [`focus-trap.md`](focus-trap.md)) — merged before this issue
> started.
> Preview: [`previews/drawer.html`](previews/drawer.html).
> Decisions record: `web/src/app/components/drawer/SPEC.md`.

An edge-anchored overlay panel — four logical positions (`start`/`end`/`top`/`bottom`), three
sizes, modal (blocking, scrim + focus trap) or non-modal (persistent, non-blocking) mode, and an
automatic full-screen layout under the mobile breakpoint. Adopts `[inoFocusTrap]` rather than
hand-rolling containment a second time.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Two-way bindable: `[(open)]="flag"` |
| `position` | `'start' \| 'end' \| 'top' \| 'bottom'` | `'end'` | Logical edge, not physical — see [RTL](#accessibility-contract) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Panel width (`start`/`end`) or height (`top`/`bottom`) — see [Sizes](#sizes) |
| `heading` | `string` | `''` | Renders an `<h2>` wired to `aria-labelledby` |
| `modal` | `boolean` | `true` | `false` renders a persistent, non-blocking panel — see [Modal vs non-modal](#modal-vs-non-modal) |
| `closeOnBackdrop` | `boolean` | `true` | Modal mode only — non-modal has no backdrop |
| `closeOnEscape` | `boolean` | `true` | |
| `loading` | `boolean` | `false` | `[data-loading]` dim + `aria-busy="true"`, for panel content still fetching |

| Output | Payload | Fires when |
|---|---|---|
| `openChange` | `boolean` | Escape / backdrop-click / close button — always paired with `closed` |
| `closed` | `void` | Same triggers as `openChange` |

| Content slot | Notes |
|---|---|
| `[ino-drawer-header]` | Projected next to the heading, before the close button |
| (default) | Panel body |
| `[ino-drawer-footer]` | Bordered footer, hidden when empty |

---

## Sizes

| `size` | `start` / `end` width | `top` / `bottom` height |
|---|---|---|
| `sm` | 320px | 240px |
| `default` | 400px | 360px |
| `lg` | 480px | 480px |

Structural panel dimensions, not on the Wave 0 control-height scale (that scale governs form-control
row heights, not overlay-panel geometry) — same precedent `<ino-modal>`'s 480px `max-width` already
set. Full reasoning: `SPEC.md` §1, §3.

---

## Modal vs non-modal

| | `modal="true"` (default) | `modal="false"` |
|---|---|---|
| Scrim | ✅ `--ino-color-overlay-scrim` | none |
| Body scroll | locked while open | unlocked |
| `[inoFocusTrap]` | active — Tab/Shift+Tab wrap inside the panel | disabled — focus moves normally with the rest of the page |
| `aria-modal` | `"true"` | omitted (not `"false"`) |
| `closeOnBackdrop` | honored | no-op — there is no backdrop to click |

Use non-modal for a persistent panel the user keeps open alongside page content (e.g. a filters
rail); use modal for anything that should block interaction with the rest of the page until
dismissed. Full reasoning: `SPEC.md` §6, §8.

---

## Variants (DoD row 6)

| PrimeNG variant | Shipped | Notes |
|---|---|---|
| `position="left"` / `"right"` | ✅ as `"start"` / `"end"` | Logical, RTL-safe naming |
| `position="top"` / `"bottom"` | ✅ | |
| `position="full"` | ❌ deliberately omitted | Full-screen is the automatic mobile-breakpoint behavior for every position, not a fifth value — see [Mobile parity](#mobile-parity) |
| `modal` | ✅ | |
| `dismissible` | ✅ as `closeOnBackdrop` | |
| `showCloseIcon` | ❌ deliberately omitted | The close button always renders — required keyboard-operable dismissal, same as `<ino-modal>` |
| `closeOnEscape` | ✅ | |
| `blockScroll` | ✅, folded into `modal` | A non-modal drawer is non-blocking by definition |

Full reasoning: `SPEC.md` §6.

---

## Motion

Enter animation only (no exit animation — `*ngIf` removes the panel immediately on close, same as
`<ino-modal>`), gated behind `@media (prefers-reduced-motion: no-preference)`. Each position
animates the **same logical inset property it is placed with** (`inset-inline-start` for `start`,
`inset-inline-end` for `end`, `inset-block-start` for `top`, `inset-block-end` for `bottom`) rather
than a physical `transform: translateX(...)`, so a `start`-edge panel slides in from the correct
physical side under both `dir="ltr"` and `dir="rtl"` with one keyframe set. Full reasoning:
`SPEC.md` §7.

---

## Accessibility contract

**Role/ARIA:** `role="dialog"` always; `aria-modal="true"` only in modal mode; `aria-labelledby`
bound to the heading when one is projected.

**Keyboard map:** `Escape` closes (`closeOnEscape`); `Tab`/`Shift+Tab` wrap within the panel in
modal mode via `[inoFocusTrap]` (see [`focus-trap.md`](focus-trap.md) for its full keyboard
contract); focus moves and wraps normally with the page in non-modal mode.

**Focus:** on open, focus moves to the first tabbable element inside the panel; on close, focus
returns to whatever held it before open — both via `[inoFocusTrap]`'s defaults.

**Contrast:** all color roles used (`surface-raised`, `border-soft`, `on-surface`,
`on-surface-muted`, `accent-active`, `overlay-scrim`) are already AA-audited across dark / light /
high-contrast by `check-theme-parity.mjs`.

**Target size:** the close button is `--ino-target-comfortable` (44px) square.

**RTL:** logical properties only end to end — `inset-inline-{start,end}`,
`inset-block-{start,end}`, `border-{start,end}-{start,end}-radius`, never `left`/`right`/`top`/
`bottom`. `position="start"`/`"end"` name the inline-axis anchor directly, so the API states the
RTL contract instead of leaving it to CSS alone.

Full reasoning: `SPEC.md` §5, §8.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD row 6, full detail in `SPEC.md` §5–6):

- **`disabled` / `readonly` / `invalid` states** — not carried. A drawer is not a control that can
  be disabled, has nothing to mark read-only, and has no form value to fail validation.
  `closeOnEscape`/`closeOnBackdrop` are the correct way to prevent dismissal.
- **`position="full"`** — not a fifth position; see [Variants](#variants).
- **Density (`--ino-row-min-height`)** — not applicable; the drawer shell is not row-based.
- **`showCloseIcon` toggle** — the close button always renders; see [Variants](#variants).

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port"). The full-screen mobile breakpoint and the
  44px close target both already satisfy Capacitor's gate.
- **React Native / Flutter** — **not shipped in this issue**, an explicit web-only-for-now scoping
  decision (the same kind of move `<ino-select>`'s mobile section makes, pending INO-152 — not yet
  landed on this merge base as settled precedent): a real
  edge-anchored, direction-aware sliding-panel port needs native gesture/animation work beyond a
  thin wrapper, and this issue's budget went to the web core (4 positions × 3 sizes ×
  modal/non-modal × full-screen breakpoint × `[inoFocusTrap]` integration, across 3 web themes).
  `mobile/react-native/src/components/ConfirmActionSheet.tsx` / `mobile/flutter/lib/widgets/
  confirm_action_sheet.dart` are the nearest existing precedent (bottom-anchored, modal, with a
  backdrop) for the filed follow-up child issue to extend. Full reasoning: `SPEC.md` §9.
- **Full-screen on mobile** — shipped, web-side, for all four positions:
  `@media (max-width: 640px)` (same breakpoint `<ino-toast-container>` uses) resets the panel to
  full viewport, zero radius, with `--ino-safe-area-{top,bottom}` padding.
