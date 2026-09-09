# 14 — Logo concepts, round 2 (INO-82)

**Status:** four concepts sketched, awaiting per-concept board feedback. Nothing here is wired
into any live asset — the shipped IX monogram (`f1b3358`, `10-logo-redesign-ix-verified-node.md`)
remains the mark in production until a decision is made.

## Why this exists

INO-82 was split out of INO-31 on 2026-09-08 specifically to keep the logo open as its own
decision, separate from the design-system work (tokens, dark/light, components, mobile patterns)
that's proceeding independently and is not blocked by this.

The board's instruction for this round: *"try very hard and innovative for the logo"*, grounded
in what INOVIXUX actually means — **payments, core banking, complex systems, healthcare**
(what the company does), **innovation** and the **-ix suffix** (modern/matrix-coded), and
**UX** (the company's own product — making complicated software beautiful and easy to use) —
benchmarked against **Apple, SpaceX, and 21st.dev's component bar**, and explicitly *not*
palette or geometry variations of one idea, since that's why six prior rounds were rejected
(v1–v4 concepts, then the shipped IX mark, which hasn't had explicit sign-off either).

**See it rendered (hosted, live):**
[pareshpatil8.github.io/INOVIXUX-Brand/brand/mockups/logo-concepts-round2.html](https://pareshpatil8.github.io/INOVIXUX-Brand/brand/mockups/logo-concepts-round2.html)
— this is a real served page, not a repo link (GitHub shows `.html` files as source, not
rendered, which is why the previous round's links didn't visualize for the board).
Screenshot fallback: [`mockups/logo-concepts-round2.png`](mockups/logo-concepts-round2.png).

In-repo source, for reference: [`mockups/logo-concepts-round2.html`](mockups/logo-concepts-round2.html).

## The four concepts

Each uses a genuinely different construction technique, not just a different arrangement of
lines-and-nodes (which is what every prior round, including the shipped mark, was built from):

| # | Name | Technique | Primary anchor | Risk |
|---|---|---|---|---|
| 1 | **Ledger Fold** | solid two-tone color-blocked shape, dog-eared corner | payments / core banking (a reconciled record) | dog-ear detail is subtle below ~24px; may need a bolder notch for favicon scale |
| 2 | **Signal Vitals** | single open stroke, irregular waveform → circuit trace → node | healthcare + complex systems fused into one line | asymmetric — harder to center in square lockups (nav bar, favicon) than a symmetric mark |
| 3 | **Axis Mark** | two opposing corner brackets + one origin point, mostly negative space | -ix as coordinate axis, UX/precision — closest to the SpaceX reticle reference | most minimal of the four; likely the hardest to recognize at 16px favicon scale without testing |
| 4 | **Convergence** | two overlapping solid rounded tiles, diagonal offset | complex systems integrating into one product | cleanest app-icon silhouette of the four; least literal tie to "-ix" specifically |

None of the four use an X-crossing, checkmark, or letterform — that specific grammar was used by
the shipped mark and by every rejected v1–v4 concept, so it's the one pattern this round
deliberately avoids across all four, per the board's "not too similar to each other" feedback.

## What's being asked

Per concept, not as a single up-or-down vote on the round:

1. **Kill** — doesn't work, don't spend more time on it.
2. **Keep exploring** — right direction, wrong execution (say what to change: color split, stroke
   weight, which detail reads wrong at small size).
3. **Finalist** — push to full production (icon-on-dark/light, mono variants, favicon, lockup,
   letterhead, pitch deck, social card, and the `--ino-logo-mark` swap point already established
   in the INO-31 asset library at `/assets/brand/logo/`).

If more than one concept gets marked finalist, next step is a head-to-head refinement round on
just those, not a fifth from-scratch round.

## What this round intentionally did not do

- **Did not touch the shipped IX mark or any live asset** (`/assets/brand/logo/`, favicons,
  letterhead, pitch deck, Angular components) — those stay on the IX monogram until this
  decision lands, so INO-31's design-system work keeps shipping unblocked.
- **Did not edit `00-INDEX.md`** or the INO-31 completeness checklist — INO-31 is being worked
  concurrently in the same workspace; this round is additive-only (two new mockup files, this
  doc) to avoid merge conflicts. Cross-link from the index can happen once a concept is chosen.
- **Did not produce PNG/print exports** for any concept — that's real production work, held
  until a concept is selected as finalist, per the same "don't gold-plate a rejected direction"
  lesson from the v1–v4 rounds.
