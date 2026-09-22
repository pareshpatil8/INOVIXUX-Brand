# `<ino-skeleton>` — component spec

**Issue:** INO-131 (INO-31 T-14, Tier 1 / Misc group)
**Parity benchmark:** PrimeNG 22.1.1 `Skeleton` — `specs/primeng/llms-22.1.1.txt` line 108, route
`https://primeng.dev/skeleton`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Closes:** doc 16 finding E-4 (no skeleton on card or metric-panel).

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 2 of 8 states carried, 6 deliberately N/A (DoD row 5)

`<ino-skeleton>` is a decorative loading placeholder, not a control — it never receives focus, a
value, or user input.

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Flat fill (`--ino-color-border-soft`), or shimmering under `no-preference` (§4 below) |
| Loading/busy | ✅ | This *is* the component's entire reason for existing. When `label` is set, the host carries `role="status"`/`aria-live="polite"`/`aria-busy="true"` and the label text is the announced live-region content (§5) |
| Disabled | N/A — not carried | There is no control here to disable; a skeleton has no interactive affordance to suppress |
| Hover | N/A — not carried | Nothing to reveal — same reasoning `ino-tag` already documented for its own non-interactive state set |
| Active/pressed | N/A — not carried | Follows from the above |
| Focus-visible | N/A — not carried | The host is never in the tab order (no `tabindex`, no native focusable element) |
| Readonly | N/A — not carried | "Readonly" distinguishes a control that *could* accept input from one that currently doesn't; a skeleton never accepts input |
| Invalid | N/A — not carried | A read-only placeholder has no value of its own to fail validation |

---

## 2. Shapes built (DoD row 6)

| Named in the issue | Shipped | Default geometry |
|---|---|---|
| Rectangle | ✅ (default) | `block-size: var(--ino-control-height)`, `border-radius: var(--ino-radius-md)` — stands in for a button/field/card |
| Circle | ✅ | Square box (`inline-size` = `block-size` = `var(--ino-control-height)`), `border-radius: 50%` — stands in for an avatar |
| Text | ✅ | `block-size: 1em` at `var(--ino-control-font-size)`, `border-radius: var(--ino-radius-sm)` — stands in for one line of copy |

No deliberate omissions — all three shapes named in the issue are shipped. A multi-line paragraph
helper (rendering N stacked `text` lines) was considered and dropped: PrimeNG's own benchmark has no
such prop either — callers compose multiple `<ino-skeleton shape="text">` siblings, exactly as they
would compose multiple PrimeNG `<p-skeleton>` elements today.

---

## 3. Size API + explicit overrides (DoD row 3)

`size="sm" | "default" | "lg"` is the closed `InoControlSize` union (`control-size.ts`), reading
the Wave 0 control-height scale's `--ino-control-height` alias for `rectangle`/`circle` and the
`--ino-control-font-size` alias (driving the `1em` `block-size`) for `text` — the same
`control-size-scale.md` §3 adoption recipe every sized component already uses (`:host([data-size])`
re-points the bare aliases; the base rule reads only the unsuffixed alias, already declared at
`:root` in `tokens.css` §12).

`width` / `height` / `borderRadius` are optional plain-string `@Input`s (CSS length, e.g. `'60%'`,
`'12rem'`) mirroring the PrimeNG benchmark's own props one-for-one. They bind as inline styles on the
host (`[style.inline-size]` / `[style.block-size]` / `[style.border-radius]`), which — by ordinary
CSS specificity — win over the `:host([data-shape='…'])` default rules without any `!important` or
extra selector weight. Left unset (`''`, the default), the shape/size defaults from §2 apply
untouched. This is the one place the component accepts a caller-supplied raw CSS length rather than
a token — same as PrimeNG's own `width`/`height`, and unavoidable for a placeholder that has to match
whatever arbitrary content box it stands in for; it is never a color/space/radius/duration/font-size
value, so it does not violate DoD row 1's "zero hardcoded token-space values" contract (that contract
governs the component's own declarations, not a caller-supplied layout dimension).

---

## 4. Motion (DoD row 7)

Pattern B from `motion-contract.md` §2 (decorative, opt-in under `no-preference`): the flat
`--ino-color-border-soft` fill is the resting/reduced-motion state, and the shimmer gradient +
`animation` declaration are gated entirely inside `@media (prefers-reduced-motion: no-preference)` —
nothing to cancel under `reduce`, nothing forgotten.

Reuses the exact recipe `ino-virtual-scroller`'s own built-in skeleton bar already established
(`motion-contract.md` §2 Pattern B list): `--ino-color-border-soft` → `--ino-color-border` →
`--ino-color-border-soft` sweep, `--ino-motion-duration-slow` + `--ino-motion-easing-standard`,
`background-size: 200% 100%` animating `background-position`. One shimmer recipe shared across the
design system, not a second one invented for this component.

`animate` (`@Input`, default `true`) is a separate, JS-level opt-out for callers who want a static
placeholder regardless of the user's OS motion preference (e.g. a printed/exported view) — it gates
the same `no-preference` block via `.ino-skeleton--static`, and is independent of, not a replacement
for, the `prefers-reduced-motion` branch above.

---

## 5. ARIA contract (DoD row 8)

**Default (`label` unset, the common case): `aria-hidden="true"`.** A skeleton is a purely visual
stand-in — the real content it represents will announce itself once it renders, and a screen-reader
user gains nothing from being told "loading placeholder" for every one of a dozen skeleton rows on a
list. This matches the PrimeNG benchmark, which ships no ARIA attributes on its skeleton at all.

**Opt-in (`label` set): `role="status"` + `aria-live="polite"` + `aria-busy="true"`, `aria-hidden`
removed.** The label text renders into a visually-hidden node (`.ino-skeleton__sr`, the same sr-only
clip idiom as `ino-alert__sr-status` / `ino-tag__label--sr-only` / `ino-vs__sr`) so it is the live
region's accessible content. Use this only where there is genuinely no other loading announcement on
the page — e.g. a lone skeleton replacing an entire panel — not on every individual skeleton in a
repeated list, which would fire a redundant announcement per row.

**Keyboard** — none; the host is never in the tab order (no `tabindex`, no native focusable
element).

**Contrast** — the flat/shimmer fill uses `--ino-color-border-soft`/`--ino-color-border`
(non-text, decorative), already AA-audited across all three themes by every other component
consuming those two roles; no new contrast surface introduced.

**Target size (SC 2.5.8)** — does not apply; the component is never focusable or clickable.

---

## 6. RTL (DoD row 6/8)

Logical properties only: `inline-size`/`block-size`, `border-radius` (already direction-agnostic).
No `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## 7. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor**: not a separate port — the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoSkeleton.tsx`. Shimmer uses RN's
  `Animated` API (`useNativeDriver: true`, transform-only) looping at `motion.durationSlow`, gated
  behind `AccessibilityInfo.isReduceMotionEnabled()` (RN's `prefers-reduced-motion` equivalent) — the
  reduced-motion branch renders the flat `borderSoft` fill and never starts the loop, same Pattern B
  contract as web.
- **Flutter**: `mobile/flutter/lib/widgets/ino_skeleton.dart`. Shimmer uses an `AnimationController`
  looping at `InoMotion.slow`, gated behind `MediaQuery.of(context).disableAnimations` (Flutter's
  `prefers-reduced-motion` equivalent) with the same flat-fill fallback.

Both mobile ports carry `shape` (`rectangle`/`circle`/`text`), `size` (the ported `ControlSize` /
`InoControlSize` scale), explicit `width`/`height` overrides, and the `animate` opt-out. Neither
carries the web `label`/live-region prop: RN/Flutter's accessibility trees have no ARIA
`role="status"`/`aria-live` equivalent exposed at the component-prop level the way web does — a
mobile caller who needs a loading announcement uses the platform's own screen-reader announcement
API (`AccessibilityInfo.announceForAccessibility` / `SemanticsService.announce`) at the call site,
the same boundary `ino-tag`'s mobile ports already draw around web-only ARIA plumbing.

---

## 8. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `virtual-scroller/SPEC.md` §6 and `tag/SPEC.md` §8, re-verified for this issue: DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but no such
registry exists in the file (confirmed by reading it in full — it is a token-contract audit script,
not a component registry). Nothing appended; `node scripts/check-theme-parity.mjs` passes unchanged.
Component-level token adherence is covered by `check-ds-adherence.mjs`'s directory-scope walk
instead.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token; `width`/`height`/`borderRadius` are caller-supplied layout dimensions, not design values (§3) |
| `[data-theme]` branch in the component | none |
