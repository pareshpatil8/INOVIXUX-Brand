# INOVIXUX Design System — Agent Skill

Read this file before touching colors, type, spacing, motion, or an `ino-*` component. It is the
short path: everything below is enough to consume the system correctly without reading the
2,000+ lines of prose under `docs/brand/`. If you need the "why" behind a rule, the doc named
next to it has the full rationale.

## What this system is

- **Concept:** "Verified Line" — Adaptive Synapse accent register. Regulated-domain product
  (payments/banking/KYB), so every visible decision is contrast-audited, not just chosen on
  taste.
- **Canonical source of truth:** `docs/brand/02-design-tokens/tokens.css` (byte-identical to
  `web/src/tokens.css`, mirrored into the React Native and Flutter mobile ports). Every value
  below is read FROM that file, not restated by hand — if this file and `tokens.css` ever
  disagree, `tokens.css` wins and this file is stale; re-run
  `node scripts/check-token-split-parity.mjs` to catch drift.
- **Split entry point for humans/agents:** `docs/brand/02-design-tokens/styles.css` `@import`s
  `tokens/{colors,typography,spacing,elevation,borders,motion,density}.css` — read the one file
  for the category you're touching instead of the whole contract.
- **Component inventory:** `docs/brand/design-system.manifest.json` — generated, machine-readable
  (name → source path → variants → viewport). Regenerate with
  `node scripts/generate-design-system-manifest.mjs` after adding or changing a component; never
  hand-edit it.

## Colors — bind to roles, never primitives or hex

Components consume **semantic roles** (`--ino-color-surface`, `--ino-color-on-surface`,
`--ino-color-accent`, `--ino-color-danger`, …), never raw primitives
(`--ino-primitive-violet-500`) and never a literal hex value. Three themes exist, opt-in via
`[data-theme]` on `<html>` (dark is the default, no attribute needed):

| Theme | Attribute | Target |
|---|---|---|
| Dark (default) | none | AA |
| Light | `[data-theme="light"]` | AA, independently audited (not assumed from dark) |
| High-contrast | `[data-theme="high-contrast"]` | AAA |

Binding to roles instead of themes is what makes a component repaint correctly in all three for
free — never branch on `data-theme` in component code. Full ratio tables:
`02-design-tokens/README.md` §Contrast.

## Typography

- Display font: `--ino-font-display` = Geist, with `"Noto Sans Devanagari"` second in the
  fallback chain (Hindi is a floor requirement, not a stretch goal — INO-119) — never drop or
  reorder this chain.
- Mono font: `--ino-font-mono` = Geist Mono, for eyebrows/metrics/uppercase labels only.
- A Hindi (or any `lang="hi"`-scoped) subtree gets safe vertical rhythm automatically via
  `:lang(hi)` overrides on `--ino-type-{display,h2,h3}-line` — no extra work needed if `lang` is
  set correctly.
- Always consume a role token (`--ino-type-body-size`, `--ino-type-label-*`), never a bare `px`
  or line-height literal.

## Spacing, radius, motion

- Space is a t-shirt scale, `--ino-space-1`…`-11` (4px…96px) — never a bare pixel value in new
  component CSS.
- Radius: `--ino-radius-{sm,md,lg,xl,pill}`.
- Motion durations/easings (`--ino-motion-duration-*`, `--ino-motion-easing-*`) map 1:1 onto
  Angular's `animate()` timing strings. Any animation MUST respect `prefers-reduced-motion` —
  zeroing durations at the token level is deliberately not how this is done (it would also kill
  non-motion state transitions); gate the animation trigger itself instead. See
  `06-angular-components/motion-contract.md`.

## Density

Two orthogonal density modes via `[data-density]` on a container (never global): `"dense"`
(G2B/B2B risk dashboards, 32px row floor) and `"fluid"` (B2C, 44px comfortable target). Density
is independent of theme — any density × theme combination is valid.

## Do / do not

- **Do** bind to semantic role tokens. **Do not** reference `--ino-primitive-*` or a hex literal
  from component code.
- **Do** keep the mandatory system-font fallback chain (`system-ui, Arial, Helvetica`, plus
  `"Noto Sans Devanagari"`) on every `--ino-font-*` token — locked-down bank/regulator machines
  must not silently break layout.
- **Do** meet WCAG 2.2 AA as the floor (24×24px §2.5.8 pointer-target minimum; dense KYB tables
  intentionally exceed it at 32px rows).
- **Do not** invent a new color, spacing, or type value inline "just this once" — extend the
  token file and get it contrast-audited first (`scripts/check-theme-parity.mjs` will fail the
  build if it introduces a broken alias or drifts mobile ports).
- **Do not** branch component logic on `[data-theme]` directly.

## INO-14 disclaimer rule (regulatory, non-negotiable)

Any collateral, copy, or component instance that could be read as a commercial claim, live
pricing, or "available now" must carry the INO-14 non-commercial disclaimer — hard-coded, not a
removable placeholder. Reference implementation:
`07-collateral/pitch-deck-template.html`'s disclaimer slide. Copy that pattern; do not soften it.
Full rule: `09-design-system-standards.md` §3.

## Verifying a change

Before shipping a token or theme change, run both gates from repo root:

```
node scripts/check-theme-parity.mjs        # canonical tokens.css <-> mobile ports (RN + Flutter) + contrast audit
node scripts/check-token-split-parity.mjs  # tokens/*.css split <-> canonical tokens.css
```

Both must print `PASS`. Any token/theme change that affects existing components must be flagged
to the component-track owners before merging — token drift is invisible in a component's own diff
and is exactly the class of bug these gates exist to catch.
