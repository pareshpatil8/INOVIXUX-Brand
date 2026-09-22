# `<ino-progress-spinner>` — component spec

**Issue:** [INO-133](/INO/issues/INO-133) (INO-31 T-21, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `ProgressSpinner` — `specs/primeng/llms-22.1.1.txt` line 98,
route `https://primeng.dev/progressspinner`: "a process status indicator that supports both
determinate and indeterminate modes." PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.
**Extracted from:** the inline ring-drawing technique `ino-button` and `ino-tag` already use for
their own `loading` state (issue: "our only loading affordance today is `aria-busy` on button").

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 4 of 8 states carried, 4 deliberately N/A (DoD row 5)

`<ino-progress-spinner>` is a presentational status indicator, matching the PrimeNG benchmark: no
click handler, never in the tab order.

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Track ring always visible; value/spin ring drawn over it |
| Disabled | ✅ | `aria-disabled` + `opacity: 0.5` — e.g. a panel-level operation that's been superseded but whose spinner is still momentarily on screen |
| Invalid | ✅ | Recolors the ring to the danger role — e.g. a long-running operation that has entered a retryable-error state but is still spinning. Not form-field validity (see below) |
| Loading/busy | ✅ | This *is* the component's reason for existing — `mode="indeterminate"` sets `aria-busy="true"` |
| Hover | N/A — not carried | Nothing to reveal on hover: no secondary affordance, no drill-down. Same reasoning `ino-tag`'s SPEC already documents for its own non-interactive state set |
| Active/pressed | N/A — not carried | Follows from the above — there is nothing to press |
| Focus-visible | N/A — not carried | The host has no `tabindex`; a component that cannot receive focus does not draw a focus ring |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't. A spinner never accepts input, so the distinction doesn't apply — same reasoning `ino-tag`'s SPEC gives for its own `readonly` N/A |

**Why `invalid` is carried here but not on `ino-tag`:** a tag is a static label with no notion of an
in-flight process; a spinner's entire purpose is representing that process's state, and "the process
hit a retryable error but is still running" is a real, distinct state a caller needs to show (e.g. a
retry-with-backoff spinner). It recolors the ring only — it is not form-field validity.

---

## 2. Zero hardcoded values (DoD row 1)

| Concern | Token |
|---|---|
| Diameter | `--ino-control-height` (Wave 0 control-height scale, re-pointed to `-sm`/`-lg` by the `size` input — same alias-repointing idiom `ino-button`'s size classes use) |
| Track ring colour | `--ino-color-border-soft` |
| Value/spin ring colour | `currentColor`, itself set from `--ino-color-accent` (default) or `--ino-color-danger` (`invalid`) |
| Disabled dimming | `opacity: 0.5` — same literal every other component's disabled state already uses (not a token in this system; e.g. `ino-tag`, `ino-button`) |
| Ring transition | `--ino-motion-duration-base` / `--ino-motion-easing-standard` |
| Spin animation | `--ino-motion-duration-slow`, linear, infinite — same pairing `ino-button`/`ino-tag` already spin their inline spinners with |

**Stroke width is not a token.** DoD row 1's token list is colour/space/radius/duration/shadow/
font-size; SVG `stroke-width` in a fixed 0–100 user-space viewBox belongs to none of those — same
precedent as `ino-tag`'s hardcoded 2px spinner ring border. It is exposed as a numeric `@Input`
(`strokeWidth`, default 8) rather than frozen, since unlike `ino-tag`'s tiny inline glyph this
component is meant to stand alone at a range of diameters and a fixed absolute stroke would read as
proportionally too thin at `lg` or too thick at `sm`.

No `[data-theme]` branch anywhere in the component — every theme repaints purely through the
`--ino-color-*` role values above.

---

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points `--ino-control-height` to the Wave 0 rung
(`--ino-control-height-{sm,default,lg}`, 36/44/52px), the same alias-repointing idiom every sized
component in this system uses. No local sizing scale invented.

---

## 4. Density (DoD row 4)

`--ino-control-height` is itself re-declared inside both `[data-density]` blocks in `tokens.css`
(§11), so density is inherited for free — no separate dense/fluid branch needed in this component's
own stylesheet, same as every other component that reads the control-size consumption aliases
directly (`ino-input`, `ino-select`).

**`--ino-row-min-height` does not apply.** Unlike `ino-tag` (an inline label that is routinely
embedded *inside* a table row and must not shrink below that row's own floor), a spinner is drawn at
its own explicit diameter (`size`) and is not row-based in the sense DoD row 4 means — there is no
row content it needs to avoid overflowing. Recorded here as the deliberate reasoning DoD row 6
requires for anything not built exactly as named.

---

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Indeterminate mode | ✅ | `mode="indeterminate"` (default) — continuous rotation, `aria-busy` |
| Determinate mode | ✅ | `mode="determinate"` — `value` @Input (0–100, clamped), animated `stroke-dashoffset`, `aria-valuenow` |
| Size | ✅ | `size` @Input (§3) |
| Custom stroke width | ✅ | `strokeWidth` @Input (§2) |
| Invalid/error recolor | ✅ | `invalid` @Input (§1) |

No deliberate omissions.

---

## 6. Motion (DoD row 7)

Indeterminate mode spins the whole SVG (`animation: … var(--ino-motion-duration-slow) linear
infinite`), gated behind `@media (prefers-reduced-motion: no-preference)` so it is entirely absent
(not merely paused) under `reduce`. Determinate mode's `stroke-dashoffset` transition
(`--ino-motion-duration-base` / `--ino-motion-easing-standard`) is separately zeroed under
`prefers-reduced-motion: reduce` (`transition: none`) so a determinate spinner still jumps straight
to each new value instead of easing into it.

---

## 7. Accessibility contract (DoD row 8)

**Role.** `role="progressbar"` on the host — the standard WAI-ARIA pattern for exactly this widget,
covering both modes:

- **Determinate** — `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` (clamped `value`).
  `aria-label` defaults to `"{n}% complete"` unless the caller supplies `label`.
- **Indeterminate** — no `aria-value*` triple (per the WAI-ARIA authoring practice: an indeterminate
  progressbar omits `aria-valuenow` rather than guessing a number), `aria-busy="true"` instead.
  `aria-label` defaults to `"Loading"`.

**Live-region announcement (the issue's explicit ask).** A visually-hidden `aria-live="polite"` span
carries the same text as `aria-label`. Indeterminate announces once on entry (mode/label/invalid
change) and does not repeat — there is no new information to add every second a spin continues.
Determinate re-announces only when `value` crosses a 25% quartile boundary, so a fast determinate run
does not spam a screen reader on every tick while still surfacing meaningful progress milestones.
`invalid` appends `" (error)"` to the announced text in both modes.

**Keyboard.** None — the component is never in the tab order (§1).

**Contrast.** The value/spin ring uses `--ino-color-accent` (default) or `--ino-color-danger`
(`invalid`) as a **non-text graphical object**, so the applicable floor is SC 1.4.11's 3:1, not the
4.5:1 text floor — both roles already clear 3:1 against `--ino-color-surface` in every theme (audited
by `check-theme-parity.mjs`'s existing non-text contrast checks for those same roles). The track ring
(`--ino-color-border-soft`) is intentionally lower-contrast — it is decorative bedding, not the
carrier of state, the same rationale `ino-input`'s unfocused border already documents.

**Target size (SC 2.5.8).** Does not apply — the component is never focusable/clickable (§1), and
SC 2.5.8 only constrains pointer targets for interactive elements.

**RTL.** Logical properties only (`inline-size`/`block-size`). The ring itself is rotationally
symmetric so there is no direction-dependent geometry to mirror; the one piece of inline-direction
geometry in the stylesheet is the host's own box, already expressed with `inline-size`/`block-size`.

---

## 8. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor** — not a separate port; the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoProgressSpinner.tsx`. No SVG library is
  present in this app (`react-native-svg` is not a dependency, and DoD row 11 / the vendor-light
  policy forbid adding one unilaterally to close this issue), so the ring is drawn with the same
  bordered-circle technique `ino-button`/`ino-tag`'s inline spinners already use on mobile:
  - **Indeterminate** — a single circle, `borderColor: accent`, one edge (`borderTopColor`)
    transparent, `Animated` loop rotation. Same visual idiom as the web ring's dasharray gap, just
    achieved with a border instead of stroke geometry.
  - **Determinate** — a 12-tick radial dial (like clock-face minute marks): a disc-plus-punched-
    hole ring was rejected because punching a hole requires painting the center in the parent's
    exact background colour to fake transparency, which visibly breaks on any non-solid-colour
    background (an image, a gradient, a differently-tinted panel) — a real correctness bug, not a
    cosmetic one. The tick dial has no such dependency: each tick is an independent small rounded
    rect, so it composites correctly over any background at the cost of 12-step granularity
    instead of a continuous sweep.
- **Flutter** — `mobile/flutter/lib/widgets/ino_progress_spinner.dart`, built on the SDK's own
  `CircularProgressIndicator` (`value: null` for indeterminate, `value: 0–1` for determinate) — no
  reimplementation needed, since unlike RN, Flutter's framework already renders a token-coloured
  determinate/indeterminate ring natively via `Canvas`.

---

## 9. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `virtual-scroller/SPEC.md` §6, re-verified for this issue: DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but **no
such registry exists in the file** — it is a token-contract audit script (CSS mirror byte-parity,
colour roles across 3 themes × 2 mobile ports, space/radius/target/duration scales, control-size
scale, data-viz tokens), not a per-component list. Nothing appended; `node
scripts/check-theme-parity.mjs` passes unchanged. Component-level token adherence is covered by
`check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token (stroke-width excepted, §2) |
| `[data-theme]` branch in the component | none |
