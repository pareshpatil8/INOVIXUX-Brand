# 11 — Dark Mode, Light Mode, Mobile & Accessibility (INO-31, Phase 2 continued)

**Requested 2026-09-08:** *"start working on the detailed design system with dark mode and
light mode and accessibility compliant... for the web application, mobile application... including
our Website... stick to vetra-app.vercel.app design elements."* Logo mark itself is explicitly
carved out of this scope — that's tracked as its own open-ended child issue now (see INO-31
comments, 2026-09-08); nothing here waits on the mark.

This doc covers what changed and why. It does not repeat `02-design-tokens/README.md` (the
original dark-mode contrast audit, M3-role rationale, font onboarding) — read that first if
you haven't.

---

## 1. Reference check — what "stick to vetra-app.vercel.app" actually means now

Re-fetched both reference URLs before touching tokens, since the last accent pivot (`54f6b21`)
was rejected as "still not similar to the URL I shared":

- **`vetra-app.vercel.app`** — the public marketing/pricing page is a **light-mode** SaaS site:
  white/off-white background, dark charcoal text, a cyan/teal-leaning accent, bold pricing cards,
  green positive-delta indicators, generous whitespace, 12-col grid. This reads as a different
  surface than the dark obsidian+violet/indigo "app" register the previous round pattern-matched
  from screenshots of Vetra's internal dashboard. **Both are legitimately "Vetra"** — most modern
  SaaS products run a light marketing site and a dark product/app shell. That maps directly onto
  what was asked for here: **light mode for the public website, dark mode for the product/app
  surfaces** — not a contradiction to resolve, a split to formalize. Section 2 below does that.
- **`claude.ai/design/p/04007fcc-...`** (the sample system referenced as "I need such a defined
  system in detail") — **could not be fetched**: the link returns HTTP 403 (it's a private
  claude.ai share tied to your login, not publicly reachable). If you want its specifics folded
  in directly, the fastest path is exporting it (PDF/screenshot, or pasting the token values as
  text/a comment) rather than re-sharing the same link — it'll 403 for the same reason next time
  too. In its absence, this system continues using the same two public, well-documented reference
  frameworks it was already built on: **Material Design 3's role-token model** (surface/on-surface/
  primary/on-primary — see `02-design-tokens/README.md` §"Why M3 roles") and **WCAG 2.2** for
  every accessibility number below. Both are exactly what a well-built internal design system
  (Claude's own included) would itself be built on, so this isn't a guess at what's behind that
  link — it's the same foundation most credible systems converge on.

## 2. Theme model

Two tokens govern every surface, independently combinable:

- **`[data-theme]`** — `dark` (default, no attribute) or `light`. Governs color roles only.
- **`[data-density]`** — `dense` (B2B/G2B risk dashboards) or `fluid` (B2C). Governs spacing/type
  size only. Unchanged from Phase 2; documented in `02-design-tokens/README.md`.

| Surface | Default theme | Rationale |
|---|---|---|
| Public marketing website | **Light** | Matches the Vetra marketing-page register; also the safer accessibility default for long-form reading content and print-adjacent contexts (letterhead/deck already print on white). |
| KYB underwriting dashboard (dense mode) | **Dark**, light available | Dense risk tables were designed dark-first (`03-vetra-structural-foundation.md`); an underwriter working a long shift can still opt into light via the same toggle — see §5. |
| Mobile app (fluid mode) | **Follows OS setting** | `prefers-color-scheme` is the correct default on mobile, where the OS already carries an explicit user choice; see §3. |

No surface is hard-locked to one theme in code — `[data-theme="light"]` and `[data-theme="dark"]`
are both always-valid attribute values on any container. The table above is the *recommended
default per surface*, enforced by what each app sets on load, not a technical restriction.

## 3. Token contract additions (`02-design-tokens/tokens.css`, mirrored into `web/src/tokens.css`)

- **New `[data-theme="light"]` block** — full semantic-role override set (surface, on-surface,
  border, accent, success/warning/danger, RAG fill/on-fill, elevation). Every pair re-audited for
  the light surface specifically — light and dark do not share a contrast budget, so dark-mode
  ratios were never assumed to carry over. Full numbers in §4.
- **New `--ino-color-accent-text-safe` role** — dark mode and light mode point this at different
  primitives (`violet-500` vs `indigo-500`) because `violet-500` text-on-white only clears 4.38:1
  (fails AA body text, passes AA for large text/non-text UI at 3:1), while `indigo-500` clears
  6.29:1 on white. Any accent-colored **text or filled-button label** should bind to
  `--ino-color-accent-text-safe`, never `--ino-color-accent` directly, on light surfaces.
  `--ino-color-accent` itself stays reserved for gradients/glow/icons/large decorative type in
  both themes.
- **Darkened RAG/status primitives for light mode** (`green-700`, `amber-800`, `red-600`) — the
  dark-mode `-500` values pair with **black** text at 6+:1; on a light/white surface the same
  `-500` values only clear 3.1–3.5:1 against white, which fails AA text. Darkening the fill
  (not lightening the text) keeps white as the on-fill color in both themes, so RAG badge markup
  never branches per theme — only the CSS variable resolution changes.
- **`@media (prefers-color-scheme: light)` fallback**, scoped to `:root:not([data-theme])` — only
  fires before any explicit choice exists (first visit, before ThemeService/localStorage has run).
  Any explicit `data-theme` attribute always wins over it.
- **New touch-target tokens**: `--ino-target-min` (24px, WCAG 2.2 §2.5.8 AA floor) and
  `--ino-target-comfortable` (44px, iOS HIG / Android Material minimum). Dense-mode tables use
  `-min` only where unavoidable (see `03-vetra-structural-foundation.md`'s existing 32px row
  height, already above the floor); every mobile-app primary control uses `-comfortable`.
- **New safe-area-inset tokens** (`--ino-safe-area-{top,right,bottom,left}`) — `env()`-backed,
  fall back to `0px` automatically, for iOS/Android notch and gesture-nav clearance on the mobile
  app and mobile-web PWA install.

## 4. WCAG 2.2 AA contrast audit — light mode (new)

All ratios computed via the WCAG relative-luminance formula, not eyeballed (same method as the
existing dark-mode audit in `02-design-tokens/README.md`).

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| `on-surface` (`#14141A`) on `surface` (`#FAFAFA`) | 17.58:1 | 4.5:1 | ✅ AAA |
| `on-surface-muted` (`#55555C`) on `surface` | 7.08:1 | 4.5:1 | ✅ AAA |
| `accent-text-safe` (indigo `#4F46E5`) on `surface` | 6.29:1 | 4.5:1 | ✅ AA+ |
| white `on-accent` on `accent-text-safe` | 6.29:1 | 4.5:1 | ✅ AA+ |
| `accent` (violet `#7C5CFC`) on white — **non-text/large-text use only** | 4.38:1 | 3:1 (non-text/large) | ✅ passes non-text floor; ⚠️ do not use for body-size text |
| white `on-success` on `success` (`#1F7A4F`) | 5.31:1 | 4.5:1 | ✅ AA |
| white `on-warning` on `warning` (`#8A5D1E`) | 5.73:1 | 4.5:1 | ✅ AA |
| white `on-danger` on `danger` (`#A6362D`) | 6.59:1 | 4.5:1 | ✅ AA |
| RAG high fill/on-fill | 6.59:1 | 4.5:1 | ✅ AA |
| RAG medium fill/on-fill | 5.73:1 | 4.5:1 | ✅ AA |
| RAG low fill/on-fill | 5.31:1 | 4.5:1 | ✅ AA |

Every text/on-fill pairing clears AA (4.5:1); most clear AAA (7:1). The one deliberate exception
(`accent` at 4.38:1) is restricted by convention (naming + this doc) to non-text/large-text/
decorative use, exactly mirroring how dark mode already restricts `on-surface-subtle`.

## 5. Angular integration — `ThemeService` (new, shipped this round)

- `web/src/app/services/theme.service.ts` — signal-based, `providedIn: 'root'`. `toggle()` and
  `set('dark' | 'light')`; persists to `localStorage['ino-theme']`; writes/removes
  `data-theme="light"` on `<html>`. Wrapped in try/catch around storage access — never throws if
  storage is disabled (private browsing, or a locked-down regulator machine per the brief's
  fallback-font precedent).
- **No flash of the wrong theme**: a ~15-line inline script in `web/src/index.html`, before any
  stylesheet, reads `localStorage` → `prefers-color-scheme` → dark, and sets the attribute
  synchronously pre-paint. `ThemeService` reads whatever that script already set as its initial
  value on bootstrap; it doesn't re-decide.
- **Toggle control**: added to `<ino-nav>` (every page carries it) — icon button, 44px hit area
  (`--ino-target-comfortable`) with an 18px visible glyph, `aria-pressed` + `aria-label` reflecting
  current state, keyboard-focusable, `:focus-visible` ring via the existing border-color pattern.
- Component contract unchanged for every *other* component — they already bind to semantic
  role variables (`--ino-color-surface`, etc.), never raw hex, so dark→light repainting is free.
  Verified via `ng build` (production config) after the change — build passes, no new warnings.

## 6. Mobile app guidance (native + mobile-web)

No native app exists to point at yet (MVP is web-first per the KYB brief), so this section is
**forward-looking contract**, written so a future React Native/Flutter/Capacitor build inherits
the same system instead of inventing its own:

- **Density**: mobile app = `[data-density="fluid"]` always (never dense — dense mode's 32px row
  height and 12.5px body text target desktop risk-desk operators with a mouse, not a phone).
- **Touch targets**: every primary control ≥ `--ino-target-comfortable` (44px); never rely on the
  24px WCAG floor alone on a touch surface, only on desktop pointer contexts.
- **Theme default**: OS `prefers-color-scheme`, with an in-app override (same `ThemeService`
  pattern, backed by platform storage instead of `localStorage`).
- **Safe areas**: `--ino-safe-area-*` tokens map 1:1 to iOS safe-area-insets and Android's
  equivalent gesture-nav/cutout insets when wrapped in a WebView (Capacitor/Ionic) or translated
  to the native layout system's insets directly (React Native `useSafeAreaInsets`, Flutter
  `MediaQuery.padding`) if the app goes fully native.
- **Typography**: same `--ino-font-display` stack; system fallback (`system-ui`) already resolves
  to San Francisco on iOS / Roboto on Android with zero extra work.

## 7. What did not change

- Dark-mode values in `02-design-tokens/tokens.css` §2 — byte-identical to the pre-existing
  Adaptive Synapse accent pivot (`54f6b21`). This round is additive only.
- Density-mode tokens (§10 in the token file) — orthogonal to theme, untouched.
- Logo mark — explicitly out of scope this round (see top of this doc).

## 8. Files touched this round

- `web/src/tokens.css`, `docs/brand/02-design-tokens/tokens.css` — light-mode block, touch-target
  tokens, safe-area tokens (previously drifted out of sync with each other; re-synced here — the
  docs copy had been stuck on the pre-`54f6b21` Signal Blue values).
- `web/src/app/services/theme.service.ts` — new.
- `web/src/app/components/nav/ino-nav.component.{ts,html,scss}` — theme toggle control.
- `web/src/index.html` — pre-paint theme script.
- This doc.
