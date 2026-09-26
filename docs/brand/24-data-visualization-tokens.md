# 24 — Data-visualization tokens: design record & measured audit (INO-113 / INO-31.1)

Closes the doc-16 §5.1/§7.1 gap: before `tokens.css` §13 the token set had zero
data-viz coverage ("chart strokes" got one passing mention), so every dashboard
built on the KYB MVP's risk tables and risk matrices would have invented its own
chart colors.

**Source of truth:** `tokens.css` §13 (canonical + `web/src/tokens.css`, byte-identical).
**Mobile ports:** the 21 chart roles are first-class palette fields in
`mobile/react-native/src/theme/tokens.ts` and `mobile/flutter/lib/theme/tokens.dart`,
so `scripts/check-theme-parity.mjs` byte-checks them across all three themes on both
platforms, plus 135 §13-specific invariant checks (completeness, contrast floors,
ramp direction/monotonicity, midpoint neutrality, the shared-identity contract).

## Method — measured, not eyeballed

Every number below comes from the dataviz skill's `scripts/validate_palette.js`:

- **CVD separation** — Machado–Oliveira–Fernandes (2009) simulation at severity 1.0,
  ΔE as Euclidean distance in OKLab ×100, reported as min(protanopia, deuteranopia);
  tritanopia reported alongside. Target ≥ 8.0; 6.0–8.0 legal only with secondary
  encoding; < 6.0 hard fail.
- **Normal-vision floor** — worst unsimulated pair ≥ 15.0 (hard gate).
- **Contrast** — WCAG 2.x relative-luminance ratio vs the theme's chart surface
  (`dark #0A0A0A`, `light #FAFAFA`, `high-contrast #000000`).
- **Ordinal ramps** — monotone OKLCH lightness, adjacent ΔL ≥ 0.06, near-surface
  step ≥ 2:1, single hue (spread ≤ 40°).

Re-run: `node <dataviz-skill>/scripts/validate_palette.js "<hex,…>" --mode dark|light
--surface "#…" [--ordinal] [--pairs all]`, and `node scripts/check-theme-parity.mjs`
for the repo-side invariants.

## Categorical — series identity (6 slots, fixed order)

Hues sit outside the families the violet/indigo accent and the RAG+info severity
set already claim, so a series can never impersonate an accent or a status.
**Dark and light share the same hexes** — each slot's OKLCH L (0.49–0.66) clears
3:1 on both surfaces at once, so series identity survives a theme toggle without
repainting mid-session.

| Slot | Hue | Dark/Light hex | vs `#0A0A0A` | vs `#FAFAFA` | HC hex | vs `#000000` |
|---|---|---|---|---|---|---|
| cat-1 | azure | `#4683C5` | 5.01:1 | 3.79:1 | `#5896D9` | 6.39:1 |
| cat-2 | rose | `#C95A8B` | 5.01:1 | 3.78:1 | `#D76797` | 5.92:1 |
| cat-3 | lime | `#829417` | 5.84:1 | 3.25:1 | `#8B9D26` | 6.55:1 |
| cat-4 | orchid | `#AF62C1` | 5.03:1 | 3.77:1 | `#BC6ECE` | 5.90:1 |
| cat-5 | orange | `#C56B23` | 5.19:1 | 3.66:1 | `#D37732` | 6.09:1 |
| cat-6 | teal | `#1E9997` | 5.71:1 | 3.32:1 | `#15A7A5` | 6.70:1 |

Measured verdicts (all PASS):

| Set | Check | Worst pair | ΔE |
|---|---|---|---|
| dark & light (shared hexes) | CVD adjacent | rose↔azure | **9.4** (protan) · tritan 9.1 |
| dark & light | normal-vision adjacent | rose↔azure | **21.3** |
| high-contrast | CVD adjacent | rose↔azure | **10.9** (protan) · tritan 9.2 |
| high-contrast | normal-vision adjacent | rose↔azure | **21.2** |
| slots 1–3, `--pairs all` | CVD all-pairs | rose↔azure | **9.4** · tritan 11.0 |

Usage rules (from the dataviz skill, binding):
- Assign in fixed slot order 1→N, never cycled, never re-ordered by a filter —
  color follows the entity, not its rank. A 7th series folds into "Other" or facets.
- For scatter/bubble/choropleth/small-multiples (any two marks can touch) the cap
  is **three** series — slots 1–3 are the only triple that validates all-pairs.
- When a series *means* good/bad it wears the §3 risk tokens, not `-cat-N` —
  never both languages in one chart.

## Sequential — magnitude (8 steps, violet)

One hue (the accent violet family — magnitude reads as brand, and no categorical
slot is violet, so a ramp step can never be mistaken for a series). Re-stepped per
theme so **step 8 (highest risk) always anchors as the strong-contrast end of that
surface**; step 1 may recede by design but never below the 2:1 ordinal floor.

| Theme | Direction on surface | Step 1 | Step 8 | Ordinal verdict |
|---|---|---|---|---|
| dark | dark→light | `#4F417E` 2.25:1 | `#E1DDF9` 15.0:1 | PASS (hue spread 1°) |
| light | light→dark | `#B4A8EB` 2.07:1 | `#392866` 12.05:1 | PASS (hue spread 0°) |
| high-contrast | dark→light | `#5A4A90` 2.82:1 | `#EEECFB` 18.03:1 | PASS (hue spread 1°) |

The light ramp was re-stepped in this audit: the draft's step 1 (`#E4E1F9`)
measured **1.22:1** against `#FAFAFA` — under the validator's 2:1 near-surface
floor — so the whole ramp was regenerated (OKLCH L 0.766 → 0.332, exact 0.062
steps, hue 292) rather than patching one step and breaking the ΔL gaps.

## Diverging — polarity / risk delta (3+1+3)

Cool azure arm = decrease/improvement, warm red arm = increase, neutral gray
midpoint = no change. The midpoint deliberately recedes (sub-3:1) and never
carries a value alone.

**Why not green↔red:** measured, the intuitive pairing fails. Under the MOF 2009
deuteranopia simulation the existing RAG poles (`#3A9B6B` ↔ `#C24C43`) collapse to
**ΔE 5.8** — below even the 6.0 hard floor — while azure↔red measures ~20. A
risk-delta chart whose two directions are indistinguishable to ~5% of male readers
is not an option for a KYB product. The warm arm still speaks the danger hue
language but reuses none of its hexes, so a delta arm never impersonates a RAG chip.

| Theme | neg-3 … neg-1 | mid | pos-1 … pos-3 | Pole contrast (neg/pos) |
|---|---|---|---|---|
| dark | `#589CE6` `#467DB9` `#3A6089` | `#383836` | `#894840` `#BB584D` `#E66F62` | 6.89:1 / 6.42:1 |
| light | `#2F74BB` `#6193CB` `#8EB1DA` | `#EBEBE9` | `#D79E95` `#C97469` `#B9473D` | 4.64:1 / 4.99:1 |
| high-contrast | `#ADD1FB` `#64A2E7` `#4374AA` | `#535350` | `#AD5349` `#E8796C` `#F69C8F` | 13.29:1 / 10.07:1 |

Measured pole-pair separation (all PASS):

| Theme | Poles | CVD | Tritan | Normal |
|---|---|---|---|---|
| dark | `#589CE6`↔`#E66F62` | 19.3 (protan) | 31.0 | 26.0 |
| light | `#2F74BB`↔`#B9473D` | 19.4 (protan) | 28.7 | 26.0 |
| high-contrast | `#ADD1FB`↔`#F69C8F` | 14.2 (deutan) | 21.5 | 18.2 |

Each arm also passes the ordinal check on its own (monotone outward, ΔL ≥ 0.06,
single hue, inner step ≥ 2:1 — the midpoint is excluded, it is not a ramp step).

**High-contrast pole fix (this audit):** the draft's pos-3 (`#F7BEB5`) sat at the
same OKLCH lightness as neg-3 (L 0.850 vs 0.849), leaving the two poles only
**ΔE 12.8** apart to full-color vision — under the 15.0 hard floor. Deepened to
`#F69C8F` (L 0.78, same hue as its arm): normal ΔE 18.2, CVD 14.2, still 10.07:1
on black, arm still monotone.

## What the parity script now pins (regression guard)

`scripts/check-theme-parity.mjs` §INO-113 asserts, per theme: all 21 roles
declared; categorical ≥ 3:1 vs surface; sequential contrast-vs-surface strictly
increasing 1→8 with step 1 ≥ 2:1 and step 8 ≥ 10:1; diverging arms strictly
strengthening outward with poles ≥ 3:1; midpoint near-neutral (channel spread
≤ 10). Cross-theme: light categorical hex-identical to dark (the shared-identity
contract); high-contrast categorical and both non-dark sequential ramps are their
own resteps, never copies. Cross-platform: RN and Flutter palettes carry the same
21 roles byte-identically in all three themes (the standard role-completeness loop).

CVD separation itself is **not** re-derived by the script (it would mean embedding
the MOF simulation); any hue change to §13 must re-run the dataviz validator and
update the tables above.
