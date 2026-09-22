# Elevation scale + composite type aliases + leading/tracking scales

> Wave 0, INO-126 (W0-4). Token-layer issue, same shape as W0-1 (focus-ring), W0-2 (control-size
> scale) and W0-3 (form-label tokens): no component ships in this issue, `tokens.css` is the
> deliverable, and every future component reads these tokens instead of composing its own shadow or
> font shorthand. The source of truth is always `tokens.css` §2 / §4c, never this file.
> Preview: [`previews/elevation-type-rhythm-tokens.html`](previews/elevation-type-rhythm-tokens.html).
> Register items: N-5 (composite type aliases + leading/tracking scales), N-6 (elevation scale).

## 1 — What this issue adds, and what it deliberately leaves alone

Three additions, all in `tokens.css`, none of them a rename:

1. **Elevation scale** — `--ino-elevation-0/-1/-2` (2 real steps, since `-0` is `none`) expands to
   `--ino-elevation-neutral-1..6` + `--ino-elevation-brand-1..3` + `--ino-elevation-inset-1..2`, 11
   new tokens, in §2.
2. **`--ino-leading-*` / `--ino-tracking-*`** — the 9 distinct line-height values and 7 distinct
   letter-spacing values already audited into the type roles (§4/§4b) and the density blocks (§10),
   promoted to named primitives, in §4c.
3. **`--ino-type-<role>` composite aliases** — one `font` shorthand per type role, also §4c.

`--ino-elevation-0/-1/-2` are **unchanged and stay legal.** Six existing files
(`ino-card`, `ino-tier-card`, `ino-alert`, `ino-metric-panel`, `ino-modal`) already consume them;
migrating those six call sites to the new `-neutral-N` names is each component's own future uplift
issue, not this token-layer change — same reason W0-1/W0-2 shipped as additive token layers rather
than a forced sweep. `--ino-elevation-neutral-4` and `--ino-elevation-neutral-5` are numerically
identical to `-1` and `-2` in every theme (asserted by `check-theme-parity.mjs`), so the two naming
schemes can never quietly diverge while both are in use.

Every number in §4/§4b that already existed is **unchanged** — `--ino-leading-*`/`--ino-tracking-*`
and the composite aliases are a *reference*, not a *redesign*. A component reading
`var(--ino-type-h2-line)` today gets exactly the same `1.25` it got yesterday; it now arrives via
`var(--ino-leading-3)` instead of a literal, which is the whole point (see §3).

## 2 — Elevation: 6 neutral + 3 brand + 2 inset

| Group | Tokens | Use |
|---|---|---|
| **Neutral** | `-neutral-1` … `-neutral-6` | The general-purpose depth ramp: hover on a flat row/chip (`-1`) → menu item/tooltip (`-2`) → dropdown/popover (`-3`) → resting card (`-4`, == `-1` old scale) → modal/sheet/popover (`-5`, == `-2` old scale) → full-screen drawer/command palette (`-6`) |
| **Brand** | `-brand-1` … `-brand-3` | An accent-tinted lift for surfaces that must read as *chosen*, not just raised — hovered primary CTA (`-1`), selected/active tier card (`-2`), spotlighted hero surface (`-3`) |
| **Inset** | `-inset-1`, `-inset-2` | The sunken counterpart — input field/code block (`-1`), pressed toggle track/active tab well (`-2`). Pairs with `--ino-color-surface-sunken` (§2) |

### Why brand elevation reads `var(--ino-color-accent)`, not a literal violet

```css
--ino-elevation-brand-1: 0 8px 24px -8px color-mix(in srgb, var(--ino-color-accent) 25%, transparent);
```

This file's header makes a standing promise: *"Swapping identity: change ONLY `--ino-color-accent` /
`--ino-gradient-accent` / `--ino-glow-accent` … Nothing else in this file should need to change for a
mark swap."* A literal `rgba(124, 92, 252, 0.25)` would violate that promise the moment someone
re-pointed the accent — the CTA would raise correctly but glow the wrong colour forever.
`color-mix(in srgb, var(--ino-color-accent) N%, transparent)` keeps the shadow parametric on the same
role `--ino-glow-accent` already reads, so an accent swap re-themes elevation for free, exactly like
focus-ring (§12) and gradient/glow already do. `check-theme-parity.mjs` asserts every `-brand-*` value
matches that `color-mix(… var(--ino-color-accent) …)` shape — a literal rgb triple fails the build.

Light mode uses a **lower** `color-mix` percentage than dark at every step (10/16/22% vs 25/35/45%),
the same "lower alpha — dark-mode glow opacity reads muddy on white" rule `--ino-glow-accent` already
follows one section up. Asserted directly: `light % < dark %` at every brand step.

### High-contrast: the recorded flatten decision

All 11 new tokens go to `none` in `[data-theme="high-contrast"]`, exactly like `-1`/`-2` already do.
This is the explicit decision the issue brief asked to be recorded, not a placeholder:

> A soft shadow/glow is a luminance-gradient effect that reduces edge clarity for exactly the
> low-vision users who opt into a high-contrast theme. Elevation and grouping are communicated by the
> (opaque) border only.

`check-theme-parity.mjs` pins every `-neutral-*`/`-brand-*`/`-inset-*` token to the literal string
`none` under `[data-theme="high-contrast"]`, so a future PR cannot reintroduce a shadow there without
the build failing.

### Mobile: web-only, same as the existing scale

`mobile/react-native/src/theme/tokens.ts` already documents that no shadow/elevation port exists for
`--ino-elevation-1`/`-2` today. The 11 new tokens follow the same precedent — no RN/Flutter work is
in scope for this issue. If a future chart/card component needs elevation on a native port, that is
its own issue, same as the original two-step scale always was.

## 3 — `--ino-leading-*` / `--ino-tracking-*`: the rhythm scale

Nine line-height values and seven letter-spacing values were already hand-typed across the thirteen
type roles in §4/§4b and re-typed again across the two §10 density blocks — every one of them a value
this file had already picked, just never named. This issue catalogues them into an ascending, numbered
scale (not semantic names like *tight*/*normal*/*loose*: nine and seven steps is too fine a set for
adjectives to stay meaningful, and a numbered rung is exactly what `--ino-space-N` already does for
the same reason) and points every role back at its rung instead of a bare literal.

| Leading | Value | Roles |
|---|---|---|
| `--ino-leading-1` | 1 | eyebrow |
| `--ino-leading-2` | 1.05 | display |
| `--ino-leading-3` | 1.25 | h2 |
| `--ino-leading-4` | 1.35 | label-lg; dense label |
| `--ino-leading-5` | 1.4 | h3; label; label-sm; dense hint; dense body |
| `--ino-leading-6` | 1.45 | caption; fluid label |
| `--ino-leading-7` | 1.5 | hint |
| `--ino-leading-8` | 1.55 | body; body-sm; dense caption |
| `--ino-leading-9` | 1.65 | body-lg; fluid body; fluid hint |

| Tracking | Value | Roles |
|---|---|---|
| `--ino-tracking-1` | -0.03em | display |
| `--ino-tracking-2` | -0.02em | h2 |
| `--ino-tracking-3` | -0.01em | h3; label-lg |
| `--ino-tracking-4` | 0em | label; hint |
| `--ino-tracking-5` | 0.005em | label-sm |
| `--ino-tracking-6` | 0.01em | caption |
| `--ino-tracking-7` | 0.14em | eyebrow |

`check-theme-parity.mjs` asserts both scales stay strictly ascending, and asserts every
`--ino-type-*-line` / `--ino-type-*-tracking` token in `:root` **and** both density blocks resolves
through `var(--ino-leading-N)` / `var(--ino-tracking-N)` rather than a bare number — a future edit
that types a fresh literal instead of picking a rung now fails the build.

## 4 — `--ino-type-<role>` composite aliases

Before this issue, every consumer composed a role's four parts by hand — this is the literal pattern
already written out in `form-label-tokens.html`:

```css
font: var(--ino-type-label-weight) var(--ino-type-label-size) / var(--ino-type-label-line) var(--ino-font-display);
letter-spacing: var(--ino-type-label-tracking);
```

That four-token composition now collapses to one token plus tracking:

```css
font: var(--ino-type-label);
letter-spacing: var(--ino-type-label-tracking);
```

`letter-spacing` is **not** part of the CSS `font` shorthand, so it stays a separate declaration —
this is a real CSS grammar limit, not an oversight. Every role gets a composite alias:
`display`, `h2`, `h3`, `body-lg`, `body`, `body-sm`, `metric`, `eyebrow`, `label-lg`, `label`,
`label-sm`, `hint`, `caption`. `--ino-type-metric` omits the `/line-height` segment — metric has no
`-line` token, and that segment is optional in the shorthand grammar. `eyebrow` and `metric` resolve
`var(--ino-font-mono)`; every other role resolves `var(--ino-font-display)`.

**Density-varying composites are re-declared, not inherited.** `body`, `label`, `hint` and `caption`
are the four roles §10 re-resolves per density; their composite aliases are re-declared inside both
`[data-density="dense"]` and `[data-density="fluid"]` blocks, the identical pattern §12's
CONSUMPTION ALIASES section already documents and `check-theme-parity.mjs` already enforces for the
control-size scale. `display`, `h2`, `h3`, `body-lg`, `body-sm`, `metric`, `eyebrow`, `label-lg` and
`label-sm` do not vary by density and are declared once, at `:root`, only.

## 5 — Accessibility

- **Zero hardcoded values.** No component may declare a raw `line-height` or `letter-spacing` decimal
  for text that already has a type role in §4/§4b — read the role's own token, or the composite
  alias. (The design-system adherence lint, INO-118, does not yet gate `line-height`/`letter-spacing`
  the way it gates `font-size` — this issue does not extend that lint; see §7.)
- **`color-mix()` browser support.** Brand elevation uses `color-mix(in srgb, …)`, supported in every
  browser this system already targets at parity with the rest of the CSS custom-property contract
  (Chromium 111+, Firefox 113+, Safari 16.4+). `--ino-elevation-brand-*` is decorative lift, never the
  sole signal for state — same rule §3's RAG dot/fill split already follows — so an unsupported
  browser rendering `transparent` instead of a tinted shadow degrades to "no glow," not "broken UI."
- **High-contrast flattening is itself an accessibility decision**, not a gap — see §2's note. A
  reduced-motion-style justification is recorded in `tokens.css` §2 directly, next to the tokens.
- **RTL.** All 13 elevation/box-shadow values use symmetric offsets (`0 Ypx …`) with no horizontal
  offset, so nothing here needs a logical-property variant.

## 6 — Verification

```sh
node scripts/check-theme-parity.mjs   # structural + contrast assertions, including this issue's elevation/leading/tracking/composite checks
node scripts/check-ds-adherence.mjs   # confirms no component/mobile file regressed against the expanded token contract
```

`check-theme-parity.mjs` fails the build if: any of the 11 elevation tokens is missing in any theme;
high-contrast doesn't flatten all 11 to `none`; `-neutral-4`/`-neutral-5` drift from `-1`/`-2`; a
`-brand-*` step stops being parametric on `var(--ino-color-accent)`, stops increasing step-over-step,
or light's mix % is not lower than dark's; an `-inset-*` token isn't a real `inset` shadow; the
leading/tracking scales stop being strictly ascending; any type role's `-line`/`-tracking` reverts to
a bare literal; or a composite `--ino-type-<role>` alias is missing or stops referencing its role's
own weight/size/line/family tokens (including the density re-declarations for `body`/`label`/
`hint`/`caption`).

`check-ds-adherence.mjs` needed one fix alongside this issue: its `stale-var-fallback` rule compared a
Capacitor `var(--ino-type-body-line, 1.65)` fallback against `tokens.css`'s literal declared values,
which stopped matching the moment `--ino-type-body-line` itself became `var(--ino-leading-N)` instead
of a bare decimal. The lint now resolves a token's own value through one level of indirection
(`resolveDeclared()`) before comparing, so a fallback stays valid across an aliasing refactor like
this one — not just across a literal-value change.
