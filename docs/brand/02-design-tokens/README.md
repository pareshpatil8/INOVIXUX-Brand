# INO-31 — Phase 2: Design Token System + Angular Theme Contract

**Status:** Delivered, built on the approved foundation (plan revision 7, accepted 2026-09-06,
interaction `7e2a64f6`). Concept: **Verified Line** (Signal Blue `#3B6EF6`, Geist / Geist Mono).

This phase turns the v5 foundation build (`docs/brand/mockups/foundation-v5-verified-line.html`)
into a versioned, framework-agnostic token contract that an Angular app consumes directly —
the "tokens as the Angular contract" principle from `00-understanding-and-plan.md` §4.3.

Per the HITL guardrail, this is the first pass authorized to write an actual CSS token file —
the prior four passes (v1–v5) were structural pitches and one static HTML mockup, deliberately
with no compiled tokens. That gate cleared when you accepted the v5 foundation.

---

## What's in this folder

| File | Purpose |
|---|---|
| `tokens.css` | The token contract itself — drop-in `:root` custom properties. This is the file Angular imports. |
| `style-guide.html` | Rendered preview of every token (color roles, RAG chips, type scale, spacing, radius, elevation) — open it directly, nothing to build. |
| `angular-theme-contract.md` | How an Angular app consumes `tokens.css`, plus component-level contracts (selector/inputs/outputs, not full implementations) for the six components on the v5 checklist. |
| `README.md` | This file — rationale, decisions, contrast audit. |

---

## WCAG 2.2 contrast audit (measured, not assumed)

The brief calls out WCAG 2.2 explicitly, and Concept 2's rejection earlier in this thread was
partly about unaudited glow effects, so every color pair below was computed (relative-luminance
contrast ratio, not eyeballed) before being allowed into the token file:

| Pair | Ratio | Verdict |
|---|---|---|
| `on-surface` (#F5F5F4) on `surface` (#0A0A0A) | 18.15:1 | Pass — body text |
| `on-surface-muted` (#8C8C8E) on `surface` | 5.90:1 | Pass — body text |
| `on-surface-subtle` (#5A5A5C) on `surface` | 2.88:1 | **Fails AA at every size** |
| `accent` (#3B6EF6) on `surface`, as text | 4.48:1 | Pass large-text/UI only, not small body text |
| `danger` (#C24C43) on `surface`, as text | 4.16:1 | Pass large-text/UI only, not small body text |
| `warning` (#B98A3C) on `surface`, as text | 6.38:1 | Pass — body text |
| `on-success` (black) on `success` fill | 6.08:1 | Pass — chip text |
| `on-warning` (black) on `warning` fill | 6.76:1 | Pass — chip text |
| `on-danger` (white) on `danger` fill | 4.76:1 | Pass — chip text |
| `on-accent` (black) on `accent` fill | 4.75:1 | Pass — chip/button text |

**Two concrete rules this produces, both encoded in `tokens.css` comments so they can't be
silently violated later:**

1. **`on-surface-subtle` (#5A5A5C) is not a text color.** It fails AA even as large text. It's
   kept in the token set for decorative/disabled use only (a disabled border, a hairline) — any
   component using it for a label or value is a bug, not a style choice.
2. **`accent` and `danger` are not small-body-text colors on the dark surface.** They're safe as
   icons, dots, borders, and large headings (≥24px / ≥19px bold), which is exactly how the v5
   foundation already uses them (status dots, chart strokes, the eyebrow dot). The RAG badges in
   dense risk tables use the **filled-chip** pair instead (`risk-*-fill` / `risk-*-on-fill`),
   which is what's actually verified for real risk-flag text like "HIGH RISK — 3 flags."

This matters specifically because the brief's own "RAG semantic alert matrices" are the
highest-stakes text in the product (a human reviewer deciding whether to act on a flag) — that's
exactly where an unaudited color pair would be a real, not cosmetic, defect.

---

## Why Material Design 3's token *model* (not M3's colors)

The brief asks for a Google-Material-or-Claude-design integration read. Neither is a visual
template here — Concept 3's calm/high-whitespace register borrowed *Claude's tone*, and this
phase borrows *M3's architecture*, not M3's purple/teal default palette:

- **Roles, not raw values** — components bind to `--ino-color-on-surface`, never `#F5F5F4`
  directly. Section 1 (primitives) vs. section 2 (roles) in `tokens.css` exists so a future
  re-theme (e.g. swapping to Aperture Mark or Ledger Seal, or a light mode) touches only the
  primitives block, never a component file.
- **Elevation via defined shadow tokens, not ad hoc box-shadows** — one `--ino-elevation-1`,
  reused everywhere a raised surface appears, instead of every card inventing its own shadow.
- **A defined type scale, not per-component font sizes** — the audit in
  `angular-theme-contract.md` found the v5 mockup already drifting (section headers at both
  32px and 36px for what should be one role) — flagged there as a Phase-3 cleanup item rather
  than quietly perpetuated into the token file.

Material Theme Builder (`https://m3.material.io/theme-builder`) remains the reference tool if a
second, lighter palette is ever needed (e.g. a light-mode fluid/B2C surface) — not used yet
because the approved v5 foundation is dark-only.

---

## Build-vs-adopt: component primitives (named explicitly, per the plan doc's commitment)

The v5 checklist calls for `spartan/ui` in place of Shadcn UI. Recommendation, applied as the
default in `angular-theme-contract.md`, reversible if you disagree:

- **Adopt `spartan/ui`** (Angular CDK-based, unstyled-primitive port of the same Radix/Shadcn
  primitives Vetra uses) for structural behavior — dialog/tabs/table a11y, focus trapping,
  keyboard nav — rather than hand-rolling that logic. It ships **unstyled**, so our token
  contract still drives 100% of the visual surface; we're not adopting a look, only
  battle-tested interaction/accessibility behavior that's expensive to get right from zero
  (exactly the kind of WCAG 2.2 focus-visible/keyboard-nav risk flagged back at Concept 2).
- **Do not adopt** a full Angular Material theme underneath — M3's *token model* is the
  reference (above), but Angular Material's default components carry visual opinions (ripple,
  M3 shape/motion defaults) that would fight the Apple/SpaceX monochrome discipline this thread
  fought three rounds to establish. Angular CDK (which spartan/ui sits on) gives the same
  accessibility primitives without the default visual layer.
- **Angular's built-in Animations API**, not Motion One or Framer-Motion-equivalents, for
  scroll-reveal and the count-up/tier-toggle interactions — it's already in the Angular
  dependency graph, respects `prefers-reduced-motion` via Angular's animation driver, and the
  vanilla-JS count-up in the v5 file ports to a ~20-line `CountUpDirective` (contract in
  `angular-theme-contract.md`) without adding a library.

## Font onboarding: Geist / Geist Mono

Currently the v5 mockup loads Geist from Google Fonts' CDN (`fonts.googleapis.com`). That's fine
for a mockup, wrong for shipping:

- **Self-host instead of CDN**, per the v5 checklist and the brief's "fallback-safe typography"
  requirement — a bank-side or regulator-side reviewer on a locked-down/air-gapped machine may
  not reach `fonts.googleapis.com` at all, and a KYB risk report silently falling back to a
  different font mid-review is exactly the kind of "layout breakage" the brief calls out.
- **Source:** Geist and Geist Mono are Vercel's typefaces, OFL-1.1 licensed (free to self-host,
  no attribution requirement beyond keeping the license file) — `github.com/vercel/geist-font`.
  Static `.woff2` files, no build step.
- **Integration:** `@font-face` block + local `.woff2` files under a repo path such as
  `src/assets/fonts/geist/`, referenced from `tokens.css`'s `--ino-font-display` /
  `--ino-font-mono` stack as the first entry, `system-ui, Arial, Helvetica` already present as
  the fallback chain in both. No token change needed when the font is added — the custom
  property already names `"Geist"` / `"Geist Mono"` as the first choice.
- **Not done in this pass:** the actual `.woff2` binaries aren't fetched into this repo yet —
  that's a one-time asset-onboarding step best done against the real Angular app's asset
  pipeline (this repo has no build step to verify a self-hosted `@font-face` actually resolves).
  Flagged here so it isn't lost, not silently skipped.

---

## Dense mode / Fluid mode

Implemented as a `[data-density]` attribute selector (see `tokens.css` §9), not two separate
token files or two separate apps — one brand, two densities, exactly per the brief's "single
master identity, dual audience" requirement:

- **Dense** (`data-density="dense"`): 32px minimum row height. WCAG 2.2 §2.5.8 sets a 24×24 CSS
  px floor for pointer targets — 32px is deliberately above the floor, not at it, because dense
  KYB risk tables are exactly where a reviewer mis-clicking a row has real consequences.
- **Fluid** (`data-density="fluid"`): 44px row height (iOS/Android's common touch-target
  convention), generous line-height, for B2C surfaces.

Applied at a container level (e.g. `<body data-density="dense">` on a dashboard shell,
`data-density="fluid"` on a consumer page root) — never on `:root` globally, so a single Angular
app can host both without a second theme.

---

## What's still open / needs a human call

Not a new approval gate (nothing here blocks Phase 3 from starting) — surfacing these so they're
decisions, not accidents:

1. **Geist `.woff2` self-hosting** needs the real Angular app's asset path to land correctly —
   next actual code change, not a docs-repo change.
2. **Type-scale drift found in the v5 mockup** (32px vs 36px both used for what should be one
   `h2` role) — resolved in `tokens.css` by picking 32px as canonical; flagging that the v5 HTML
   file itself still has the 36px outlier on the final-CTA heading, unfixed, since editing that
   file wasn't in scope for this pass.
3. **Light mode** — everything above is dark-surface-only, matching the approved foundation. If
   a light B2C surface is ever needed, it's a second primitives block under a
   `[data-theme="light"]` selector, not a rewrite of the role names.
