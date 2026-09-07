# INO-31 — Proposed Website Sitemap (design-system-based proposal, not build)

**Responds to:** *"for our web-site give me the proposed site map or what all you are thinking to
be part of the website."*

**Status:** Proposal for review only. Nothing below is built as a real Angular route — it is a
structure to approve or redline before any routing/porting work starts, consistent with your
instruction that the design system finishes first and nothing connects externally yet.

**Grounded in what's already built,** not invented from scratch: the section order below is the
same anatomy already rendered in
[`mockups/foundation-v5-verified-line.html`](mockups/foundation-v5-verified-line.html), split out
into real pages/routes instead of one long scroll, plus a few pages that anatomy didn't need to
cover (legal, docs, careers).

---

## 1. Site structure

```
/ (Home)
├── /platform                     — what the system does, KYB module framed as the first module
│   └── /platform/kyb             — KYB vendor underwriting deep-dive (the MVP module)
├── /how-it-works                 — "system surfaces evidence, human decides" — the core verbal
│                                    identity claim, made concrete with the trace→review→resolve
│                                    flow already in the hero mockup
├── /trust-and-governance         — DPI alignment (UPI/ABDM/GSTIN/MCA21/AA/e-KYC rails), the
│                                    INO-14 non-commercial hold stated plainly, WCAG 2.2 statement,
│                                    security/compliance posture
├── /docs                         — system documentation portal (dark-mode, dev-facing; this is
│                                    the "System Documentation" surface named in the original brief)
│   ├── /docs/getting-started
│   ├── /docs/api-reference
│   └── /docs/design-system       — public-facing version of this repo's token/component docs,
│                                    once there's an app to point at
├── /company
│   ├── /company/about
│   └── /company/careers
├── /legal
│   ├── /legal/privacy
│   ├── /legal/terms
│   └── /legal/disclosures        — INO-14 non-commercial disclaimer lives here as a real page,
│                                    not just a deck slide — same rule as the pitch-deck template
├── /contact
└── (product-facing, separate from marketing site — see §3)
```

## 2. Page-to-component mapping (so nothing here needs new design work)

| Page | Reuses these existing pieces |
|---|---|
| `/` (Home) | `ino-nav`, `ino-hero`, `ino-feature-grid`, `ino-metric-panel` ×2, `ino-tier-card` ×2, `ino-footer` — the exact v5 anatomy, no new components |
| `/platform`, `/platform/kyb` | `ino-feature-grid` (re-themed per section), `ino-metric-panel` for KYB-specific stats |
| `/trust-and-governance` | Fluid-density layout (`data-density="fluid"`) — whitespace-forward, not the dense risk-table mode |
| `/docs/*` | Dense-mode components; this is exactly the "high-fidelity dark-mode developer documentation portal" the original brief named for Concept 2's register — Verified Line's monochrome-plus-one-accent system covers it without needing that concept |
| `/legal/disclosures` | Plain content page, same typography tokens, no components — deliberately boring/legible over "designed" |

## 3. Marketing site vs. product app — kept as two separate surfaces on purpose

- **Marketing/docs site** (everything in §1) — public, no auth, safe to build and deploy
  independent of the KYB MVP's status. This is what "finish the design system, then the website"
  in your instruction refers to, and it's the part with no external-world dependency.
- **Product app** (the actual KYB risk-review dashboard, dense-mode RAG tables, reviewer queues)
  — lives inside the real KYB MVP codebase, not this repo, and is explicitly **paused** per your
  directive (see `00-INDEX.md` §5). Not in scope for this sitemap.

## 4. What this sitemap deliberately leaves out (flag before building)

- No pricing/plans page — INO-14 hold means nothing commercial is offered yet; the deck template
  already enforces this same rule with a hard-coded disclaimer slide.
- No customer logos / case studies section — nothing to claim honestly yet; add only when true.
- No blog — not requested, not assumed; add if you want a content workstream.

## 5. Next step on this (only after you review, per your "visibility before next step" instruction)

1. You redline structure/pages above.
2. Once approved, this becomes a routing table for the real Angular app (§3's marketing site) —
   still gated on the design system being fully signed off first, per your priority order.
