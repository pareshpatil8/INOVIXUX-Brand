# INOVIXUX Accessibility Statement (INO-170, L-15)

**Status: content ready, not yet live.** `/trust-and-governance` (`08-website-sitemap.md` §1) is
the intended home for this page, and that sitemap is itself still "proposal for review only" — no
marketing site exists in this repo yet to publish it on. This document is the publish-ready copy;
whoever builds `/trust-and-governance` drops it in verbatim. Treat every claim below as something
that must stay true at publish time, not just true today — re-check before shipping if this doc's
last-verified date has drifted from the current `tokens.css`/lint state.

**Why this waited on INO-118:** publishing an accessibility statement with claims nobody checks is
worse than publishing nothing — it's a false representation to anyone who relies on it, including
auditors in the regulated domains INOVIXUX builds for. INO-118 (design-system adherence lint,
wired into CI on every PR) is now `done`, so the claims below can finally cite something
mechanically enforced instead of "we tried to remember."

**Scope check on INO-118 itself:** INO-118 shipped a *token-adherence* lint (catches hardcoded
color/space/radius/duration values that bypass the semantic token layer), not a page-level
`axe`/`pa11y` scan. `17-phase-2-implementation-program.md` row 8 originally expected axe/pa11y
automation from that gate; what actually landed is narrower. This statement's conformance claims
are scoped to match what is *actually* automated today — see the table below. Do not silently
upgrade the wording to "automated a11y testing" without first landing that broader gate.

---

## Conformance status

**Partially conforms** to WCAG 2.2 Level AA. "Partially conforms" means some parts of the content
do not fully conform to the accessibility standard — this is the standard VPAT/ATAG conformance
level for a system with automated coverage on specific, named criteria and manual review
everywhere else, and it is the honest status until component-level a11y specs (per-component
`docs/brand/06-angular-components/<name>.md` role/ARIA/keyboard contracts) and a page-level
automated scan both exist.

## What is machine-checked today (and re-checked on every pull request)

| Claim | Mechanism | What it actually verifies |
|---|---|---|
| No hardcoded color/space/radius/duration/font-size values bypass the token system | `scripts/check-ds-adherence.mjs`, run in CI (`.github/workflows/design-system.yml`) on every PR and on push to `main` (INO-118) | Structural adherence to the token contract — a proxy for "a future re-theme or contrast fix actually takes effect everywhere," not a direct accessibility test |
| Dark, light, and high-contrast themes keep required text/non-text contrast ratios | `scripts/check-theme-parity.mjs` | WCAG 2.2 SC 1.4.3/1.4.11: text pairs ≥ 4.5:1 (dark/light) and ≥ 7:1 (high-contrast, AAA); non-text/essential-boundary pairs ≥ 3:1 — computed via relative-luminance contrast math, not eyeballed |
| Interactive control heights meet the minimum touch target | `scripts/check-theme-parity.mjs` | WCAG 2.2 SC 2.5.8: 24×24px CSS pixel floor across all three density scales; `fluid` density ships 44px "comfortable" targets |
| Reduced-motion is respected | Documented convention (`09-design-system-standards.md` §4, `13-mobile-app-patterns.md` §4); not yet linted | `prefers-reduced-motion: reduce` (web) / platform equivalents (mobile) disable transform/slide animation, keep opacity/state changes — verified by manual review per component today |

## What is not yet automated (manual review only, until closed)

- **Page-level assistive-technology testing** (`axe-core`/`pa11y`, screen-reader walkthroughs).
  No such gate exists in this repo yet. Until it does, per-component role/ARIA/keyboard
  documentation in `docs/brand/06-angular-components/<name>.md` is the interim substitute, and it
  is reviewed manually, not linted.
- **Full keyboard-map verification** across all shipped components — documented per-component,
  not yet swept automatically.
- **RTL correctness** (logical CSS properties, no hardcoded `left`/`right`) — a per-component
  authoring rule (`17-phase-2-implementation-program.md` §2 DoD row 8), not yet linted.

## Feedback

This is a design-system/pre-launch artifact — there is no live product surface yet to route
accessibility feedback to (see `08-website-sitemap.md` §3: the marketing/docs site and the KYB
product app are both pre-launch). Once a real domain and contact path exist, this section gets a
named contact and response-time commitment; it does not ship with a placeholder email.

## Revision

- 2026-09-22 — Initial publish-ready draft, gated on INO-118 landing. Authored against
  `tokens.css` and `scripts/check-ds-adherence.mjs` / `scripts/check-theme-parity.mjs` as they
  exist at this commit.
