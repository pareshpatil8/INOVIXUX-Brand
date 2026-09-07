# INO-31 — Phase 3: Collateral Templates (Workstream E)

**Status:** Done — spec/template layer only. Nothing here has been sent to a print vendor or
loaded into a slide tool; that's the explicit boundary (see "What's intentionally not here").

This is the third workstream completed with zero open dependencies (after B — Angular components,
and D — verbal identity), per the sequencing note in
`../04-activity-plan-and-visual-samples.md`. It turns the **Verified Line** identity
(`../02-design-tokens/tokens.css`) into the three collateral pieces named in the original brief:
letterhead, business card, and a pitch deck template.

| Deliverable | File | Format |
|---|---|---|
| Letterhead | [`letterhead.html`](letterhead.html) | Print-CSS HTML, A4 + US Letter, browser "Print to PDF" |
| Business card | [`business-card-spec.md`](business-card-spec.md) | Written production spec (design intent, not a print file) |
| Pitch deck template | [`pitch-deck-template.html`](pitch-deck-template.html) | 16:9 slide-master HTML, browser "Print to PDF" for a deck export |

## Why letterhead is light and everything else in this system is dark

The approved Verified Line identity (`tokens.css`) is dark-surface-only by design — see that
folder's README, §"Light mode ... not used yet." A letterhead is the one surface in this whole
system that's physically printed on paper stock, and full-bleed black ink on a page is expensive
per-unit, unusual for formal bank/regulator correspondence, and was never what any concept
proposed here — concept A's own spec (`../01-brand-architecture-concepts.md`) calls for "**minimal**
letterhead with a single traced rule," not a black page. So `letterhead.html` uses a small,
letterhead-only light treatment: off-white paper, near-black ink, and exactly one Signal Blue
rule (the "traced line," same accent token, same meaning, different substrate). This is a
one-file exception, not a new token block — it does not touch `tokens.css`, and it is **not** the
deferred `[data-theme="light"]` B2C surface tracked in the activity plan (that's a UI theme
decision for the product; this is a print-substrate decision for a letter).

The pitch deck stays on the dark system as-is — a deck is presented on a screen/projector, not
printed at scale, so the existing dark tokens apply directly with no exception needed.

## What's intentionally not here

- **No physical print production.** Business card stock, foil/emboss finishing, and paper weight
  selection for the letterhead are vendor decisions once you pick a printer — `business-card-spec.md`
  gives that vendor everything they need (dimensions, bleed, Pantone-equivalent color, finish), but
  ordering and paying for print runs is out of scope for this agent — this is a spec, not a
  purchase order.
- **No slide-tool file** (`.pptx`/Keynote/Figma Slides). `pitch-deck-template.html` is the
  structural master (typography, spacing, layout logic) a human can rebuild in whatever tool the
  actual pitch gets delivered in, or export directly to PDF from the browser for as-is use.
- **No final logo SVG in either file.** Both templates use the same CSS-drawn wordmark + traced-line
  mark already used in `../mockups/foundation-v5-verified-line.html`, pending workstream A's real
  vector artwork (blocked on Figma/a designer, tracked separately).
- **No copy sign-off.** Placeholder body text in the letterhead and illustrative metrics in the
  deck are flagged inline (`<!-- ILLUSTRATIVE -->`) the same way the website mockup flags them —
  still waiting on your fact-check per the open question in the activity plan.

## Traceability

Both HTML files consume `--ino-*` custom properties for every color, spacing, and type value —
either via `tokens.css` directly (deck) or a documented letterhead-only light substitution
(letterhead) — matching this repo's design-token discipline.
