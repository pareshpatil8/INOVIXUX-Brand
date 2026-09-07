# INOVIXUX Brand

Brand architecture and identity system for INOVIXUX — DPI-aligned (India Stack / UPI / ABDM)
infrastructure spanning KYB underwriting, risk verification, and eventually healthcare/central
banking/AI use cases.

## Start here

👉 **[`docs/brand/00-INDEX.md`](docs/brand/00-INDEX.md)** — single current-state page: what's
approved, what's built, what's paused, and links to everything else. Read this first; every other
doc in `docs/brand/` assumes you arrived via it.

## Contents (numbered = current; see the index for what's archived)

- `docs/brand/00-INDEX.md` — start here.
- `docs/brand/00-understanding-and-plan.md` — original scope, timeline, design-system onboarding.
- `docs/brand/01-brand-architecture-concepts.md` — archived first-round concepts (see index §6).
- `docs/brand/02-design-tokens/` — the approved token contract, style guide, Angular theme
  contract (**primary active workstream**).
- `docs/brand/03-vetra-structural-foundation.md` — the approved Verified Line foundation build.
- `docs/brand/04-activity-plan-and-visual-samples.md` — six-workstream activity plan.
- `docs/brand/05-verbal-identity.md` — brand voice/verbal identity guide.
- `docs/brand/06-angular-components/` — Angular standalone component source.
- `docs/brand/07-collateral/` — letterhead, business card spec, pitch deck template.
- `docs/brand/08-website-sitemap.md` — proposed website sitemap (design-system-based, not built).
- `docs/brand/09-design-system-standards.md` — governance, WCAG 2.2 standards, naming policy.

Tech rails: Java / Spring Boot backend, Angular frontend. All design tokens are scoped to land
as Angular-consumable CSS custom properties. **KYB MVP integration and anything requiring an
external-world connection is currently paused per board directive (2026-09-07)** — see the index,
§5, for scope.
