# INOVIXUX — React Native track (INO-89)

Standalone React Native codebase per `docs/brand/13-mobile-app-patterns.md` §5. No code reuse
from `web/` (Angular) by design — this re-implements the same token contract and screen templates
natively, per the board's "all three frameworks in parallel" decision on INO-85.

## What's built this round

- **Token contract** (`src/theme/tokens.ts`) — full port of `tokens.css`'s dark + light semantic
  roles, spacing, radius, touch targets, fluid-density row height, type scale, and motion
  durations/easings. Follows `tokens.css`, never edited independently of it.
- **Theming** (`src/theme/ThemeProvider.tsx`) — OS `prefers-color-scheme` default with an explicit
  in-app override persisted to `AsyncStorage`, mirroring `web/src/app/services/theme.service.ts`
  per `13-mobile-app-patterns.md` §3. Wired live into the Settings screen.
- **Navigation shell** (`src/navigation/RootNavigator.tsx`) — bottom tab bar (Home, Notifications,
  Settings) + a native stack inside the Home tab (Home → Detail), per §1's "bottom tabs, stack for
  secondary nav" rule. Icons: Lucide via `lucide-react-native`, per `docs/brand/14-icon-system.md`.
- **All 13 screens in `docs/brand/15-mobile-screen-inventory.md` §1 are real, running screens**
  (`src/screens/`), each a real call site for its `13-mobile-app-patterns.md` §2 template, not
  just a file on disk:
  - `SignInScreen.tsx` + `ForgotPasswordScreen.tsx` — Auth/onboarding template (rows 3–4), wired
    stack push: Sign in's "Forgot password?" link navigates to the reset-password screen.
  - `OnboardingScreen.tsx` — Auth/onboarding template, 1–3 step variant (row 2): paged intro with
    a Skip action and a dot indicator.
  - `HomeScreen.tsx` + `DetailScreen.tsx` — List → Detail template pair (rows 5–7), wired with
    real stack navigation and placeholder rows (no real product data — see note below).
  - `SearchScreen.tsx` — List template + search-input header (row 8), pushed from `HomeScreen`'s
    header search action; falls back to the Empty-state template when a query has no matches.
  - `NotificationsScreen.tsx` — List template rendered via the Empty-state template (rows 9, 12),
    using the shared `EmptyState` component.
  - `SettingsScreen.tsx` — Settings/account template (row 10), with the one genuinely live piece
    of state in this scaffold: the theme override control. A second "Preview" section pushes
    Onboarding, Sign in, and Error/offline — the templates that don't have a natural in-app entry
    point yet (they live pre-tab-bar, behind a signed-out state this scaffold doesn't model).
  - `ConfirmActionSheet.tsx` (`src/components/`) — Modal/bottom-sheet template (row 11), an
    overlay rather than a nav destination per the inventory doc; wired to `DetailScreen`'s Delete
    action as a real call site.
  - `ErrorOfflineScreen.tsx` — Empty-state template, offline/error copy+icon variant (row 13).
  - Splash (row 1) is the app-icon/splash export below, not a screen component.
- **App icon / splash export** (`assets/`, `app.json`) — `icon.png`, `adaptive-icon.png`,
  `splash-icon.png`, `favicon.png` rasterized from `assets/brand/logo/inovixux-icon-b2c.svg`
  (INO-82) at the 1024×1024 source resolution Expo's build pipeline (`expo prebuild`) consumes to
  generate the full Xcode `Images.xcassets` AppIcon set and Android
  `mipmap`/`adaptive-icon` directories — see `scripts/gen-app-icons.py` for how (no SVG rasterizer
  was available in this sandbox, so the glyph's own path/gradient coordinates were reproduced
  directly). `app.json` wires them in, backgrounded with `--ino-color-surface` dark
  (`#0A0A0A`) per `tokens.css`. Re-run the script if `inovixux-icon-b2c.svg` ever changes.

## What's deliberately not done yet

- **Tab slot 2** ("second core surface") — intentionally left out of `RootNavigator.tsx` rather
  than invented. Per the inventory doc §2, naming it is a product-scope question, not a branding
  decision, and out of this track's remit.
- **Placeholder content**: `HomeScreen`/`SearchScreen`'s list rows and `DetailScreen`'s fields are
  dummy data. Real data wiring is backend/product work, not part of the design-system build.
- **No signed-out gate**: the main tab bar renders directly; Onboarding/Sign in/Error-offline are
  reachable from Settings → Preview instead of a real auth flow, since there's no backend to gate
  against yet. Same boundary as the placeholder-content note above.
- **Native project files** (`ios/`, `android/` folders) — not generated (no Expo CLI `prebuild`
  run here). Standing this up for a real device/simulator run is `npx expo prebuild`, which is
  also what turns `app.json` + `assets/*.png` into the actual per-size Xcode/Android icon and
  splash assets.

## Running

`npm install` (verified: installs clean, `npm run typecheck` passes) then `npm run ios` (or
`npm run android`). Device/simulator boot itself wasn't verified in this sandbox (no Xcode/Android
SDK here).
