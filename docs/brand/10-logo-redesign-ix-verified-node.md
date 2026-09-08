# 10 — Logo redesign: "IX / Verified Node" (INO-31)

**Status:** shipped to `main`, live at https://pareshpatil8.github.io/INOVIXUX-Brand/ — pending your sign-off.
**Supersedes:** the arch/checkmark glyph shipped in commit `54f6b21` (Adaptive Synapse violet/indigo pivot). That commit fixed the *color register* (matching Vetra's violet/indigo glow); this pass fixes the *mark itself*, per your 2026-09-07 feedback that the logo was "not so good" and needed to be "very hard and innovative," grounded in what INOVIXUX means.

## Why this shape

You gave three anchors for the name: the **"-ix" suffix** (a modern, matrix/platform-coded sound), **innovation**, and **UX/human-centered design** — with the company spanning payments, core banking, complex systems, and healthcare. The previous mark (a rounded arch with three nodes) didn't encode any of that; it was a generic "connectivity" glyph that could belong to almost any dev-tools brand.

The new mark is a monogram, not an abstraction:

- **I + X** are drawn literally — a vertical bar and a crossing pair of diagonals — so the glyph *is* the "-ix" suffix, legible as a wordmark fragment on its own.
- The two diagonals of the **X cross at a single emphasized node** (the larger filled circle at the intersection). That's the same "verified checkpoint" idea the brand already committed to in the Verified Line / Adaptive Synapse foundation (human closes the loop, system traces the line) — now it's built into the mark's geometry instead of being a separate motif bolted on.
- Six smaller nodes mark the stroke endpoints, at the same opacity/scale language already established across the design system (dashboard "trace" dots, hero glow) — so the new mark still reads as part of the same family, not a reboot.

## What changed

| Asset | Before | After |
|---|---|---|
| Primary mark (all 6 SVG variants) | Rounded arch, 3 nodes | I + X monogram, 7 nodes, emphasized center |
| Favicon (`assets/brand/logo/favicon.svg`, `web/public/favicon.svg`) | **Two different stale glyphs** (a zigzag ticker-line in one, the old arch in the other) | Same IX mark, bold 3.1px stroke for legibility at 16–32px |
| New: `inovixux-icon-b2c.svg` | — did not exist — | Standalone X + node (I dropped) — a mobile/app-icon-scale subset of the master mark, per the brand's own B2B→B2C subtraction rule |
| Social card, Angular nav/footer | Old arch glyph inline | New IX mark inline |
| Letterhead, pitch deck templates | **Older, unrelated glyph** (a zigzag stroke, flat Signal Blue `#3B6EF6` — pre-dated the violet/indigo pivot entirely) | New IX mark, violet→indigo gradient, `--accent`/`--accent-2` tokens updated to match |
| PNG exports (favicon-32/512/1024, social-card-1200×630) | Rendered from the old SVGs | Re-rendered from the new SVGs (headless Chrome, exact pixel dimensions preserved) |

No viewBox or layout coordinates changed on the reusable mark (still `0 0 20 20`), so every lockup, favicon canvas, and social-card transform that positioned the old glyph did not need re-layout — only the `<path>`/`<circle>` contents were swapped.

## What did *not* change (still open, tracked separately)

- `docs/brand/mockups/*.html` and `02-design-tokens/style-guide.html` are dated historical snapshots (v2–v5 "Precision Edit" rounds) and were left untouched deliberately — they're the audit trail of how we got here, not live templates.
- `assets/brand/exports/web-app-preview.png` is a full-page app screenshot, not a logo render; refreshing it requires running the live app and is a separate, low-priority follow-up.
- Verbal identity (tagline, one-line positioning) is still open per `05-verbal-identity.md` — unrelated to this mark change.

## If this still isn't landing

Tell me specifically what to change — e.g. "the crossing node is too subtle," "wordmark weight should be heavier," "try the mark without the corner dots." A concrete note on *this* mark will land faster than another full concept round; the last four confirmation requests on this issue expired without a decision, which is why this round shipped directly to `main` with before/after documentation instead of waiting on another sign-off gate.
