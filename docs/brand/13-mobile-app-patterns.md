# 13 — Mobile App Pattern Set (proposal, ahead of any screens existing)

**Responds to:** the "mobile app" line in `12-branding-completeness-checklist.md` §5, and your
instruction to define the system "in detailed for the web application, mobile application... and
our Website."

**Status:** Pattern-level proposal only — no native codebase exists to build screens *in* yet
(no React Native/Flutter/Capacitor workspace in this repo, by design, same reasoning as
`06-angular-components/README.md`'s "no target Angular workspace" note). This is the contract a
future mobile build inherits, written now so the token system doesn't have to be reverse-engineered
later. Nothing here touches the paused KYB product surface (`00-INDEX.md` §5).

---

## 1. Navigation pattern

- **Primary nav = bottom tab bar**, 3–5 items max, each tap target ≥ `--ino-target-comfortable`
  (44px) with `--ino-target-spacing` (8px) between adjacent tabs. Icon + label, never icon-only
  (WCAG 2.2 target-identification, and this audience includes non-technical vendor/compliance
  users per the brief's DPI context).
- **Secondary nav = stack push** (native back gesture/button), not tabs-within-tabs — keeps the
  fluid density's whitespace-first feel from `[data-density="fluid"]` (§6 of `11-…
  mobile-accessibility.md`) instead of cramming a second nav layer into a phone-width screen.
- **Safe areas**: tab bar bottom padding = `--ino-safe-area-bottom` + base spacing, never just the
  raw inset — matches the token's own doc comment ("always safe to consume unconditionally").

## 2. Screen templates (structural, token-mapped — not visual mockups)

| Template | Composition | Token notes |
|---|---|---|
| **Auth / onboarding** | Single-column, `ino-card` (`variant="default"`) form shell, large tap targets throughout | `--ino-target-comfortable` on every input/button; `--ino-type-display-size-sm` (38px) for the headline step, not the desktop 56px |
| **List** | Vertically stacked `ino-card` (`padding="sm"`, `interactive`) rows, or a dense list row using `--ino-row-min-height` (44px, fluid) | Row height token already exists (`tokens.css` §10, `fluid` variant) — reuse, don't invent a new row height for mobile |
| **Detail** | Header (back + title) → `ino-card` sections stacked, sunken variant for read-only/reference blocks | `variant="sunken"` for anything that should read as "reference data," e.g. a submitted document's extracted fields |
| **Modal / bottom sheet** | `ino-card` (`variant="overlay"`) sliding up from the bottom edge, full-width, `--ino-color-overlay-scrim` backdrop behind it | This is the mobile home of the overlay tokens added this round (see `11-…mobile-accessibility.md` §9) — a bottom sheet *is* an overlay card, just anchored to the bottom edge instead of centered |
| **Empty state** | Centered icon/illustration slot + headline + optional single CTA | Icon system decided (`14-icon-system.md`) — use the 32px icon row, `--ino-color-on-surface-muted` by default |
| **Settings / account** | Grouped `ino-card` sections, list-row pattern inside each group | Reuses the List template's row pattern, grouped instead of flat |

## 3. Theming on mobile

- **Default = OS `prefers-color-scheme`**, with an explicit in-app override using the same
  `ThemeService` pattern already shipped for web (`web/src/app/services/theme.service.ts`),
  backed by platform storage (`AsyncStorage`/`SharedPreferences`/Capacitor `Preferences`) instead
  of `localStorage`. No new token work — both themes are already fully audited (`11-…
  mobile-accessibility.md` §4).
- **Density is always `fluid`**, never `dense` — dense mode's 32px rows/12.5px type target a
  desktop risk-desk operator with a mouse, not a phone (already stated in `11-…
  mobile-accessibility.md` §6, restated here because it's the single most common mistake when a
  dense-mode web pattern gets ported to mobile without re-checking).

## 4. Motion

- Reuse `--ino-motion-duration-*` / `--ino-motion-easing-*` as-is — these are plain
  duration/easing values, not CSS-specific, so they map directly to whatever the native animation
  API is (Reanimated, `Animated`, Flutter `Curves`/`Duration`). Bottom-sheet enter/exit should use
  `--ino-motion-duration-base` (200ms) with `--ino-motion-easing-decelerate` on the way in and
  `--ino-motion-easing-accelerate` on the way out — standard sheet-motion convention, and the two
  easing curves already exist for exactly this split.
- Respect the platform's reduced-motion setting (`prefers-reduced-motion` equivalent:
  `AccessibilityInfo.isReduceMotionEnabled` / OS-level check) the same way the web components do —
  disable transform/slide animations, keep opacity/state changes.

## 5. What's still an open decision, not guessed here

- **Which framework** (React Native / Flutter / Capacitor wrapping the Angular web app) — still
  not decided; the tech-stack guardrail only specifies Angular for the web front end. Sent to the
  board as a confirmation on INO-85 this round (recommendation: Capacitor, since it wraps the
  Angular app already built rather than standing up a second UI stack/hiring track — but this is
  a real cost/timeline call, not a branding decision, so it's asked rather than assumed).
  Flagging this explicitly so a framework doesn't get silently assumed later.
- ~~Icon system~~ — decided, see `14-icon-system.md` (Lucide, sizing/color contract).
- ~~Screen inventory~~ — done, see `15-mobile-screen-inventory.md` (framework-agnostic; doesn't
  need the framework decision above to exist).
- **App icon / splash screen** — source mark unblocked (INO-82 shipped, `inovixux-icon-b2c.svg`
  exists), but per-platform icon/splash export still needs the framework decision (each platform's
  build tooling dictates the export sizes/format).
- **Push notification / deep-link visual patterns** — not addressed; out of scope until a
  framework decision exists to design against.
