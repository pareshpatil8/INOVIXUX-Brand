# `<ino-progress-spinner>` — ProgressSpinner

> Parity benchmark: PrimeNG 22.1.1 `ProgressSpinner` (`specs/primeng/llms-22.1.1.txt`, line 98).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Extracted from the inline ring-drawing technique `ino-button`/`ino-tag` already use for their own
> `loading` state.
> Preview: [`previews/progress-spinner.html`](previews/progress-spinner.html).
> Decisions record: `web/src/app/components/progress-spinner/SPEC.md`.

A standalone loading/process-status indicator with both indeterminate (continuous spin) and
determinate (percentage ring) modes, sized off the Wave 0 control-height scale, with an accessible
live-region announcement and a `prefers-reduced-motion` fallback.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Diameter — Wave 0 control-height scale (36/44/52px), see [Size API](#size-api) |
| `mode` | `'indeterminate' \| 'determinate'` | `'indeterminate'` | Continuous spin vs. a percentage-driven ring |
| `value` | `number` | `0` | Determinate progress, 0–100 (clamped) |
| `strokeWidth` | `number` | `8` | SVG stroke width in the component's fixed 0–100 viewBox — unitless, scales with `size` |
| `disabled` | `boolean` | `false` | `aria-disabled` + dimmed opacity |
| `invalid` | `boolean` | `false` | Recolors the ring to the danger role — a still-running operation in a retryable-error state, not form validity |
| `label` | `string` | `''` | Overrides the accessible name / live-region text. Defaults to `"Loading"` (indeterminate) or `"{n}% complete"` (determinate) |

### Size API

`size` re-points `--ino-control-height` to the Wave 0 rung (`--ino-control-height-{sm,default,lg}`)
— the same alias-repointing idiom every sized component in this system uses. No local sizing scale
invented. Density is inherited automatically because `--ino-control-height` is itself re-declared
inside both `[data-density]` blocks in `tokens.css`. Full reasoning: `SPEC.md` §3–4.

---

## Variants

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Indeterminate mode | ✅ | `mode="indeterminate"` (default) |
| Determinate mode | ✅ | `mode="determinate"` + `value` |
| Size | ✅ | `size` input |
| Custom stroke width | ✅ | `strokeWidth` input |
| Invalid/error recolor | ✅ | `invalid` input |

---

## Motion

Indeterminate mode spins the SVG (`--ino-motion-duration-slow`, linear, infinite) — the same
pairing `ino-button`/`ino-tag` already spin their inline spinners with — gated behind
`@media (prefers-reduced-motion: no-preference)` so it is fully absent, not merely paused, under
`reduce`. Determinate mode's ring-fill transition (`--ino-motion-duration-base` /
`--ino-motion-easing-standard`) collapses to `transition: none` under the same query, so a
determinate value jumps straight to its new position instead of easing.

---

## Accessibility contract

**Role / ARIA** — `role="progressbar"` on the host (the standard WAI-ARIA pattern for this widget).
Determinate mode sets `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` (clamped `value`).
Indeterminate mode omits the `aria-value*` triple per WAI-ARIA authoring practice (an indeterminate
progressbar never guesses a number) and sets `aria-busy="true"` instead. `aria-label` defaults to
`"Loading"` / `"{n}% complete"` unless `label` is supplied.

**Live-region announcement** — a visually-hidden `aria-live="polite"` span mirrors the accessible
name. Indeterminate announces once on entry and does not repeat; determinate re-announces only when
`value` crosses a 25% quartile, so a fast run doesn't spam a screen reader on every tick. `invalid`
appends `" (error)"` to the announced text.

**Keyboard** — none. The component is never in the tab order; there is nothing to activate.

**Contrast** — the value/spin ring (`--ino-color-accent` default, `--ino-color-danger` when
`invalid`) is a non-text graphical object, so the applicable floor is SC 1.4.11's 3:1 — both roles
clear it against `--ino-color-surface` in every theme. The track ring
(`--ino-color-border-soft`) is intentionally lower-contrast decorative bedding, not a state carrier.

**Target size (SC 2.5.8)** — does not apply; the component is never focusable/clickable.

**RTL** — logical properties only (`inline-size`/`block-size`). The ring is rotationally symmetric,
so there is no direction-dependent geometry to mirror.

---

## Deliberate omissions

Recorded here rather than silently dropped (full detail in `SPEC.md` §1, §4):

- **Hover / active / focus-visible / readonly states.** Not carried — the component is a static,
  non-interactive status indicator, matching the PrimeNG benchmark. Same reasoning `ino-tag`'s spec
  already gives for its own non-interactive state set.
- **`--ino-row-min-height`.** Not read — unlike `ino-tag` (an inline label embedded inside table
  rows), a spinner renders at its own explicit `size` diameter and is not row-based in the sense DoD
  row 4 means.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoProgressSpinner.tsx`. No SVG library is
  a dependency in this app, so indeterminate mode uses the same bordered-circle spin technique
  `ino-button`/`ino-tag`'s mobile spinners already use; determinate mode renders a 12-tick radial
  dial (no new dependency) rather than a disc-with-punched-hole ring, since punching a hole would
  need to match the parent's exact background colour and breaks on any non-solid background.
- **Flutter** — `mobile/flutter/lib/widgets/ino_progress_spinner.dart`, built directly on the SDK's
  `CircularProgressIndicator` (native determinate/indeterminate support, no reimplementation
  needed).

Full reasoning: `SPEC.md` §8.
