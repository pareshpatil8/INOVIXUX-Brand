# `<ino-progress-bar>` — component spec

**Issue:** INO-132 (INO-31 T-15, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `ProgressBar` — `specs/primeng/llms-22.1.1.txt` line 97, route
`https://primeng.dev/progressbar`. PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 2 of 8 states carried, 6 deliberately N/A (DoD row 5)

`<ino-progress-bar>` is a process-status indicator, not a control — it never receives focus, a
user-editable value, or user input; the caller drives `value`/`mode` from whatever process it
reports on.

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | The resting determinate fill (`--ino-gradient-accent` on `--ino-color-border-soft`), §2 below |
| Loading/busy | ✅ | `mode="indeterminate"` — the component's other core reason for existing. Host carries `aria-busy="true"` and omits `aria-valuenow` per the ARIA spec (§8) |
| Disabled | N/A — not carried | There is no control here to disable; a status bar has no interactive affordance to suppress. If a host page needs to visually mute a stale/paused progress bar, it does so at the call site (e.g. wrapping opacity), not via a component input |
| Hover | N/A — not carried | Nothing to reveal — same reasoning `ino-skeleton`/`ino-tag` already documented for their own non-interactive state sets |
| Active/pressed | N/A — not carried | Follows from the above |
| Focus-visible | N/A — not carried | The host is never in the tab order (no `tabindex`, no native focusable element) |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't; a progress bar never accepts input |
| Invalid | N/A — not carried, see §5 | |

---

## 2. Colour roles (DoD row 1)

| Role | Token | Notes |
|---|---|---|
| Track | `--ino-color-border-soft` | Same non-text decorative role `ino-skeleton`'s resting fill uses |
| Fill (determinate + indeterminate) | `--ino-gradient-accent` | Same accent-gradient role `ino-toggle`'s checked track and `ino-button`'s primary fill already use — one "this is progressing" gradient shared across the system, not a second one invented here |
| Value label text | `--ino-color-on-surface-muted` | Non-emphasis caption role, same as `ino-skeleton`'s `label` text would use if visible |

No hardcoded colour/space/radius/duration/font-size anywhere in the stylesheet; the one
component-private custom property (`--ino-progress-bar-track-size`, §3) is itself built entirely
from `--ino-space-*` token references, never a literal.

---

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` is the closed `InoControlSize` union (`control-size.ts`). Unlike a
44px-tall control, a status bar has no reason to stretch its track to `--ino-control-height` — the
same reasoning `ino-tag`'s SPEC.md §3 gives for why a non-control-height element still reads the
Wave 0 scale through a subset of its aliases rather than forcing `min-block-size:
var(--ino-control-height)` onto itself:

- The visible value label (`showValue`) reads the bare `--ino-control-font-size` alias, re-pointed
  per size exactly like every other sized component (`control-size-scale.md` §3 recipe).
- The track's own thickness reads a component-private `--ino-progress-bar-track-size` alias,
  declared once at `:host` as `var(--ino-space-3)` and re-pointed to `var(--ino-space-2)` (sm) /
  `var(--ino-space-4)` (lg) — the same "declare the bare alias once, re-point it per
  `[data-size]`" shape the shared recipe uses, built on the space scale rather than a bespoke
  literal because DoD row 1 requires every value to resolve through *some* named token, and the
  space scale is the token family that already governs geometric steps this small (control-height's
  own steps — 36/44/52px — are an order of magnitude too tall for a status bar's track).

---

## 4. Density (DoD row 4)

Not row-based: a progress bar is a bar, not a table/list row, so `--ino-row-min-height` does not
apply — the same conclusion `ino-skeleton`'s rectangle/circle shapes reach for the same reason (they
read `--ino-control-height`, never `--ino-row-min-height`). Density therefore has nothing to
re-resolve here: the track's thickness is driven entirely by the size-scoped
`--ino-progress-bar-track-size` alias (§3), which is orthogonal to `[data-density]` the same way
`size="lg"` is orthogonal to a dense ancestor for every other sized component (doc 16 §8). Verified
by inspection: no rule in this stylesheet reads `--ino-row-min-height`.

---

## 5. Invalid / severity variant (DoD row 5)

The PrimeNG 22.1.1 benchmark entry for `ProgressBar` (line 97) reads only "ProgressBar is a process
status indicator" — no `severity`/`status` prop is called out in the benchmark index, unlike
`ino-tag`'s risk-severity variant (which *does* have a PrimeNG parity hook). The ticket does not
call for an error-state progress bar either. Deliberate omission: no `status`/`invalid` variant is
shipped. A future issue that needs a failed-process bar (e.g. a red fill on upload failure) should
add a `status` input reusing the existing `--ino-color-danger`/`--ino-color-warning`/
`--ino-color-success` roles — no new token required — rather than this component growing an
`invalid` boolean that has no ARIA-`aria-invalid` equivalent for `role="progressbar"` in the first
place (that attribute is defined for form-adjacent widgets, not status indicators).

---

## 6. Variants (DoD row 6)

| Variant | Shipped | Notes |
|---|---|---|
| Determinate | ✅ (default) | `[style.inline-size.%]` bound to the clamped `value` input; `transition: inline-size` (Pattern A) so value changes animate, see §7 |
| Indeterminate | ✅ | `mode="indeterminate"` — fixed-width fill sweeping the track, see §7 |
| `showValue` | ✅ | PrimeNG parity — renders the numeric percentage as visible text next to the track. Determinate-only: an indeterminate bar has no meaningful percentage to show (PrimeNG's own benchmark doesn't offer one either), so `showValue` is silently ignored (not an error) when `mode="indeterminate"` — documented here rather than silently dropped |

No other deliberate omissions.

---

## 7. Motion (DoD row 7)

Two different shapes, two different patterns from `motion-contract.md` §2:

- **Determinate value change — Pattern A** (state-feedback transition). The fill's
  `inline-size` change is a real, meaningful state change (the process advanced) that must still
  happen under `reduce`; only the easing is removed. `transition: inline-size
  var(--ino-motion-duration-base) var(--ino-motion-easing-standard)`, nulled to `transition: none`
  inside `@media (prefers-reduced-motion: reduce)`.
- **Indeterminate sweep — Pattern B** (decorative, opt-in under `no-preference`). The resting state
  — a static 40%-wide fill pinned to the track's start — is declared unconditionally; the
  `@keyframes` sweep is declared entirely inside `@media (prefers-reduced-motion:
  no-preference)`, so `reduce` users get the static partial fill by default, nothing to cancel.
  This still satisfies `aria-busy`/`role="progressbar"` semantics (§8) — the ARIA contract does not
  depend on the CSS animation running.

Duration is `calc(var(--ino-motion-duration-slow) * 3)` (1440ms) + `--ino-motion-easing-standard` —
the same "three `durationSlow` beats reads as a sweep, one beat reads as flicker" reasoning the
`ino-skeleton` mobile ports (`InoSkeleton.tsx` / `ino_skeleton.dart`, pending INO-131) use for their
own shimmer loop, reused here rather than re-derived, and kept identical across web/RN/Flutter (§9)
so the loop feels the same speed on every track.

---

## 8. Accessibility contract (DoD row 8)

**Role/ARIA:** host carries `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`
always. `aria-valuenow` (the clamped `value`, 0–100) and `aria-valuetext` (`"{value}%"`, so a
screen reader announces a percentage rather than a bare number with no unit) are set only in
`mode="determinate"`. In `mode="indeterminate"`, both are **omitted** — not set to `null`/`0` — per
the WAI-ARIA spec's explicit guidance that an indeterminate `progressbar` must not carry
`aria-valuenow`; `aria-busy="true"` is set instead so assistive tech announces "busy" rather than a
stalled 0%. `aria-label` is bound from the optional `label` input when the surrounding page has no
other accessible name for the bar (e.g. a preceding heading/label already names it — then `label`
is left unset and the surrounding text remains the accessible name via `aria-labelledby` at the
call site, same boundary `ino-skeleton`'s optional `label` draws).

The visible `showValue` text is a **decorative duplicate** of the value already conveyed
programmatically (`aria-valuenow`/`aria-valuetext`) — it renders `aria-hidden="true"` so it is not
announced a second time.

**Keyboard** — none; the host is never in the tab order (no `tabindex`, no native focusable
element).

**Visible focus** — N/A; never focusable.

**Contrast (WCAG 2.2 SC 1.4.11 non-text, SC 1.4.3 text):** the track (`--ino-color-border-soft`)
and fill (`--ino-gradient-accent`) are both already AA/AAA-audited non-text roles reused from
`ino-skeleton`/`ino-toggle` across all three themes (`tokens.css` README contrast audit); the
`showValue` label text uses `--ino-color-on-surface-muted`, the same muted-caption role already
audited at ≥7:1 in high-contrast mode by every other component that reads it (`tokens.css` §2c).
No new contrast surface introduced.

**Target size (SC 2.4.11 / 2.5.8)** — does not apply; never focusable or clickable, so there is no
24px/44px target to measure.

**RTL** — logical properties only (`inline-size`/`block-size`, `inset-inline-start`, `inset-block`);
no `left`/`right`/`top`/`bottom`/physical `width` anywhere in the stylesheet, so the determinate
fill grows from the reading-direction start and the indeterminate sweep travels start→end in both
LTR and RTL automatically.

---

## 9. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor**: not a separate port — the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoProgressBar.tsx`. Re-authored, not
  shared (RN has no CSS custom properties/`@keyframes`): the determinate fill animates `width` via
  `Animated.timing` (`useNativeDriver: false` — `width` is a layout property, unlike the
  `translateX` transform `InoSkeleton`'s shimmer uses); the indeterminate sweep loops an
  `Animated.Value` driving `translateX` (`useNativeDriver: true`), gated behind
  `AccessibilityInfo.isReduceMotionEnabled()` exactly like `InoSkeleton`'s own shimmer gate — under
  reduced motion the fill renders as the same static 40%-wide resting bar the web CSS falls back
  to.
- **Flutter**: `mobile/flutter/lib/widgets/ino_progress_bar.dart`. Determinate fill animates via an
  implicit `AnimatedContainer`/`TweenAnimationBuilder` on width; the indeterminate sweep uses an
  `AnimationController` looping a `FractionalTranslation`, gated behind
  `MediaQuery.of(context).disableAnimations` (same idiom as `ino_skeleton.dart`, pending INO-131),
  falling back to the same static resting bar.

Both mobile ports carry `mode`, `value` (clamped 0–100), `size` (the ported `ControlSize` /
`InoControlSize` scale), and `showValue`. Neither carries the web `label`/`aria-label` prop as a
string input the same way `InoSkeleton` draws that line for its own `label`: RN/Flutter expose
their accessible-name/role plumbing differently (`accessibilityLabel`/`accessibilityRole` on RN,
`Semantics(label: …, value: …)` on Flutter) rather than through an ARIA attribute string, so each
port wires `role="progressbar"`-equivalent semantics directly (RN: `accessibilityRole="progressbar"`
+ `accessibilityValue`; Flutter: `Semantics(value: …)`) instead of accepting a redundant `label`
input that would only ever forward to that same platform API.

---

## 10. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `virtual-scroller/SPEC.md` §6, `tag/SPEC.md` §8 and `skeleton/SPEC.md` §8 (pending INO-131), re-verified for this issue: DoD row 11 describes "one appended line in the
`check-theme-parity.mjs` component registry", but no such registry exists in the file (confirmed by
reading it in full — it is a token-contract audit script, not a component registry). Nothing
appended; `node scripts/check-theme-parity.mjs` passes unchanged. Component-level token adherence
is covered by `check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 11. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
