# `<ino-skeleton>` — Skeleton

> Parity benchmark: PrimeNG 22.1.1 `Skeleton` (`specs/primeng/llms-22.1.1.txt`, line 108,
> `https://primeng.dev/skeleton`). PrimeNG is a benchmark, **not a runtime dependency** — nothing
> here installs it.
>
> Closes doc 16 finding E-4 (no loading placeholder for `ino-card`/`ino-metric-panel`).
> Preview: [`previews/skeleton.html`](previews/skeleton.html).
> Decisions record: `web/src/app/components/skeleton/SPEC.md`.

A pure CSS loading placeholder: three shapes (`rectangle` / `circle` / `text`), the Wave 0
control-size scale, explicit `width`/`height`/`borderRadius` overrides, and a shimmer that respects
`prefers-reduced-motion`. Decorative and non-interactive — it never reserves space for content it
hasn't seen, it just paints the box the caller sizes.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `shape` | `'rectangle' \| 'circle' \| 'text'` | `'rectangle'` | Drives the default geometry — see [Shapes](#shapes) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale; `rectangle`/`circle` read `--ino-control-height`, `text` reads `--ino-control-font-size` |
| `width` | `string` (CSS length) | `''` | Overrides the shape's default `inline-size` |
| `height` | `string` (CSS length) | `''` | Overrides the shape's default `block-size` |
| `borderRadius` | `string` (CSS length) | `''` | Overrides the shape's default `border-radius` |
| `animate` | `boolean` | `true` | `false` pins the flat resting fill regardless of OS motion preference |
| `label` | `string` | `''` | Opt-in accessible loading announcement — see [Accessibility](#accessibility-contract) |

`width` / `height` / `borderRadius` are caller-supplied CSS lengths (e.g. `'60%'`, `'12rem'`), not
design tokens — the one place this component accepts a raw value instead of a semantic role,
because a placeholder has to match whatever arbitrary content box it stands in for. Full reasoning:
`SPEC.md` §3.

---

## Shapes

| Named in the issue | Shipped | Default geometry |
|---|---|---|
| Rectangle | ✅ (default) | `block-size: var(--ino-control-height)`, `border-radius: var(--ino-radius-md)` — stands in for a button/field/card |
| Circle | ✅ | Square box sized to `var(--ino-control-height)`, `border-radius: 50%` — stands in for an avatar |
| Text | ✅ | `block-size: 1em` at `var(--ino-control-font-size)`, `border-radius: var(--ino-radius-sm)` — stands in for one line of copy |

No deliberate omissions. A multi-line paragraph helper was considered and dropped — callers compose
multiple `<ino-skeleton shape="text">` siblings instead, matching the PrimeNG benchmark. Full
reasoning: `SPEC.md` §2.

---

## Motion

Pattern B from `motion-contract.md` §2 (decorative, opt-in under `no-preference`): the flat
`--ino-color-border-soft` fill is the resting/reduced-motion state; the shimmer gradient +
animation live entirely inside `@media (prefers-reduced-motion: no-preference)`. Reuses the exact
recipe `ino-virtual-scroller`'s built-in skeleton bar already established — one shimmer recipe
shared across the design system. `animate="false"` is a separate JS-level opt-out independent of
the OS preference (e.g. a printed/exported view). Full reasoning: `SPEC.md` §4.

---

## Accessibility contract

**Default (`label` unset):** `aria-hidden="true"`. A skeleton is a purely visual stand-in — the real
content it represents announces itself once it renders; a screen-reader user gains nothing from
"loading placeholder" being read for every row in a list.

**Opt-in (`label` set):** `role="status"` + `aria-live="polite"` + `aria-busy="true"`, `aria-hidden`
removed. The label text renders into a visually-hidden node so it becomes the live region's
accessible content. Use only where there is genuinely no other loading announcement on the page —
not on every skeleton in a repeated list.

**Keyboard** — none; the host is never in the tab order (no `tabindex`, no native focusable
element).

**Contrast** — the flat/shimmer fill uses `--ino-color-border-soft`/`--ino-color-border`
(non-text, decorative), already AA-audited across all three themes by every other component
consuming those roles.

**Target size (SC 2.5.8)** — does not apply; never focusable or clickable.

**RTL** — logical properties only (`inline-size`/`block-size`, `border-radius`); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

Full reasoning: `SPEC.md` §5–6.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6, full detail in `SPEC.md` §1):

- **Disabled / hover / active / focus-visible / readonly / invalid states.** Not carried — a
  skeleton is a decorative placeholder, not a control; there is nothing to disable, reveal, or
  validate, and the host is never in the tab order.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoSkeleton.tsx`. Shimmer uses RN's
  `Animated` API (`useNativeDriver: true`, transform-only), gated behind
  `AccessibilityInfo.isReduceMotionEnabled()`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_skeleton.dart`. Shimmer uses an
  `AnimationController`, gated behind `MediaQuery.of(context).disableAnimations`.

Both mobile ports carry `shape`, `size`, explicit `width`/`height` overrides, and `animate`. Neither
carries the web `label`/live-region prop — a mobile caller needing a loading announcement uses the
platform's own screen-reader announcement API at the call site. Full reasoning: `SPEC.md` §7.
