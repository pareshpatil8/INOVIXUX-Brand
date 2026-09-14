# Control-size scale — `sm` / `default` / `lg` × dense/fluid

> Wave 0, INO-124. Blocks most of Wave 1 and Wave 2: 0 of 16 existing components had a `size` API
> before this issue, and ~35 components across the remaining waves need one. This doc is the
> adoption recipe `tokens.css` §12 points at; the source of truth is always the tokens, never this
> file.
> Preview: [`previews/control-size-scale.html`](previews/control-size-scale.html).
> Register item: N-1.

Every component's `size="sm" | "default" | "lg"` `@Input` resolves entirely through
`web/src/tokens.css` §12. A component never invents a local pixel value for height, inline padding,
icon size, or gap — if a value isn't already in §12, that's a Wave 0 amendment, not something to add
inline.

## 1 — Two independent axes

**Density** (`[data-density="dense" | "fluid"]`, absent = base) is container-scoped and describes a
screen: an ops console is dense, a B2C onboarding flow is fluid. **Size** is per-instance and
describes one control on that screen: `size="sm"` is small relative to its neighbours *in whichever
density it renders under* — it is never a fixed pixel count. A dense `size="lg"` button and a fluid
`size="sm"` button can land at very different absolute pixel heights; that's correct, not a bug.

The two axes are orthogonal by construction: every density block re-resolves the full `sm` /
`default` / `lg` row rather than scaling a single base number, because dense compresses height,
padding, icon size and `-default` font size disproportionately (icons bottom out at their 16px
floor well before height does).

## 2 — The six fields

| Field | CSS custom property family | Aliases |
|---|---|---|
| Control height | `--ino-control-height-{sm,default,lg}` | Raw px, its own ramp |
| Inline padding (fields) | `--ino-control-padding-inline-{sm,default,lg}` | §5 space scale |
| Inline padding (label-bearing pressables) | `--ino-control-padding-inline-roomy-{sm,default,lg}` | §5 space scale |
| Font size | `--ino-control-font-size-{sm,default,lg}` | §4 type scale (`body-sm` / `body` / `body-lg`) |
| Icon size | `--ino-control-icon-size-{sm,default,lg}` | Raw px, the published icon rows (`14-icon-system.md` §2) |
| Gap | `--ino-control-gap-{sm,default,lg}` | §5 space scale |

Two inline-padding tracks exist because one track cannot serve both halves of the library: the
unsuffixed track is for **fields** (input, select, textarea — the value must align under its label),
`-roomy` is for **label-bearing pressables** (button, tab, menu item — the label needs air). Both are
logical (`padding-inline`), so RTL is free.

Gap does **not** vary between `sm` and `default` — the next step below 8px on the space scale is
4px, a within-component step, and tightening an icon-to-label gap buys 4px while measurably hurting
scannability. `lg` still steps up to 12px.

## 3 — Adoption recipe

Components never read a per-size token directly in their base rule. They read six unsuffixed
**consumption aliases**, and a size class re-points the aliases on the host:

```scss
// Base rule reads only the bare aliases.
:host {
  min-height: var(--ino-control-height);
  padding-inline: var(--ino-control-padding-inline-roomy);
  font-size: var(--ino-control-font-size);
  gap: var(--ino-control-gap);
}

// A size class re-points the aliases — nothing else changes.
:host(.ino-btn--sm) {
  --ino-control-height: var(--ino-control-height-sm);
  --ino-control-padding-inline-roomy: var(--ino-control-padding-inline-roomy-sm);
  --ino-control-font-size: var(--ino-control-font-size-sm);
  --ino-control-gap: var(--ino-control-gap-sm);
}
:host(.ino-btn--lg) { /* same shape, -lg */ }
```

```ts
import { InoControlSize } from '../control-size';

@Input() size: InoControlSize = 'default';
```

`InoControlSize` (`web/src/app/components/control-size.ts`) is the single closed union behind every
component's `size` input — imported by path, since this project has no barrel file. Do not declare a
per-component copy of the union; that's exactly the drift (`'medium'` in one component, `'md'` in
another) this issue exists to prevent.

`'default'`, not `'md'`, is the deliberate name for the middle rung: it's the value a caller gets by
writing nothing at all, so the written form and the omitted form read the same.

Components consuming `--ino-row-min-height` (row-based components — table rows, list items) get it
free: `--ino-control-height-default` is pinned to `--ino-row-min-height` in dense (so a control
dropped into a dense table row is exactly row height) and to `--ino-target-comfortable` in fluid.

## 4 — Density resolution

| | height | padding-inline | padding-inline-roomy | icon-size | font-size (default) |
|---|---|---|---|---|---|
| **dense** sm | 28px | 8px | 12px | 16px | — |
| **dense** default | 32px (= `--ino-row-min-height`) | 12px | 16px | 16px | 12.5px |
| **dense** lg | 40px | 16px | 20px | 20px | — |
| **base/fluid** sm | 36px | 12px | 16px | 16px | — |
| **base/fluid** default | 44px (= `--ino-target-comfortable`) | 16px | 20px | 20px | 15px (base: 14px) |
| **base/fluid** lg | 52px | 20px | 24px | 24px | — |

`base` (`:root`) and `[data-density="fluid"]` are numerically identical geometry, re-declared rather
than left to inherit: a fluid island nested inside a dense shell (a B2C onboarding step embedded in
an ops console) must re-resolve the fluid row, not silently inherit the dense one. Font size is the
one field that legitimately diverges between base and fluid (14px vs 15px body), because it aliases
each density block's own `--ino-type-body-size`, and dense/fluid define different body sizes.

Every height at every size in every density stays at or above `--ino-target-min` (WCAG 2.2 SC 2.5.8,
24px) — dense `sm` at 28px is the tightest rung, with 4px to spare.

## 5 — Accessibility

- **Target size.** All nine height rows (3 sizes × 3 density resolutions) clear the 24px SC 2.5.8
  floor; `default` in every density clears the 44px comfortable target (`--ino-target-comfortable`).
- **RTL.** Every field aliases logical properties (`padding-inline`, not `padding-left`/`-right`).
  No size class needs a mirrored variant.
- **Focus ring / states.** Size is orthogonal to state — a size class never touches
  `--ino-focus-ring` or a state color. `:active` and focus-visible come from the Wave 0 focus-ring
  tokens (INO-123) regardless of which size class is applied.
- **Zero hardcoded values.** No component may declare a raw px height, padding, icon size, or gap
  outside this scale; `scripts/check-theme-parity.mjs` structurally asserts the CSS shape (strictly
  increasing heights, non-decreasing padding/icon/gap, space/type aliasing) so a violation fails CI,
  not just review.

## 6 — Mobile parity

Mobile ports carry the **fluid column only** — mobile is always fluid, never dense:

- React Native: `mobile/react-native/src/theme/tokens.ts`, `export const control = { sm, default, lg }`.
- Flutter: `mobile/flutter/lib/theme/tokens.dart`, `class InoControlSize` with `sm` / `standard` /
  `lg` static members. `standard` — not `default` — is the Flutter name for the middle rung, because
  `default` is a reserved word in Dart. This is the one place the scale's names diverge across
  platforms; `check-theme-parity.mjs` asserts the *values* line up regardless of the name.

`scripts/check-theme-parity.mjs` resolves every one of the six fields × three sizes against the CSS
fluid resolution for both mobile ports, so a port drifting from the CSS fails the build rather than
failing silently at runtime.

## 7 — Verification

```sh
node scripts/check-theme-parity.mjs   # structural + numeric assertions on tokens.css §12 + both mobile ports
```

The script fails the build if: a density block's token set doesn't match its sibling; a height falls
under `--ino-target-min`; a padding/font-size/gap alias points at a raw value instead of the §4/§5
scales; a bare consumption alias doesn't track its own `-default` row; or a mobile port value
disagrees with the CSS fluid resolution.
