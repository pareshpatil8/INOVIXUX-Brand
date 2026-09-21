# `<ino-progress-bar>` — ProgressBar

> Parity benchmark: PrimeNG 22.1.1 `ProgressBar` (`specs/primeng/llms-22.1.1.txt`, line 97,
> `https://primeng.dev/progressbar`). PrimeNG is a benchmark, **not a runtime dependency** —
> nothing here installs it.
>
> Preview: [`previews/progress-bar.html`](previews/progress-bar.html).
> Decisions record: `web/src/app/components/progress-bar/SPEC.md`.

A process-status indicator: determinate (0–100, animated fill) and indeterminate (looping sweep),
an optional visible value label, and the Wave 0 control-size scale. Decorative and
non-interactive — it never receives focus, and the caller drives `value`/`mode` from whatever
process it reports on.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `mode` | `'determinate' \| 'indeterminate'` | `'determinate'` | Drives ARIA and the fill behaviour — see [Variants](#variants) |
| `value` | `number` | `0` | Clamped to 0–100 on assignment. Only meaningful in `mode="determinate"` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale — drives track thickness and the `showValue` label's font size, see `SPEC.md` §3 |
| `showValue` | `boolean` | `false` | Renders the numeric percentage as visible text. Ignored in `mode="indeterminate"` |
| `label` | `string` | `''` | Optional `aria-label` for the progressbar when no visible label exists in the surrounding context |

---

## Variants

| Variant | Shipped | Notes |
|---|---|---|
| Determinate | ✅ (default) | Fill width tracks `value`, animates on change (Pattern A motion) |
| Indeterminate | ✅ | Fixed-width fill sweeps the track on a loop (Pattern B motion) |
| `showValue` | ✅ | PrimeNG parity — visible percentage text, determinate-only |

No other deliberate omissions. A `status`/severity variant (error/success fill colour) was
considered against the PrimeNG parity note and the ticket, and deliberately **not** shipped — full
reasoning: `SPEC.md` §5.

---

## Motion

- **Determinate value change** — Pattern A (`motion-contract.md` §2): `transition: inline-size` at
  `--ino-motion-duration-base` / `--ino-motion-easing-standard`, nulled under
  `prefers-reduced-motion: reduce` (the value change itself still happens, only the easing is
  removed).
- **Indeterminate sweep** — Pattern B: the resting state is a static 40%-wide fill; the `@keyframes`
  sweep is gated entirely inside `@media (prefers-reduced-motion: no-preference)`, so `reduce`
  users see the static bar by default. Duration: `calc(var(--ino-motion-duration-slow) * 3)` +
  `--ino-motion-easing-standard`.

Full reasoning: `SPEC.md` §7.

---

## Accessibility contract

**Role/ARIA** — `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"` always.
`aria-valuenow` + `aria-valuetext` (`"{value}%"`) only in `mode="determinate"`. In
`mode="indeterminate"`, both are **omitted** (never set to `0`/`null`) per the WAI-ARIA
indeterminate-progressbar guidance, and `aria-busy="true"` is set instead. `aria-label` is bound
from the optional `label` input.

**Keyboard** — none; never in the tab order.

**Visible focus** — N/A; never focusable.

**Contrast (WCAG 2.2 SC 1.4.11 / 1.4.3)** — track/fill are non-text roles already AA/AAA-audited
across all three themes; the `showValue` label uses the muted-caption text role, audited ≥7:1 in
high-contrast.

**Target size** — does not apply; never focusable or clickable.

**RTL** — logical properties only (`inline-size`/`block-size`, `inset-inline-start`/`inset-block`);
no `left`/`right`/`top`/`bottom`/physical `width` anywhere, so both the determinate fill and the
indeterminate sweep are direction-aware for free.

Full reasoning: `SPEC.md` §8.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoProgressBar.tsx`. Determinate fill
  animates `width` via `Animated.timing`; indeterminate sweep loops an `Animated.Value` driving
  `translateX` (`useNativeDriver: true`), gated behind `AccessibilityInfo.isReduceMotionEnabled()`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_progress_bar.dart`. Determinate fill animates via
  an implicit width tween; indeterminate sweep uses an `AnimationController` driving a
  `FractionalTranslation`, gated behind `MediaQuery.of(context).disableAnimations`.

Both mobile ports carry `mode`, `value`, `size`, and `showValue`. Neither carries the web
`label` string input — each wires the platform's own accessible-name/value API directly
(`accessibilityRole`/`accessibilityValue` on RN, `Semantics(value: …)` on Flutter). Full reasoning:
`SPEC.md` §9.
