# INO-31 — Phase 3: Brand Architecture Activity Plan & Visual Sample Guide

**Status:** In progress. Responds to the board comment: *"give me the sample of design with
visualization and also plan the activities like brand logo, design system, website, brand
language etc which has to be performed as a part of the Brand architecture."*

> **2026-09-07 directive applied below:** KYB / anything requiring an external-world connection
> is **paused** — do not work on it. Primary active focus until further notice is finishing the
> design system, brand language, logo, letterhead, and business card (i.e. everything with no
> external dependency). Website work is scoped to a design-system-based sitemap proposal only —
> see `08-website-sitemap.md`. Full current-state view: start at `00-INDEX.md`, not this file.

**Prepared by:** CEO agent (Paperclip / Claude) · **Date:** 2026-09-07

**Housekeeping first:** the prior run (`d75c366b`) hit its session limit before it could commit
Phase 2 (the design token system). That work was sitting on disk, uncommitted. It's now committed
and pushed (`ca4ab35`) — nothing from that run was lost. Everything referenced below is live on
`github.com/pareshpatil8/INOVIXUX-Brand`, `main` branch.

---

## 1. The visual samples that exist right now (open these directly)

You don't have to imagine this system — it's built and renders in a browser today. Two files
carry the actual visualization:

| # | File | What it shows |
|---|---|---|
| 1 | [`mockups/foundation-v5-verified-line.html`](mockups/foundation-v5-verified-line.html) (screenshot: `.png`) | The **full website** — nav, hero with a live-rendered risk-trace dashboard, feature grid, metrics panels with count-up animation, deployment tiers, footer — skinned in the approved **Verified Line** identity (Signal Blue `#3B6EF6`, Geist/Geist Mono type). This is the logo lockup, the type system, the color system, and the page structure all working together, not a static comp. |
| 2 | [`02-design-tokens/style-guide.html`](02-design-tokens/style-guide.html) (screenshot: `.png`) | The **design system atomized** — every color role, RAG risk-flag chip, type scale step, spacing/radius/elevation value rendered live from `tokens.css`. If a token changes in the CSS file, this page changes with it — it's the audit surface, not a mockup of one. |

Earlier-round comps, kept for the paper trail on what was rejected and why (still in
`mockups/`): three original concepts (`concept-1/2/3-*`, Sovereign Monolith / Adaptive Synapse /
Ecosystem Anchor — retired), and the three revised structural marks (`concept-a/b/c-*-v4` —
Verified Line / Aperture Mark / Ledger Seal). Verified Line is the one carried forward into the
v5 build above.

**The logo itself, precisely:** the mark is a single traced line (see the hero graph in
`foundation-v5-verified-line.png`) that only resolves into a checkmark once a human reviewer
closes a case — it is not a static icon, it's a state. The B2C variant is the same line cropped
tighter, not a redrawn logo (see §2.A below for why that matters).

---

## 2. Activity plan — six workstreams

Everything under "Design System" and "Website" below builds directly on what's already shipped
(§1). Nothing in this table restarts from zero.

### A. Brand Logo (the Verified Line mark)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Structural mark definition (line-to-checkmark logic, B2C crop rule) | Done — described in `03-vetra-structural-foundation.md` and rendered in the v5 hero | Agent | ✅ Done |
| Final vector artwork (SVG, multiple lockups: horizontal, stacked, favicon/app-icon crop, monochrome-on-light variant) | Production-ready `.svg` set + usage rules (min size, clear space, misuse examples) | **Human designer or Figma pass** | ⏳ Not started — this is the one piece an agent cannot hand-draw to production quality |
| Figma file handoff (once connected) | Editable master file for future variants | Human (Figma workspace not yet connected to this agent) | Blocked on Figma OAuth — see note below |

**Note:** the Figma MCP connector shows as "connecting" in this environment. Once you authorize
it (via `claude mcp` or the Figma app's connector settings), I can push a starter Figma file
built from the SVG geometry already implied by the HTML/CSS mark, so a designer isn't starting
from a blank canvas.

### B. Design System (tokens → components)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Token contract (color roles, type scale, spacing, elevation, RAG semantics, dense/fluid density modes) | `tokens.css`, `style-guide.html`, WCAG 2.2 contrast audit | Agent | ✅ Done (`02-design-tokens/`) |
| Angular component contracts (Nav, Hero, FeatureGrid, MetricsPanel, TierCard, Footer — selector/@Input/@Output specs) | `angular-theme-contract.md` | Agent | ✅ Done |
| Build-vs-adopt primitives decision (`spartan/ui` for structural a11y, Angular Animations for motion) | Documented, reversible | Agent | ✅ Decided |
| Geist / Geist Mono font self-hosting (`.woff2` assets + `@font-face`) | Font files landed in the real Angular app's `assets/` | Agent, once Angular repo exists | ⏳ Needs the actual Angular codebase — this docs-only repo has no build step to verify it |
| Component implementation (turn the 6 contracts into real Angular standalone components) | `06-angular-components/` — all 6 components + `CountUpDirective`, standalone/OnPush, 100% token-driven | Agent (with your dev review) | ✅ Done — source only, not built (no target workspace yet; see that folder's README) |
| Light-mode token block (`[data-theme="light"]`) — only if a light B2C surface is needed | Second primitives block, same role names | Agent | ⏳ Deferred until requested |

### C. Website (public + product-facing surfaces)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Structural page build (proven against Vetra's anatomy, framework-free) | `foundation-v5-verified-line.html` | Agent | ✅ Done |
| Port to Angular (real routing, real components from B) | Working Angular site | Agent + your dev review | ⏳ Depends on B |
| Content pass (replace illustrative copy — rails list, geography grid — with verified real integrations) | Final copy | You (fact-check which rails/geographies are actually live) | ⏳ Needs your input — I flagged every illustrative claim in the HTML comments so nothing ships as fact by accident |
| KYB product surface (dense-mode dashboard: risk tables, RAG matrix, reviewer queue) | Angular views inside the actual KYB MVP repo | Agent + dev review | ⏸ **PAUSED 2026-09-07 per board directive — do not resume without explicit instruction** (external-world connection) |

### D. Brand Language (verbal identity)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Anchor vocabulary (Resilience / Governance / Verification / Augmented Control; no hype words) | Applied throughout all docs and mockups so far | Agent | ✅ In use |
| Formal verbal identity guide (voice/tone rules, a do/don't word list, sample sentences per surface: dashboard microcopy vs. pitch-deck copy vs. legal/compliance copy) | `05-verbal-identity.md` | Agent | ✅ Done (first draft) |
| Tagline / one-line positioning statement | 3 short-listed candidates in `05-verbal-identity.md` §6 | Agent (draft) + you (pick) | ⏳ Drafted — awaiting your pick |

### E. Collateral (print + presentation)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Letterhead template | `07-collateral/letterhead.html` — A4 + US Letter, print-CSS, single Signal Blue traced rule | Agent | ✅ Done |
| Business card (matte/foil spec, Verified Line mark placement) | `07-collateral/business-card-spec.md` — dimensions, stock, foil/emboss trade-off, front/back layout | Agent (spec) + print vendor | ✅ Done — spec only; needs workstream A's final vector mark before a press file exists |
| Pitch deck template (INO-14-compliant — no commercial claims) | `07-collateral/pitch-deck-template.html` — 16:9, 6-slide skeleton, mandatory INO-14 disclaimer slide | Agent | ✅ Done |

### F. Rollout (into the real KYB MVP + org-wide adoption)

| Activity | Deliverable | Owner | Status |
|---|---|---|---|
| Wire tokens + components into the actual KYB Angular app | Live app using `tokens.css` | Agent + dev review | ⏸ **PAUSED 2026-09-07 per board directive** — external-world connection, not to be worked on |
| Contrast/accessibility regression check on real screens (not just the style guide) | Audit note | Agent | ⏸ Paused alongside rollout, same reason |
| Internal brand guideline doc (for anyone else touching INOVIXUX surfaces later) | `09-design-system-standards.md` | Agent | ✅ Done this round (governance/standards doc, doesn't depend on rollout) |

---

## 3. Suggested sequencing (not a hard gate — flagging dependencies, not asking permission)

```
Done ──▶ D (verbal identity doc)         [no dependency — see 05-verbal-identity.md]
     ──▶ B (Angular component build)     [no dependency — see 06-angular-components/]
     ──▶ E (collateral templates)        [no dependency — see 07-collateral/; used the mark's
                                           existing CSS/SVG form, not final vector art]
Open ──▶ C (Angular port of the site)    [depends on: a real target repo]
     ──▶ A (final vector logo)           [depends on: you authorizing Figma, or a designer]
     ──▶ F (real MVP rollout)            [depends on: knowing where that repo lives]
     ──▶ Business card press file        [depends on: A — the spec in 07-collateral/ is done,
                                           the final vector mark to print it with is not]
```

**B, D, and E are now done — every remaining workstream (A, C, F) and the business-card press file
depend on one of the same three answers, not on more unattended agent work:**
1. Where does the actual KYB MVP Angular codebase live (repo URL/path)? C and F can't become
   *real*, wired Angular code without a target repo — component *source* (B) is done in this
   docs repo per the HITL guardrail; installing it into a live app is the next step and needs a
   destination.
2. Authorize the Figma MCP connector (your call) if you want a designer-ready file for the final
   logo vector pass — this also unblocks the business card's press-ready artwork.
3. Anything in the "illustrative" callouts (rails list, geography grid, deployment tiers, deck
   metrics) you want corrected to real facts before any of this ships anywhere real.
4. A pick among the 3 tagline candidates in `05-verbal-identity.md` §6, whenever convenient — not
   blocking anything else.

Raised as a structured question set on this issue so a reply here resumes work automatically.

---

*Committed to `docs/brand/` and pushed to `github.com/pareshpatil8/INOVIXUX-Brand` alongside this
document.*
