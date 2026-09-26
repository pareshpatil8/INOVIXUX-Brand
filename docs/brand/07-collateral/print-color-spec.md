# INOVIXUX print color specification — CMYK & Pantone (INO-122)

**Scope:** print reproduction of the Border Stitch Master C mark and brand
accents (doc 22). Screen hex values in `tokens.css` remain the single source of
truth for digital; this doc exists because screen hex does not survive a press
run.

**Status of the Pantone matches:** nearest-library picks made numerically
(coated library), **not yet proofed against physical swatches**. Before the
first real press run, a human must confirm each spot pick against a physical
Pantone coated fan under D50 light. Until then treat the CMYK builds as the
safe default and the Pantone column as the starting recommendation.

## 1. Brand accent colors

| Role | Hex (digital SoT) | RGB | CMYK build (coated) | Pantone (nearest, unproofed) |
|---|---|---|---|---|
| Deep Tech Violet (territory, right) | `#7C5CFC` | 124 / 92 / 252 | **51 / 63 / 0 / 1** | 2665 C |
| Electric Indigo (territory, left) | `#4F46E5` | 79 / 70 / 229 | **66 / 69 / 0 / 10** | 2726 C |
| Stitch thread — on dark | `#D8CEFF` | 216 / 206 / 255 | **15 / 19 / 0 / 0** | 2635 C |
| Stitch thread — on light | `#2A1F6E` | 42 / 31 / 110 | **62 / 72 / 0 / 57** | 273 C |

Both accents are outside the CMYK gamut's most saturated blue-violet corner;
the CMYK builds above are the closest process approximation and will read
slightly duller than screen. **For brand-critical print (guidelines cover,
business cards, packaging), specify the Pantone spot; for everyday process
print (flyers, one-off vendor jobs), the CMYK builds are acceptable.**

## 2. Neutrals

| Role | Hex | CMYK |
|---|---|---|
| Ink black (dark surfaces) | `#0A0A0A` | 0 / 0 / 0 / 96 — for large solid areas use rich black **60 / 40 / 40 / 100** |
| Charcoal (cards on dark) | `#14141A` | 22 / 22 / 0 / 90 |
| Paper white | `#F5F5F4` | print as unprinted stock (0/0/0/0); do not lay down a 4% tint |
| Fog (light-mode surface) | `#EFEFED` | 0 / 0 / 1 / 6 |

## 3. Reproduction rules (from doc 22, restated for printers)

- **One-color jobs:** use the monochrome masters
  (`assets/brand/print/inovixux-mark-mono-black.pdf` / `-white.pdf`). The
  stitches are knocked out (paper/substrate shows through) — never print the
  stitches as a second tint in a one-color job.
- **Two-color spot jobs:** Pantone 2726 C + 2665 C territories; thread knocks
  out to substrate, or prints 273 C if a third spot is affordable on light
  stock.
- **Small sizes:** at a rendered mark width ≤ 7 mm use the heavy-thread cut
  (`stroke-width 3.4` geometry — the favicon/app-glyph masters), matching the
  ≤ 20 px digital rule.
- **Minimum print size:** mark 5 mm wide; horizontal lockup 22 mm wide.
- Never rebuild the mark from this spec — always place the supplied vectors in
  `assets/brand/print/`.

## 4. File formats

Vector masters for print are PDF (from the canonical SVGs, vector-preserving).
PDFs are authored in RGB; a prepress operator should convert to the CMYK builds
above or replace fills with the specified spots. EPS is intentionally not
supplied — request it from the design owner only if a vendor genuinely cannot
place PDF.
