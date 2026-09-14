# 16 — Where We Stand: INOVIXUX design system vs. the e-Cheque reference

**Responds to (2026-09-14):** *"Have we created the entire design system similar to reference
locally at `/Users/apple/Downloads/e-Cheque Design System`… in similar style we were supposed to
create the entire design system and branding for our company but in line with Vetra structure.
Also let me know anything that has to be created under the branding if I missed. I need the
detailed picture where we stand."*

**First, a correction to the record.** `12-branding-completeness-checklist.md` §7 and
`11-dark-light-mobile-accessibility.md` §9 both state that `~/Downloads/e-Cheque Design System`
*could not be read* (macOS Privacy & Security boundary), so the earlier answer was built from your
verbal description of the folder rather than its contents. **That is no longer true — the folder
is readable as of this run and has now been read end to end** (172 files). Everything below is a
file-by-file comparison against the actual reference, not against a description of it. The two
stale notes are corrected in place.

**Headline answer:** the *substance* of a design system is there and in several dimensions ahead
of the reference — tokens, three themes, 14 Angular components, 14 routed website pages, 13 mobile
screens built on three separate framework tracks, collateral, governance. What we do **not** have
is the reference's **packaging and enforcement layer**: the machine-readable manifest, the
per-component contract/usage docs, the per-foundation specimen cards, the adherence lint, the
agent skill descriptor, and the split token entry point. That distinction — *content complete,
packaging incomplete* — is the honest one-line status.

---

## 1. What the reference actually is

`e-Cheque Design System` is a **Claude-generated skill-packaged design system** for a different
product (RBI digital cheque platform, indigo palette, React/JSX). Its value to us is **not** its
colors or components — those are e-Cheque's, not ours — it is its **structure**: how a design
system is packaged so that both humans and agents can consume it without reading the source.

Its shape, in its own words (`readme.md` §File Index):

```
styles.css              ← single import entry, @import list only
tokens/                 ← 6 files: colors, typography, spacing, shadows, borders, motion
assets/                 ← logo.svg, logo-mark.svg, logo-white.svg, brand-hero.svg, brand-illustration.svg
guidelines/             ← 12 *.card.html foundation specimens + ds-context.md (flat token reference)
components/<group>/     ← X.jsx + X.d.ts + X.prompt.md, per group a <group>.card.html gallery
ui_kits/                ← mobile_app/ and web_portal/ standalone clickable prototypes
_ds_manifest.json       ← machine-readable component + "startingPoint" inventory
_ds_bundle.js           ← compiled single-file bundle (102 KB) for artifact embedding
_adherence.oxlintrc.json← lint rules that fail a build when the DS is violated (30 KB of rules)
SKILL.md                ← agent skill descriptor — how an agent should use this system
readme.md               ← the narrative entry doc
```

## 2. Structural parity matrix — reference artifact → our equivalent

`✅` at parity or ahead · `🟡` content covered, packaging missing · `❌` genuine gap

| # | Reference artifact | What it's for | Our equivalent | Verdict |
|---|---|---|---|---|
| 1 | `styles.css` (import entry) | one file a consumer imports | none — consumers import `web/src/tokens.css` directly | 🟡 |
| 2 | `tokens/` split into 6 files | category-scoped token files | `web/src/tokens.css` — single 436-line file, §1–§11, mirrored byte-identical at `docs/brand/02-design-tokens/tokens.css` (verified this run) | 🟡 structure only |
| 3 | `tokens/colors.css` | primary/neutral/status/semantic | ✅ `tokens.css` §1–§2c — **three** themes (dark, light, high-contrast AAA), primitive→role architecture, every ratio measured | ✅ ahead |
| 4 | `tokens/typography.css` | type scale + families | ✅ §4 — Geist/Geist Mono, full scale, mandatory system fallback chain | ✅ |
| 5 | `tokens/spacing.css` | 4px base scale | ✅ §5 | ✅ |
| 6 | `tokens/shadows.css` | elevation + focus rings | ✅ §2/§2b — 2 elevation steps + scrim | ✅ |
| 7 | `tokens/borders.css` | radius + widths | ✅ §6 | ✅ |
| 8 | `tokens/motion.css` | durations + easings | ✅ §9, plus `prefers-reduced-motion` handled at component level | ✅ |
| 9 | — (reference has no density modes) | — | ✅ §10 dense/fluid, §7 touch targets, §11 safe-area insets | ✅ ahead |
| 10 | — (reference has no parity check) | — | ✅ `scripts/check-theme-parity.mjs` — web ↔ RN ↔ Flutter × 3 themes | ✅ ahead |
| 11 | `assets/logo*.svg` (3 files) | logo set | ✅ `assets/brand/logo/` — 9 SVGs (lockup/mark/mono/favicon/social, on-dark + on-light) + 5 PNG exports | ✅ ahead *(final artwork still INO-82)* |
| 12 | `assets/brand-hero.svg`, `brand-illustration.svg` | brand illustration set | **none** | ❌ |
| 13 | `guidelines/*.card.html` × 12 | one embeddable specimen per foundation (colors-primary / -neutral / -semantic / -surface, type-scale / -weights / -mono, spacing, shadows, borders, motion, brand-logo) | one combined `02-design-tokens/style-guide.html` | 🟡 content covered, not decomposed/embeddable |
| 14 | `guidelines/ds-context.md` | flat full token reference for agents | ✅ `02-design-tokens/README.md` (201 lines) + `angular-theme-contract.md` | ✅ |
| 15 | `components/<group>/X.jsx` | component source | ✅ 14 Angular components in `web/src/app/components/`, mirrored in `docs/brand/06-angular-components/` | ✅ *(Angular by mandate, not JSX)* |
| 16 | `components/<group>/X.d.ts` | typed props contract, one file per component | Angular `@Input()`s live in the `.ts`; no extracted contract | 🟡 |
| 17 | `components/<group>/X.prompt.md` | per-component usage notes + code examples | **none** | ❌ largest doc gap |
| 18 | `components/<group>/<group>.card.html` | per-group visual gallery | `web/src/app/pages/docs/design-system/` — one page, 104 lines | 🟡 |
| 19 | `ui_kits/mobile_app/`, `ui_kits/web_portal/` | standalone clickable prototypes | ✅ three *real* mobile apps (Capacitor/React Native/Flutter, 13 screens each) + a real Angular site (14 routes) + GitHub Pages preview | ✅ well ahead |
| 20 | `_ds_manifest.json` | machine-readable inventory (component → source path → preview → viewport) | **none** | ❌ |
| 21 | `_ds_bundle.js` | compiled bundle for embedding | `06-angular-components/package.json` exists, never packaged/published | 🟡 |
| 22 | `_adherence.oxlintrc.json` | lint that **fails** on DS violations (raw hex, off-scale spacing…) | `check-theme-parity.mjs` checks *parity*, not *adherence* — nothing stops a raw `#7C5CFC` landing in a component | ❌ |
| 23 | `SKILL.md` | agent skill descriptor | **none** | ❌ |
| 24 | `readme.md` | narrative entry | ✅ `docs/brand/00-INDEX.md` | ✅ |
| 25 | `thumbnail.html` / `.thumbnail` | preview tile | none | ❌ cosmetic, ignore |
| 26 | `uploads/` | source briefs | ✅ `specs/`, issue threads | ✅ |

**Score:** 15 ✅ (5 of them ahead of the reference) · 6 🟡 · 5 ❌ (one cosmetic).

## 3. Your named categories, answered one by one

You listed the reference's categories explicitly. Direct status for each:

| You named | Status | Where |
|---|---|---|
| Brand assets | ✅ logos/favicon/social done; ❌ **no illustration/hero art set** | `assets/brand/` |
| Motion tokens | ✅ | `tokens.css` §9 |
| Colors — primary | ✅ | `--ino-color-accent` (violet `#7C5CFC`) |
| Colors — secondary | ✅ | `--ino-color-accent-secondary` (indigo `#4F46E5`), plus `-text-safe` variant per theme |
| Colors — status | ✅ | RAG semantic set, all three themes, ratios measured |
| Colors — surface | ✅ | `surface` / `-raised` / `-sunken` / `overlay-scrim` |
| Components | ✅ 14 built | `web/src/app/components/` |
| Mobile app | ✅ 13 screens × 3 tracks | `mobile/{capacitor,react-native,flutter}/` |
| Spacing | ✅ | `tokens.css` §5 |
| Typography | ✅ Latin; ❌ **no Devanagari/Indic fallback** (see §5) | `tokens.css` §4 |
| Website page samples | ✅ 14 routes | `web/src/app/pages/` |
| Cards | ✅ `<ino-card>` (default/sunken/overlay) + `<ino-tier-card>` + `<ino-metric-panel>` | `web/src/app/components/` |

**One naming note worth flagging:** we call the brand color `accent` / `accent-secondary`, the
reference calls it `primary` / `secondary`. Ours is deliberate (the surface is near-black
monochrome; the violet is an *accent* on it, not a dominant primary), but if you prefer the
conventional `primary`/`secondary` vocabulary for external/partner-facing docs, that's a one-line
alias block in the token file and a rename in the README — say the word.

## 4. Component inventory — us vs. the reference

Reference has 22 components; we have 14 shared + 4 mobile-only. Head to head, ignoring
e-Cheque's domain-specific ones (ChequeCard, AmountDisplay, MICR, PinPad, BiometricPrompt,
OTPInput — those are their product, not ours):

| Generic component | Reference | INOVIXUX |
|---|---|---|
| Button | ✅ | ✅ |
| Input / Textarea | ✅ ✅ | ✅ / ❌ no textarea |
| Select | ✅ | ✅ |
| MultiSelect | ✅ | ❌ |
| NumberInput | ✅ | ❌ |
| Checkbox / Radio / Switch | ✅ | ✅ / ✅ / ✅ (`toggle`) |
| Card | ✅ | ✅ |
| Badge / Chip | ✅ | 🟡 markup only, no component |
| Avatar | ✅ | ❌ |
| Alert | ✅ | ✅ |
| Spinner / Skeleton | ✅ / ❌ | ❌ / ❌ |
| Toast | ❌ | ✅ ahead |
| Modal / Sheet | ❌ | ✅ ahead |
| Tabs | ✅ | ❌ |
| BottomNav / Tab bar | ✅ | ✅ (mobile tracks) |
| Nav / Hero / FeatureGrid / MetricPanel / TierCard / Footer | ❌ | ✅ ahead (marketing-surface set) |
| Table | ❌ | ❌ — **both missing; we need it more** (KYB risk-flag tables are the MVP's core screen) |

**Net missing components:** Table, Tabs, Avatar, Badge/Chip, Skeleton, Empty state (web), Textarea,
NumberInput, MultiSelect, Pagination. These are exactly the `⬜` rows already standing in
`12-branding-completeness-checklist.md` §3 — reading the reference did not surface a component
category we hadn't already identified. It did confirm the priority: **Table first**, since it is
the one thing the KYB MVP cannot ship without.

## 5. What's missing under branding that you did *not* ask about

You asked to be told what you missed. The reference doesn't cover these either — they're
company-brand categories that a product design system simply doesn't include. Ordered by how much
each would actually cost us to keep deferring:

**High — blocks or degrades near-term work**

1. **Data-visualization palette.** Zero coverage (`tokens.css` mentions "chart strokes" once, in
   passing). A KYB risk product is charts and risk matrices. Needs: categorical series palette,
   sequential + diverging ramps, and a colorblind-safe check — across all three themes. Deferring
   this means every dashboard invents its own colors.
2. **Table / dense data component.** Called out above. The dense-mode row-height token exists; no
   component consumes it.
3. **Devanagari + Indic script typography.** Geist has no Devanagari coverage. India/APAC with
   India Stack alignment means Hindi at minimum, and realistically a Noto Sans Devanagari pairing
   with a matched vertical rhythm. Right now a Hindi string falls back to whatever the OS picks
   and breaks our line-height contract.
4. **Report / PDF export theme.** The KYB deliverable *is* a structured risk-flag report a human
   signs off on. That artifact has no brand treatment — no header/footer, no typographic spec, no
   print color profile, no INO-14 disclaimer lockup. This is arguably the single most
   customer-visible brand surface we have and it's unbuilt.
5. **Design-system adherence lint** (matrix row 22). Without it, every component added from here
   drifts a little further from the tokens, and parity checking won't catch it.

**Medium — needed before anything external-facing**

6. **Email design system** — transactional template (verification, approval-requested, report-ready)
   + HTML email signature block. Nothing exists.
7. **Brand guidelines PDF** — the single distributable file a vendor, printer, or partner gets.
   All our guidance is repo-internal markdown. *(Gated on INO-82.)*
8. **Print color specification** — CMYK and Pantone equivalents of the violet/indigo accent.
   Screen hex does not survive a press run. *(Gated on INO-82.)*
9. **Social profile kit** — LinkedIn/X banner, avatar crops, post/announcement templates.
10. **Motion specimen** — tokens exist, but there is no rendered page showing what the durations
    and easings actually *look* like. The reference has `guidelines/motion.card.html`; we have
    nothing you can watch.
11. **Imagery/illustration direction** — already `⬜` in the checklist; the reference's
    `brand-hero.svg` / `brand-illustration.svg` confirm it's a real category, not optional polish.
12. **App store listing assets** — screenshots, feature graphic, store copy, for three tracks.

**Lower — real, but safely deferrable**

13. **Trademark / domain / handle audit** — India TM classes 9 & 42, domain + social handle
    availability for "INOVIXUX". Cheap now, expensive to discover late. *(Partly gated on INO-82.)*
14. **Sound & haptics** — mobile approval/rejection feedback. Matters for a human-in-the-loop
    approval product; not urgent pre-MVP.
15. **Accessibility statement** — a public VPAT-style page. Legal routes exist to hang it on.
16. **Design system versioning & release** — semver the token contract, publish
    `06-angular-components/` as a real package instead of a mirrored folder.
17. **Figma library** — still blocked on you authorizing the Figma connector (see `00-INDEX.md` §5).

## 6. On the reference folder itself

I have **not** copied `~/Downloads/e-Cheque Design System` into this repo. It is a different
company's brand (indigo/Plus Jakarta Sans/RBI cheque domain) and ~3 MB of it is two standalone
prototype HTML files. Vendoring it would put a competing color system inside our brand repo where
it can be copied from by accident. Its *structural* lessons are captured in §2 above, which is the
part that transfers. If you'd rather have it in-repo for reference, say so and it goes into
`docs/references/echeque/` with a README making clear it is not ours.

## 7. Sequenced backlog out of this analysis

Grouped so each is a self-contained child issue. None of 1–6 is blocked by INO-82.

| # | Work | Closes |
|---|---|---|
| 1 | **Data-viz token layer** — categorical/sequential/diverging palettes × 3 themes, colorblind-checked, wired into parity script | §5.1 |
| 2 | **`<ino-table>` + `<ino-badge>` + `<ino-skeleton>` + `<ino-empty-state>`** — the dense-data set the KYB MVP needs | §4, §5.2 |
| 3 | **DS packaging layer** — split `tokens/` + `styles.css` entry, `design-system.manifest.json`, `SKILL.md` agent descriptor | matrix rows 1, 2, 20, 23 |
| 4 | **Per-component contracts** — `X.contract.md` (props/variants/states) + usage examples for all 14 components; generated where possible, not hand-maintained | matrix rows 16, 17 |
| 5 | **Foundation specimen cards** — decompose `style-guide.html` into 12 embeddable cards incl. a live motion specimen | matrix row 13, §5.10 |
| 6 | **Adherence lint** — fail CI on raw hex / off-scale spacing / non-token radius in component source | matrix row 22, §5.5 |
| 7 | **Indic typography pairing** — Noto Sans Devanagari, matched rhythm, fallback chain, across all tracks | §5.3 |
| 8 | **Report/PDF brand theme** — the KYB risk-flag report as a designed artifact | §5.4 |
| 9 | **Email design system** — transactional templates + signature | §5.6 |
| 10 | *(blocked on INO-82)* Brand guidelines PDF, CMYK/Pantone spec, print-ready vector exports, TM/domain audit | §5.7, §5.8, §5.13 |

## 8. Bottom line

We were not *supposed to* reproduce the e-Cheque folder — it's another product's brand. Measured
on structure rather than content, we are **ahead** of it on tokens (3 themes vs 1, cross-platform
parity enforcement), on surfaces (real apps on four platforms vs. two prototypes), and on
governance (versioning rules, WCAG audit trail, INO-14 enforcement). We are **behind** it on
packaging: a consumer or an agent can't pick our system up and use it without reading the source,
because there's no manifest, no skill descriptor, no per-component contract, and no lint holding
the line. Items 3–6 in §7 close that in full and none of them wait on the logo.

---

*Prepared 2026-09-14 against the reference folder as read at that date (172 files). Supersedes the
"folder could not be read" notes in `12-branding-completeness-checklist.md` §7 and
`11-dark-light-mobile-accessibility.md` §9.*
