# `<ino-progress-bar>` — component spec

**Issue:** INO-132 (INO-31 T-15, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `ProgressBar` — `specs/primeng/llms-22.1.1.txt` line 97,
route `https://primeng.dev/progressbar`. PrimeNG is a benchmark, **not a runtime dependency**;
nothing here installs it.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 3 of 8 states carried, 4 deliberately N/A, 1 is a mode (DoD row 5)

`<ino-progress-bar>` is a presentational status indicator, matching the PrimeNG `ProgressBar`
benchmark exactly: no click/keyboard handler, never in the tab order.

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Accent-gradient fill, width driven by `value` |
| Disabled | ✅ | `aria-disabled` + `opacity: 0.5` — e.g. a stalled operation whose progress is frozen |
| Invalid | ✅ | Fill swaps to `--ino-color-danger` / label to `--ino-color-danger-text-safe` — e.g. an upload or a background job that failed partway through; PrimeNG has no built-in equivalent, added because a KYB document-processing pipeline needs to show "this stalled/failed at 62%", not just "this is progressing" |
| Loading/busy | ✅ *(is the `indeterminate` mode)* | `mode="indeterminate"` sets `aria-busy="true"` and renders an animated sweep instead of a fixed value — there is no separate "busy" flag layered on top of `determinate`, because a determinate bar with a known value is by definition not indeterminately busy |
| Hover | N/A — not carried | Nothing to reveal on hover: no secondary affordance, no drill-down. Same reasoning `ino-tag`'s SPEC.md §1 already gives |
| Active/pressed | N/A — not carried | Follows from the above — there is nothing to press |
| Focus-visible | N/A — not carried | The host is never in the tab order (no `tabindex`, `role="progressbar"` is not an interactive role); a component that cannot receive focus does not draw a focus ring |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't. A progress bar never accepts input — same reasoning `ino-tag`'s SPEC.md §1 gives for its own non-interactive state set |

---

## 2. Determinate vs indeterminate (DoD row 6, the issue's named scope)

The issue names exactly two variants — "Determinate and indeterminate, with value display and
correct `role="progressbar"` ARIA" — and both are built:

| Mode | Behaviour |
|---|---|
| `determinate` (default) | `value` (0-100, clamped in the getter so an out-of-range caller value can never desync the rendered fill from the announced `aria-valuenow`) drives fill width via `inline-size: N%`; `aria-valuemin`/`-max`/`-now`/`-valuetext` all present. `showValue` (default `true`) renders the value + `unit` (default `%`) as adjacent text |
| `indeterminate` | No numeric value exists to report — `aria-valuemin`/`-max`/`-now` are all omitted (WAI-ARIA progressbar pattern: an indeterminate bar communicates only "work is ongoing", never a percentage) and `aria-busy="true"` replaces them. `showValue` is ignored (nothing to show — enforced by the template guard `mode === 'determinate' && showValue`, not by disabling the input) |

No deliberate omissions beyond the interactive-state set already covered in §1.

---

## 3. Size API: space scale, not control-height (DoD row 3)

`size="sm" | "default" | "lg"` is the same closed `InoControlSize` union every component uses
(`web/src/app/components/control-size.ts`), but **does not** read `--ino-control-height` — a
32-44px control floor is the wrong scale entirely for a 4-12px bar, the identical reasoning
`ino-tag`'s SPEC.md §3 gives for skipping the same alias on an inline chip.

Instead the track thickness steps through three rungs of the §5 space scale (the only primitive
whose granularity fits a thin bar) via a component-local custom property, the same idiom `ino-tag`
uses for `--ino-tag-fill`:

| `size` | Track thickness |
|---|---|
| `sm` | `var(--ino-space-1)` = 4px |
| `default` | `var(--ino-space-2)` = 8px |
| `lg` | `var(--ino-space-3)` = 12px |

The value label's font-size still reads the Wave 0 `--ino-control-font-size-{sm,lg}` aliases (the
label is running text, not a control), so it stays visually in step with every other sized
component on the page.

---

## 4. Density (DoD row 4)

A progress bar is not itself a row-based component (no natural row concept — it is a thin bar,
usually one row's worth of content by itself). It reads `--ino-row-min-height` as an **opt-in**
`min-block-size` floor, falling back to the dense value (32px) outside a `[data-density]` ancestor
— the same fallback `ino-tag`'s SCSS uses (tokens.css §10 only ever defines this token as
32px | 44px, so `auto` is not a sanctioned fallback; `check-ds-adherence.mjs`'s `stale-var-fallback`
rule catches it) — so a progress bar embedded in a dense table row (e.g. a per-file upload row)
does not shrink that row below its own floor, without the bar itself ever being forced to
32/44px tall.

---

## 5. ARIA contract (DoD row 8)

`role="progressbar"` on the host. Determinate mode sets `aria-valuemin="0"`, `aria-valuemax="100"`,
`aria-valuenow` (clamped), and `aria-valuetext` (the same string rendered visually, e.g. "62%") so
a screen reader announces the identical value a sighted user sees, including the unit — not a bare
number that reads ambiguously. Indeterminate mode omits all three `aria-value*` attributes and sets
`aria-busy="true"` instead, per the WAI-ARIA progressbar pattern (§2).

`aria-invalid` reflects `invalid`; `aria-disabled` reflects `disabled` (not the native `disabled`
attribute — the host is a `<div>`, which has none, and removing the element from the tree would
drop the value from the accessibility tree entirely — same rationale `ino-tag` gives for its own
`aria-disabled` choice).

**Contrast and targets.** The track/fill pair and the invalid danger fill are the same AA-verified
roles every other component uses, audited in all three themes by `check-theme-parity.mjs`; the
track's 1px border is the generic `border` role (≥3:1 non-text, WCAG 2.2 SC 1.4.11). Target-size
criteria (SC 2.5.8) do not apply — the component is never focusable/clickable (§1).

---

## 6. Motion (DoD row 7)

Determinate fill-width changes animate over `--ino-motion-duration-base` +
`--ino-motion-easing-standard` — a value update is a content change, not an entrance, matching the
"quick, no drama" pairing `ino-tag` uses for its own state changes.

Indeterminate mode sweeps a 40%-wide segment end-to-end over `--ino-motion-duration-slow`, linear
easing swapped for `--ino-motion-easing-standard` to avoid a jarring instant-reset at the loop
boundary. Under `prefers-reduced-motion: reduce`, the sweep animation is dropped entirely and the
segment renders as a static partial fill — motion is indeterminate mode's *only* progress signal,
so "slow it down" is not an option; "stop it, keep `aria-busy` doing the talking" is the same
resolution `ino-tag`/`ino-toggle` already apply to their own transitions.

---

## 7. RTL (DoD row 8)

Logical properties only: `inline-size`/`block-size`, `inset-inline-start`, `inset-block`. The
indeterminate sweep is keyframed on `inset-inline-start`, not `left`, so it runs the correct
direction for free under `dir="rtl"` — no separate RTL branch needed anywhere in the stylesheet.

---

## 8. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue (T-15, `M` = 3).

- **Capacitor**: not a separate port — the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoProgressBar.tsx`. `Animated.Value`
  drives the indeterminate sweep (RN has no CSS keyframe equivalent); `accessibilityRole="progressbar"`
  plus `accessibilityValue` mirror the web ARIA contract (§5), including omitting `now`/`min`/`max`
  in indeterminate mode.
- **Flutter**: `mobile/flutter/lib/widgets/ino_progress_bar.dart`. `AnimationController` drives the
  same sweep; `Semantics(value: …)` mirrors the same value-text contract, and indeterminate mode
  passes no `value` to `Semantics` (Flutter's own indeterminate convention, matching web/RN).

All three read the same ported colour roles used elsewhere (`accent` gradient/fallback flat colour
on mobile, `danger`, `border`, `surfaceSunken`) — no new mobile-only fields needed, unlike `ino-tag`'s
`risk*` gap.

---

## 9. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `virtual-scroller/SPEC.md` §6, re-verified for this issue: DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but **no
such registry exists in the file** (confirmed by reading it in full — it is a token-contract audit
script, not a per-component index). Nothing appended; `node scripts/check-theme-parity.mjs` passes
unchanged.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ 0 violations |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build --configuration production` (web) | ✅ passes, no errors, no budget warnings |
| `dart analyze lib/widgets/ino_progress_bar.dart` (flutter) | ✅ clean |
| `npx tsc --noEmit` (mobile/react-native) | ✅ clean |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
