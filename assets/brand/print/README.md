# Print-ready vector masters (INO-122)

Vector PDF masters of the Border Stitch **Master C** production mark (doc 22),
for vendors/printers who cannot place SVG. Verified vector: zero raster image
XObjects in every PDF.

| File | Use |
|---|---|
| `inovixux-mark-on-light.pdf` / `-on-dark.pdf` | Full-color mark (indigo `#4F46E5` + violet `#7C5CFC` territories, themed thread) |
| `inovixux-lockup-light.pdf` / `-dark.pdf` | Horizontal lockup (mark + wordmark) |
| `inovixux-mark-mono-black.pdf` / `-white.pdf` | One-color jobs (engraving, foil, letterhead). Stitches are true knockouts — substrate shows through |
| `inovixux-mark-mono-*.print.svg` | Mask-free SVG sources for the mono PDFs (the canonical `assets/brand/logo` mono SVGs use an SVG `<mask>`, which rasterizes on PDF export; these rebuild the identical knockout as pure paths) |
| `INOVIXUX-Brand-Guidelines.pdf` | The distributable guidelines document (source: `docs/brand/07-collateral/brand-guidelines.html`) |

Color conversion for press: see `docs/brand/07-collateral/print-color-spec.md`
(CMYK builds + nearest Pantone, with the unproofed-swatch caveat). PDFs are
authored in RGB; prepress converts per that spec.

Regeneration: the PDFs are printed from the SVGs via headless Chrome with a
zero-margin `@page` sized to the artwork (100 mm wide). Do not edit PDFs
directly.
