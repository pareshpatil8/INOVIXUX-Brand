# 12 — Branding & Design System Completeness Checklist

**Responds to:** *"in similar style we have to create the entire design system and branding for
our company but in line with Vetra structure. also let me know anything that has to be created
under the branding if i missed."*

This is a straight answer to that question: every category a company brand/design-system
normally covers, cross-checked against what's actually in this repo today, so nothing gets
assumed-done or silently dropped. `✅` = built and pushed. `🟡` = partial / structural only.
`⬜` = not started. Everything `🟡`/`⬜` is the real backlog — treated as follow-up child issues
(§6), not re-litigated as a new concept round.

---

## 1. Brand identity core

| Item | Status | Where |
|---|---|---|
| Logo mark, lockups, monochrome/print variants | 🟡 open, tracked separately | INO-82 (explicitly split out per your instruction — not blocking anything below) |
| Wordmark / naming rationale | ✅ | `04-activity-plan-and-visual-samples.md`, carried into INO-82 |
| Color system (primary/accent, secondary, status, surface) | ✅ | `02-design-tokens/tokens.css` §1–2; surface depth extended this round (§9 of doc 11) |
| Typography system | ✅ | Geist/Geist Mono, full scale, WCAG-safe fallback chain — `tokens.css` §4 |
| Verbal identity / tone of voice | ✅ | `05-verbal-identity.md` |
| Motion tokens | ✅ | `tokens.css` §9 (durations/easings, `prefers-reduced-motion` handled at component level) |
| Iconography system | ✅ *(this round)* | `14-icon-system.md` — Lucide adopted, sizing scale + color contract set; not yet wired into an Angular component (that's build order item 1) |
| Imagery/photography direction | ⬜ | Not addressed — likely low-priority pre-MVP, flagging so it's a decision not an omission |

## 2. Design tokens (the Angular contract)

| Item | Status | Where |
|---|---|---|
| Color roles (dark + light) | ✅ | `tokens.css` §2, §2b; light-mode independently WCAG-audited, not inverted; toggle re-verified working (`ino-nav` → `ThemeService`) and made a standing ship gate — `09-design-system-standards.md` §5 |
| Surface depth (raised/sunken/overlay) | ✅ *(this round)* | `tokens.css`; addendum in `11-…mobile-accessibility.md` §9 |
| Spacing scale | ✅ | `tokens.css` §5 |
| Radius scale | ✅ | `tokens.css` §6 |
| Elevation scale | ✅ *(2 steps now)* | `tokens.css` §2, §2b |
| Touch targets (mobile/dense) | ✅ | `tokens.css` §7 |
| Safe-area insets | ✅ | `tokens.css` §11 |
| Density modes (dense/fluid) | ✅ | `tokens.css` §10 |
| Governance / contribution rules | ✅ | `09-design-system-standards.md` |

## 3. Component library (Angular)

| Item | Status | Where |
|---|---|---|
| Nav, hero, feature grid, metric panel, tier card, footer | ✅ | `06-angular-components/`, mirrored in `web/src/app/components/` |
| Generic card (bento tile / list card base) | ✅ *(this round)* | `06-angular-components/src/components/card/`, live in `web/` `#cards` |
| Buttons (primary/secondary/ghost/icon, all states) | ✅ | INO-83 — `06-angular-components/src/components/button/`, live in `web/src/app/components/button/` |
| Form controls (input, select, checkbox, radio, toggle) | ✅ | INO-83 — `input/`, `select/`, `checkbox/`, `radio-group/`, `toggle/` in both `06-angular-components/src/components/` and `web/src/app/components/` |
| Modal / bottom sheet | ✅ | INO-83 — `modal/` (dialog + focus trap) on the `overlay-scrim`/`elevation-2` token contract |
| Toast / inline alert / banner | ✅ | INO-83 — `alert/` + `toast-container/`, consuming the status colors |
| Tabs | ⬜ | Not started (contract notes `spartan/ui` as the likely behavior-primitive source — `angular-theme-contract.md` §4) |
| Table (beyond the dense-mode row-height token) | ⬜ | Row height/spacing tokens exist; no actual `<ino-table>` component |
| Badge / chip (non-RAG, e.g. tag/label use) | 🟡 | RAG chip markup exists in the style guide; no standalone reusable component |
| Avatar | ⬜ | Not started |
| Empty state | ⬜ | Not started |
| Skeleton / loading state | ⬜ | Not started |
| Pagination | ⬜ | Not started |

## 4. Website (marketing/docs surface)

| Item | Status | Where |
|---|---|---|
| Sitemap / IA | ✅ | `08-website-sitemap.md` |
| Homepage anatomy | ✅ (as a running app) | `web/` — nav→hero→features→cards→tiers→footer |
| Per-page templates (platform, docs, trust/governance, legal, careers, contact) | ✅ | INO-84 — `web/src/app/pages/{platform,how-it-works,trust-governance,company,legal,contact}/`, routed in `web/src/app/app.routes.ts` |
| Docs portal layout (dense dev-docs register) | ✅ | INO-84 — `web/src/app/pages/docs/` (`getting-started`, `api-reference`, `design-system` children) |
| 404 / error page | ✅ | INO-84 — `web/src/app/pages/not-found/`, wired to the `**` route |

## 5. Mobile app

| Item | Status | Where |
|---|---|---|
| Token contract (touch targets, safe-area, fluid density) | ✅ | `tokens.css` §7/§10/§11 |
| Platform guidance (theme default, typography fallback) | ✅ | `11-…mobile-accessibility.md` §6 |
| Actual screen inventory (nav pattern, tab bar, list/detail, onboarding) | ✅ | `15-mobile-screen-inventory.md` — full screen list mapped to templates; shared spec for all three framework tracks below |
| App icon / splash screen | ✅ *(this round)* | Exported per platform from `inovixux-icon-b2c.svg` on all three tracks — `mobile/capacitor/resources/`, `mobile/react-native/assets/`, `mobile/flutter/assets/{icon,splash}/`, each with a `scripts/gen*app*icon*` generator |
| Screens actually built | ✅ *(this round)* | All 13 inventory rows built on all three tracks — see `15-mobile-screen-inventory.md` §4 for the per-track file map. INO-88/89/90 closed. |
| Framework decision | ✅ *(this round)* | Resolved on INO-85: build all three — Capacitor, React Native, Flutter — in parallel, each in its own `mobile/<framework>/` folder. See `13-mobile-app-patterns.md` §5. Child issues track each build. |

## 6. Collateral (non-digital / print)

| Item | Status | Where |
|---|---|---|
| Business card spec | ✅ | `07-collateral/business-card-spec.md` |
| Letterhead | ✅ | `07-collateral/letterhead.html` |
| Pitch deck template | ✅ | `07-collateral/pitch-deck-template.html` |
| Print-ready vector exports | ⬜ blocked | Needs final logo mark (INO-82) per `09-design-system-standards.md` §6 |

## 7. What this checklist deliberately does NOT add

- **KYB product screens** (risk-flag tables, reviewer queues) — explicitly paused per your
  2026-09-07 directive; tokens/density modes are ready for them, no screens built.
- **Any commercial/pricing content** — INO-14 hold still applies everywhere above.
- **A duplicate of whatever `~/Downloads/e-Cheque Design System` contains that isn't listed
  above** — that folder could not be read this round (local OS permission boundary, not a repo
  issue — see `11-…mobile-accessibility.md` §9). If it has categories not covered here, the
  fastest fix is copying it into `docs/references/` in this repo, or naming the specific
  categories directly in a comment.

## 8. Build order — items 1–5 complete

1. ~~**Buttons + form controls**~~ ✅ INO-83 — everything else depended on these.
2. ~~**Modal/dialog + toast/alert**~~ ✅ INO-83, on the existing `overlay-scrim`/`elevation-2`/
   status-color token contract.
3. ~~**Website page templates**~~ ✅ INO-84 — the approved sitemap turned into real routed pages.
4. ~~**Mobile app screen inventory**~~ ✅ INO-85 — pattern set in `13-mobile-app-patterns.md`,
   screen list + as-built file map in `15-mobile-screen-inventory.md` §1/§4. Framework decision
   resolved (all three: Capacitor, React Native, Flutter, in parallel); builds shipped on
   INO-88/89/90, all closed.
5. ~~**Icon system**~~ ✅ `14-icon-system.md` (Lucide, sizing/color contract), consumed by web
   components and all three mobile tracks.

**Remaining ⬜ items** are the lower-priority §3 component rows (tabs, table, badge/chip, avatar,
empty state, skeleton, pagination) and §6's print-ready vector exports (still gated on the final
logo mark, INO-82). None of them block the website or mobile surfaces that now exist.
