# `<ino-progress-bar>` — ProgressBar

> Parity benchmark: PrimeNG 22.1.1 `ProgressBar` (`specs/primeng/llms-22.1.1.txt`, line 97).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-15, committed in Wave 2,
> unbuilt until this issue).
> Decisions record: `web/src/app/components/progress-bar/SPEC.md`.

Linear process-status indicator — the horizontal-track counterpart to `<ino-progress-spinner>`.
Supports determinate (known percentage) and indeterminate (unknown duration) modes with the same
live-region announcement contract as the spinner.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Track thickness — see [Size API](#size-api) |
| `mode` | `'determinate' \| 'indeterminate'` | `'determinate'` | |
| `value` | `number` | `0` | Clamped 0–100; ignored in `indeterminate` mode |
| `showValue` | `boolean` | `false` | Renders `"{n}%"` centered over the track (determinate only) |
| `disabled` | `boolean` | `false` | `aria-disabled` + dimming |
| `invalid` | `boolean` | `false` | Recolors the fill to the danger role |
| `label` | `string` | `''` | Overrides the accessible name/live-region text |

No output emitters — purely a display component.

### Size API

`size` re-points `--ino-progress-bar-thickness` to `--ino-control-icon-size-{sm,default,lg}`
(16/20/24px) — the same rung `<ino-meter-group>` reuses for its own track, not
`--ino-control-height` (a thin track is not a field-height element).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Track + fill visible |
| Disabled | `disabled` input | `opacity: 0.5`, `aria-disabled` |
| Invalid | `invalid` input | Fill recolors to `--ino-color-danger` |
| Loading/busy | `mode="indeterminate"` | Sweeping segment, `aria-busy="true"` |
| Hover / Active / Focus-visible / Readonly | N/A | Non-interactive, never in the tab order |

---

## Motion

Determinate fill transitions `inline-size` on `--ino-motion-duration-base` /
`--ino-motion-easing-standard`. Indeterminate mode sweeps a 40%-wide segment on
`--ino-motion-duration-slow`, infinite. Under `prefers-reduced-motion: reduce`, the determinate
transition is removed and the indeterminate sweep freezes at a static 50% width instead of
animating.

---

## Accessibility contract

**Role / ARIA** — `role="progressbar"`. Determinate: `aria-valuemin="0"`, `aria-valuemax="100"`,
`aria-valuenow` (clamped value). Indeterminate: no `aria-value*` triple, `aria-busy="true"`
instead — per the WAI-ARIA authoring practice for an indeterminate progressbar.

**Live-region announcement** — a visually-hidden `aria-live="polite"` span carries the same text as
`aria-label`. Indeterminate announces once on entry; determinate re-announces only on a 25%
quartile crossing, so a fast run doesn't spam a screen reader on every tick.

**Keyboard** — none; never in the tab order.

**Contrast** — fill colour is a non-text graphical object (SC 1.4.11, 3:1 floor); both `accent` and
`danger` clear it against `surface` in every theme.

**Target size** — N/A, never focusable/clickable.

**RTL** — logical properties only (`inline-size`, `inset-inline-start`); the sweep keyframe mirrors
correctly under `dir="rtl"`.

---

## Deliberate omissions

None.

## Mobile parity

Both mobile ports ship (INO-334).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoProgressBar.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_progress_bar.dart`.

Both ports carry the full web `@Input` surface (`size`, `mode`, `value`, `showValue`, `disabled`,
`invalid`, `label`) and reuse the shared `size.iconSize` rung for track thickness, same as
`InoMeterGroup`. Neither has a CSS `transition`/`@keyframes` equivalent: the determinate fill
animates via a native `Animated.Value`/`TweenAnimationBuilder` width tween instead of the web's
`inline-size` transition, and the indeterminate sweep is a looping translate animation gated behind
the platform's reduce-motion signal (`AccessibilityInfo.isReduceMotionEnabled()` /
`MediaQuery.disableAnimations`) rather than a CSS media query — both freeze to the same static
40%-wide resting bar under reduced motion that the web fallback uses. Recorded in
`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY`.
