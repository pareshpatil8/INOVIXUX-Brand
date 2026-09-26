# 22 — Production logo: Border Stitch, Master C (INO-82, ratified 2026-09-24)

## Decision

After five rejected rounds plus a finalization round, the board approved the
**Border Stitch** direction and, in the Round 5 verdict + tie-break
(2026-09-24), selected **Master C — narrow border, heavy thread** as the single
production mark. Master A was also approved but lost the tie-break; Master B
was rejected and is retired.

Canonical geometry (40×40 viewBox):

```svg
<rect x="5" y="8" width="13" height="24" rx="4" fill="#4F46E5"/>
<rect x="22" y="8" width="13" height="24" rx="4" fill="#7C5CFC"/>
<path d="M15,11 L25,15 M15,18 L25,22 M15,25 L25,29"
      stroke="{thread}" stroke-width="3" stroke-linecap="round"/>
```

- Thread on dark: `#D8CEFF` · thread on light: `#2A1F6E`
- **Heavy-thread cut** (`stroke-width="3.4"`): mandatory at ≤20px render size
  (favicon, nav, app glyph)
- Monochrome versions knock the stitches out of the territories with a mask
  (see `inovixux-mark-mono-*.svg`)

Story: two territories (complex systems — payments/banking/healthcare — and
the experience layer) sewn together at a narrow border. The `-ix`/UX reading
lives in the seam, not in letterforms.

## Where it landed (the `--ino-logo-mark` swap, executed)

| Surface | File(s) |
| --- | --- |
| Master SVGs | `assets/brand/logo/inovixux-mark-on-{dark,light}.svg`, `inovixux-mark-mono-{white,black}.svg` |
| Lockups | `assets/brand/logo/inovixux-lockup-{dark,light}.svg` |
| Favicon | `assets/brand/logo/favicon.svg`, `web/public/favicon.svg`, `assets/brand/exports/favicon-{32,512,1024}.png` |
| B2C glyph | `assets/brand/logo/inovixux-icon-b2c.svg` |
| Social/OG card | `assets/brand/logo/inovixux-social-card.svg`, `assets/brand/exports/social-card-1200x630.png` |
| Web app nav + footer | `web/src/app/app.html` (inline, themed via `--ino-logo-thread` in `web/src/styles/page-sections.scss`) |
| Letterhead | `docs/brand/07-collateral/letterhead.html` + regenerated `.png` |
| Pitch deck | `docs/brand/07-collateral/pitch-deck-template.html` + regenerated `.png` |

`--ino-logo-thread` lives in `page-sections.scss`, not `tokens.css`
(frozen post-Wave 0). It defaults to the on-dark thread and flips under
`[data-theme="light"]`.

Known lag: `assets/brand/exports/web-app-preview.png` is an app screenshot
that still shows the old header mark; it refreshes on the next app capture.

## History

- Rounds 1–4 concepts: docs 10, 14, 19, 20 (all superseded)
- Finalization round and the three master candidates: doc 21 +
  `docs/brand/mockups/logo-border-stitch-final.html`
- Verdicts recorded on INO-82 (Round 5 card + tie-break interaction)
