# `<ino-progress-bar>` — Progress Bar

> Parity benchmark: PrimeNG 22.1.1 `ProgressBar` (`specs/primeng/llms-22.1.1.txt`, line 97).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/progress-bar.html`](previews/progress-bar.html).
> Decisions record: `web/src/app/components/progress-bar/SPEC.md`.

A linear process-status indicator with two modes: `determinate` (a known `value`, 0-100) and
`indeterminate` (unknown-duration work, animated sweep). Presentational and non-interactive,
matching the PrimeNG `ProgressBar` benchmark — no click/keyboard handler, never in the tab order.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `mode` | `'determinate' \| 'indeterminate'` | `'determinate'` | See [Modes](#modes) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Track thickness only — see [Size API](#size-api) |
| `value` | `number` | `0` | 0-100, clamped in the getter so an out-of-range input can never desync the rendered fill from `aria-valuenow` |
| `showValue` | `boolean` | `true` | Renders `value` + `unit` as adjacent text; ignored in `indeterminate` mode |
| `unit` | `string` | `'%'` | Suffix appended to the rendered/announced value |
| `disabled` | `boolean` | `false` | `aria-disabled` + dimmed opacity — e.g. a stalled operation whose progress is frozen |
| `invalid` | `boolean` | `false` | Fill swaps to the danger role — e.g. an upload/background job that failed partway through |

### Modes

| Mode | Behaviour |
|---|---|
| `determinate` | `value` drives fill width; `aria-valuemin`/`-max`/`-now`/`-valuetext` all present |
| `indeterminate` | No numeric value exists to report — all `aria-value*` attributes are omitted and `aria-busy="true"` communicates the ongoing state instead, per the WAI-ARIA progressbar pattern |

### Size API

`size` is the same closed `InoControlSize` union every component uses, but **does not** read
`--ino-control-height` — a 32-44px control floor is the wrong scale for a 4-12px bar. Instead the
track thickness steps through three rungs of the space scale (`--ino-space-1/2/3` = 4/8/12px). The
value label's font-size still reads the Wave 0 `--ino-control-font-size-{sm,lg}` aliases. Full
reasoning: `SPEC.md` §3.

It reads `--ino-row-min-height` as an opt-in `min-block-size` floor (`auto` outside a
`[data-density]` ancestor), so a bar embedded in a dense table row doesn't shrink that row below its
own floor, without the bar itself being forced to control-height. Full reasoning: `SPEC.md` §4.

---

## Motion

Determinate fill-width changes animate over `--ino-motion-duration-base` +
`--ino-motion-easing-standard` — a value update is a content change, not an entrance. Indeterminate
mode sweeps a 40%-wide segment end-to-end over `--ino-motion-duration-slow`. Under
`prefers-reduced-motion: reduce` the sweep is dropped entirely and renders as a static partial fill
— motion is indeterminate mode's only progress signal, so `aria-busy` alone carries the state at
that point. Full reasoning: `SPEC.md` §6.

---

## Accessibility contract

**Role / ARIA** — `role="progressbar"` on the host. Determinate mode sets `aria-valuemin="0"`,
`aria-valuemax="100"`, `aria-valuenow` (clamped), and `aria-valuetext` (the same string rendered
visually, e.g. "62%"). Indeterminate mode omits all three `aria-value*` attributes and sets
`aria-busy="true"` instead. `aria-invalid` reflects `invalid`; `aria-disabled` reflects `disabled`
(not the native `disabled` attribute — the host is a `<div>`, which has none).

**Keyboard** — none. The component is never in the tab order; it has nothing to activate. See
`SPEC.md` §1 for the full carried/N-A state breakdown (3 of 8 states carried, 4 deliberately N/A,
1 — loading/busy — is the `indeterminate` mode itself).

**Contrast** — track/fill pair and the invalid danger fill are AA-verified roles audited across all
three themes by `node scripts/check-theme-parity.mjs`; the track's 1px border is the generic
`border` role (≥3:1 non-text, WCAG 2.2 SC 1.4.11). Target-size criteria (SC 2.5.8) do not apply —
the component is never focusable/clickable.

**RTL** — logical properties only (`inline-size`/`block-size`, `inset-inline-start`, `inset-block`).
The indeterminate sweep is keyframed on `inset-inline-start`, not `left`, so it runs the correct
direction for free under `dir="rtl"`.

---

## Deliberate omissions

Recorded here rather than silently dropped (full detail in `SPEC.md` §1):

- **Hover / active / focus-visible / readonly states.** Not carried — the component is a static,
  non-interactive status indicator, matching the PrimeNG `ProgressBar` benchmark. A progress bar
  never accepts input and is never in the tab order.
- **`--ino-control-height` as the size-scale target.** See [Size API](#size-api) above.

## Mobile parity

All three tracks ship (per the issue, T-15).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoProgressBar.tsx`. `Animated.Value`
  drives the indeterminate sweep; `accessibilityRole="progressbar"` + `accessibilityValue` mirror
  the web ARIA contract, including omitting `now`/`min`/`max` in indeterminate mode.
  `AccessibilityInfo.isReduceMotionEnabled()` gates the sweep the same way `prefers-reduced-motion`
  does on web.
- **Flutter** — `mobile/flutter/lib/widgets/ino_progress_bar.dart`. An `AnimationController` drives
  the same sweep; `Semantics(value: …)` mirrors the same value-text contract and passes no value in
  indeterminate mode. `MediaQuery.disableAnimations` gates the sweep the same way.

All three read the same ported colour roles used elsewhere (`accent`, `danger`, `border`,
`surfaceSunken`) — no new mobile-only fields needed.
