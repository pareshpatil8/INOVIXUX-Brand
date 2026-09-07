# INO-31 — Start Here: Brand Architecture Showcase & Status

**Why this file exists:** you told us plainly — *"nothing is getting showcased to me, so I am
worried... I first need the complete visibility of all above tasks then we will take the next
step post approval."* That's a fair reaction to nine numbered doc folders and five rounds of
concept revisions (`v1`–`v5`) landing over two days. This file is the fix: **one page, current
state only, no history to dig through.** Everything superseded is named once and pointed at the
archive section (§6) instead of being deleted, so the paper trail survives without cluttering
the front door.

**Directive received 2026-09-07, applied everywhere below:**
1. KYB / anything touching the external world is **paused** — not worked on until you say
   otherwise (§5).
2. Primary, sole active focus until further notice: **finish the design system** (§2), plus
   brand language, logo, letterhead, business card (§2–4) — i.e. everything that does **not**
   require an external connection.
3. Website work is scoped to *design-system-based* proposals only for now (§7 sitemap) — no
   Angular build, no live integration.
4. Governance/standards doc requested — delivered (§8).

**2026-09-07, second directive received this same day:** *"i am not really happy with md files
... giving you go-ahead to start further development ... I will share the review only when the
design system, brand logos and other artifacts has developed."* Understood as: stop describing,
start shipping non-markdown artifacts. This round adds two of those, both real files, not docs
*about* files:

- **`/assets/brand/logo/`** — the actual logo file set: 8 standalone SVGs (icon mark on-dark/
  on-light, mono-black/mono-white for one-color print, full lockup on-dark/on-light, favicon,
  social card) plus rendered PNG exports in `/assets/brand/exports/` (favicon 32/512/1024px,
  1200×630 social card, and a full-page screenshot of the running app below). No markdown
  required to see these — open them directly.
- **`/web/`** — the design system wired into a real, buildable Angular workspace (`ng build`
  passes), not source files sitting under `docs/`. `cd web && npm install && npm start` runs it
  at `localhost:4200`. It's the same six components from §2, driven by the same token file,
  actually rendering. Screenshot: [`assets/brand/exports/web-app-preview.png`](../../assets/brand/exports/web-app-preview.png).

---

## 1. The single approved identity: "Verified Line"

Everything below is built on **one** approved mark — you accepted this as the foundation on
2026-09-06 (interaction `7e2a64f6`, plan revision 7). There is no open three-way pick anymore;
the three-concepts-at-a-time rounds (Sovereign Monolith/Adaptive Synapse/Ecosystem Anchor, then
Verified Line/Aperture Mark/Ledger Seal) are closed and archived (§6).

- **Mark:** a single traced line that resolves into a checkmark only when a human reviewer closes
  a case. Not a static icon — a state, matching "human still approves everything."
- **Accent:** Signal Blue `#3B6EF6`.
- **Type:** Geist / Geist Mono (OFL-licensed, self-hostable).
- **Surface:** near-black monochrome, one functional accent, no gradients/glow (Apple/SpaceX
  discipline you asked for after rejecting the original 21st.dev-glow direction).

**See it live, no build step —open directly in a browser:**
- [`mockups/foundation-v5-verified-line.html`](mockups/foundation-v5-verified-line.html) — full
  site anatomy (nav → hero w/ live dashboard → features → metrics → tiers → footer). Screenshot:
  [`mockups/foundation-v5-verified-line.png`](mockups/foundation-v5-verified-line.png).
- [`02-design-tokens/style-guide.html`](02-design-tokens/style-guide.html) — every color role,
  RAG chip, type step, spacing/elevation value, rendered live from the real token file. Screenshot:
  [`02-design-tokens/style-guide.png`](02-design-tokens/style-guide.png).

---

## 2. Design system — **primary active workstream**, status below

| Piece | File | Status |
|---|---|---|
| Token contract (color roles, type scale, spacing, elevation, dense/fluid density modes) | [`02-design-tokens/tokens.css`](02-design-tokens/tokens.css) | ✅ Done, WCAG 2.2 contrast-audited (measured ratios, not eyeballed — see `02-design-tokens/README.md`) |
| Rendered style guide | [`02-design-tokens/style-guide.html`](02-design-tokens/style-guide.html) | ✅ Done |
| Angular theme contract (how the tokens + 6 component contracts map to Angular) | [`02-design-tokens/angular-theme-contract.md`](02-design-tokens/angular-theme-contract.md) | ✅ Done |
| Angular component source (Nav, Hero, FeatureGrid, MetricPanel, TierCard, Footer + CountUpDirective) | [`06-angular-components/`](06-angular-components/) | ✅ Done as source, standalone/OnPush, 100% token-driven |
| Same components, wired into a real running app | [`/web/`](../../web/) | ✅ New this round — `ng build` passes, `npm start` serves it live |
| Logo asset library (SVG + PNG, not embedded in a mockup) | [`/assets/brand/logo/`](../../assets/brand/logo/), [`/assets/brand/exports/`](../../assets/brand/exports/) | ✅ New this round |
| Font self-hosting (Geist `.woff2`) | — | ⏳ Open — needs a real app's asset pipeline to land into; tracked, not lost |
| Light-mode / B2C surface | — | ⏳ Deferred — only build if/when a light surface is actually needed |
| Governance / usage standards | [`09-design-system-standards.md`](09-design-system-standards.md) | ✅ New this round — see §8 |

**Read as:** the dark/dense-mode design system is functionally complete and self-consistent.
What's left in this workstream (font self-hosting, light mode) both require a real Angular
codebase to finish properly — see §5 for why that's intentionally on hold.

## 3. Brand language (verbal identity)

- [`05-verbal-identity.md`](05-verbal-identity.md) — anchor vocabulary, banned-word list (tied
  directly to the "human still approves everything" mandate), voice-by-surface table, 3 tagline
  candidates. **Status:** done; tagline pick deferred at your request ("decide later" — not
  blocking anything).

## 4. Collateral (letterhead, business card, pitch deck)

| Item | File | Status |
|---|---|---|
| Letterhead | [`07-collateral/letterhead.html`](07-collateral/letterhead.html) | ✅ Done — A4 + US Letter, print-ready CSS |
| Business card spec | [`07-collateral/business-card-spec.md`](07-collateral/business-card-spec.md) | ✅ Spec done — press file needs the final vector logo (§5, on hold pending your Figma go-ahead) |
| Pitch deck template | [`07-collateral/pitch-deck-template.html`](07-collateral/pitch-deck-template.html) | ✅ Done — hard-codes the INO-14 non-commercial disclaimer so it can't be dropped |

## 5. Paused — do not resume without an explicit instruction

Per your 2026-09-07 directive, the following are **on hold**, not silently in progress:

- **KYB MVP integration / rollout** (activity-plan workstream F, and the KYB-specific row of
  workstream C) — anything that would connect this brand/design work to a live external system.
  Nothing here has been touched this round.
- **Final vector logo artwork via Figma** — you said you'll authorize the Figma connector
  yourself via claude.ai connector settings. Nothing pushed to a Figma file yet; we'll wait for
  your confirmation that it's actually authorized before touching it, since Figma tools showing
  as available in this session isn't the same as your account being connected. (The SVG mark
  files in `/assets/brand/logo/` are hand-built vector paths, not a Figma export — they're real
  and usable now, but a designer pass in Figma would still refine curve quality before press.)
- **Angular port of the *live marketing website* into a production repo** — `/web/` (this round)
  is the design-system showcase app, not the production site; still correctly sequenced after
  design-system sign-off, and still no live/external wiring (no KYB, no backend calls).

## 6. Archive (superseded — kept for the record, not for reading)

Three earlier concept rounds were rejected in review and are retired. Not re-litigated here;
listed once so old links make sense if you ever open them:

- Round 1 (`Sovereign Monolith` / `Adaptive Synapse` / `Ecosystem Anchor`, v1–v3) —
  [`01-brand-architecture-concepts.md`](01-brand-architecture-concepts.md), mockups
  `mockups/concept-1/2/3-*.html`.
- Round 2 (`Verified Line` / `Aperture Mark` / `Ledger Seal`, v4) — mockups
  `mockups/concept-a/b/c-*-v4.html`.
- Verified Line (round 2, option A) is the one carried into the approved v5 foundation — see §1.

## 7. Website — proposed sitemap (design-system-based proposal only, no build yet)

See [`08-website-sitemap.md`](08-website-sitemap.md) — answers your direct ask: *"give me the
proposed site map or what all you are thinking to be part of the website."* This is a proposal
for your review, not something being built yet.

## 8. Skills / policies / standards

See [`09-design-system-standards.md`](09-design-system-standards.md) — brand usage rules, token
governance (how a color/mark change gets approved and versioned), WCAG 2.2 checklist, INO-14
disclaimer enforcement rule, and a file-naming convention going forward specifically to prevent
the v1–v5 sprawl that caused the visibility problem this file is fixing.

## 9. Open decisions (not blocking anything, answer whenever convenient)

- Tagline pick from `05-verbal-identity.md` §6 (you said "decide later" — still true, no rush).
- Real-fact corrections to illustrative placeholder copy (rails list, geography grid, deck
  metrics) — currently left as illustrative per your last answer; will stay flagged in the
  markup rather than shipped as fact.

---

*Every file linked above already exists in this repo and on
`github.com/pareshpatil8/INOVIXUX-Brand`, `main` branch. Nothing new to open beyond the links on
this page.*
