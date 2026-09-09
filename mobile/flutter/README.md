# INOVIXUX — Flutter track (INO-90)

Standalone Flutter/Dart codebase per `docs/brand/13-mobile-app-patterns.md` §5. No code reuse
from `web/` (Angular) or the React Native track by design — this re-implements the same token
contract and screen templates in Dart/Flutter widgets, per the board's "all three frameworks in
parallel" decision on INO-85.

## What's built this round

- **Token contract** (`lib/theme/tokens.dart`) — full port of `tokens.css`'s dark + light semantic
  roles as `InoPalette` (a `ThemeExtension`), plus spacing, radius, touch targets, fluid-density
  row height, and motion durations/curves. Follows `tokens.css`, never edited independently.
- **Theme wiring** (`lib/theme/app_theme.dart`, `theme_controller.dart`) — `ThemeData` built from
  `InoPalette`; default `ThemeMode.system` (OS `prefers-color-scheme`) with an explicit in-app
  override persisted via `SharedPreferences`, mirroring `web/src/app/services/theme.service.ts`
  per `13-mobile-app-patterns.md` §3. Wired live into the Settings screen.
- **Navigation shell** (`lib/navigation/root_shell.dart`) — bottom nav bar (Home, Notifications,
  Settings) via `IndexedStack` + `BottomNavigationBar`, per §1's "bottom tabs" rule; Home →
  Detail uses `Navigator.push` for secondary/stack nav, not tabs-within-tabs. Icons: Lucide via
  the `lucide_icons` package, per `docs/brand/14-icon-system.md`.
- **Screen templates proven with real, running widgets** (`lib/screens/`):
  - `sign_in_screen.dart` — Auth/onboarding template (inventory row 3; row 4 Forgot-password
    pushes from the same shell, not yet added).
  - `home_screen.dart` + `detail_screen.dart` — List → Detail template pair (inventory rows 5–7),
    wired with real push navigation and placeholder rows (no real product data — see note below).
  - `notifications_screen.dart` — List template rendered via the Empty-state template (inventory
    rows 9 + 12), using the shared `EmptyState` widget.
  - `settings_screen.dart` — Settings/account template (inventory row 10), with the one genuinely
    live piece of state in this scaffold: the theme override control.

## What's deliberately not done yet

- **Remaining inventory screens** (`docs/brand/15-mobile-screen-inventory.md` §1): Splash (row 1,
  blocked on platform icon/splash export, not code), Onboarding steps (row 2), Forgot/reset
  password (row 4), Search/filter (row 8), Modal actions (row 11), Error/offline (row 13). Each
  maps to a template already proven above — mechanical repetition of the existing pattern, not
  new capability.
- **Tab slot 2** ("second core surface") — intentionally left out of `root_shell.dart` rather
  than invented; naming it is a product-scope question per the inventory doc §2, not a branding
  decision.
- **Placeholder content**: `home_screen.dart`'s list rows and `detail_screen.dart`'s fields are
  dummy data. Real data wiring is backend/product work, out of this track's remit.
- **Native project scaffolding** (`android/`, `ios/` platform folders, `flutter create` output) —
  not generated in this sandbox (no Flutter SDK / `flutter create` run here). Standing this up for
  a real device/simulator run needs `flutter create .` from this directory (safe — it only adds
  the missing platform folders, doesn't touch `lib/`) followed by `flutter pub get`.
- **App icon / splash export** at Flutter/iOS/Android config sizes from `inovixux-icon-b2c.svg` —
  tooling work, not yet done.

## Running

Not runnable as-is in this sandbox (no Flutter SDK / platform folders generated). Once set up:
`flutter create . && flutter pub get && flutter run`.
