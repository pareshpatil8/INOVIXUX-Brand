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
- **Screen templates proven with real, running screens** (`src/screens/`):
  - `SignInScreen.tsx` — Auth/onboarding template (inventory row 3; row 4 Forgot-password pushes
    from the same shell, not yet added).
  - `HomeScreen.tsx` + `DetailScreen.tsx` — List → Detail template pair (inventory rows 5–7),
    wired with real stack navigation and placeholder rows (no real product data — see note below).
  - `NotificationsScreen.tsx` — List template rendered via the Empty-state template (inventory
    rows 9 + 12), using the shared `EmptyState` component.
  - `SettingsScreen.tsx` — Settings/account template (inventory row 10), with the one genuinely
    live piece of state in this scaffold: the theme override control.
- **App icon / splash export** (`assets/`, `app.json`) — `icon.png`, `adaptive-icon.png`,
  `splash-icon.png`, `favicon.png` rasterized from `assets/brand/logo/inovixux-icon-b2c.svg`
  (INO-82) at the 1024×1024 source resolution Expo's build pipeline (`expo prebuild`) consumes to
  generate the full Xcode `Images.xcassets` AppIcon set and Android
  `mipmap`/`adaptive-icon` directories — see `scripts/gen-app-icons.py` for how (no SVG rasterizer
  was available in this sandbox, so the glyph's own path/gradient coordinates were reproduced
  directly). `app.json` wires them in, backgrounded with `--ino-color-surface` dark
  (`#0A0A0A`) per `tokens.css`. Re-run the script if `inovixux-icon-b2c.svg` ever changes.

## What's deliberately not done yet

- **Remaining inventory screens** (`docs/brand/15-mobile-screen-inventory.md` §1): Splash (row 1,
  blocked on platform icon/splash export, not code), Onboarding steps (row 2), Forgot/reset
  password (row 4), Search/filter (row 8), Modal actions (row 11), Error/offline (row 13). Each
  maps to a template already proven above (Auth/onboarding, List, Modal/bottom sheet, Empty
  state respectively) — mechanical repetition of the existing pattern, not new capability.
- **Tab slot 2** ("second core surface") — intentionally left out of `RootNavigator.tsx` rather
  than invented. Per the inventory doc §2, naming it is a product-scope question, not a branding
  decision, and out of this track's remit.
- **Placeholder content**: `HomeScreen`'s list rows and `DetailScreen`'s fields are dummy data.
  Real data wiring is backend/product work, not part of the design-system build.
- **Native project files** (`ios/`, `android/` folders) — not generated in this sandbox (no
  `npm install` / Expo CLI run here). Standing this up for a real device/simulator run is:
  `npm install && npx expo prebuild`, which is also what turns `app.json` + `assets/*.png` into
  the actual per-size Xcode/Android icon and splash assets.

## Running

Not runnable as-is in this sandbox (no package install). Once dependencies are installed:
`npm install && npm run ios` (or `npm run android`).
