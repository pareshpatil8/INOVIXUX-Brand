# INOVIXUX — Flutter track (INO-90)

Standalone Flutter/Dart codebase per `docs/brand/13-mobile-app-patterns.md` §5. No code reuse
from `web/` (Angular) or the sibling `capacitor`/`react-native` tracks by design — this
re-implements the same token contract and screen templates in Dart/Flutter widgets, per the
board's "all three frameworks in parallel" decision on INO-85.

## What's built

- **Token contract** (`lib/theme/tokens.dart`) — full port of `tokens.css`'s dark + light semantic
  roles as `InoPalette` (a `ThemeExtension`), plus spacing, radius, touch targets, fluid-density
  row height, and motion durations/curves. Follows `tokens.css`, never edited independently.
- **Theme wiring** (`lib/theme/app_theme.dart`, `theme_controller.dart`) — `ThemeData` built from
  `InoPalette`; default `ThemeMode.system` (OS `prefers-color-scheme`) with an explicit in-app
  override persisted via `SharedPreferences`, mirroring `web/src/app/services/theme.service.ts`
  per `13-mobile-app-patterns.md` §3. Wired live into the Settings screen.
- **Navigation shell** (`lib/navigation/root_shell.dart`) — bottom nav bar (Home, Notifications,
  Settings) via `IndexedStack` + `BottomNavigationBar`, per §1's "bottom tabs" rule; stack pushes
  (Home → Detail, Home → Search, Sign in → Forgot password) for everything secondary, not
  tabs-within-tabs. Icons: Lucide via the `lucide_icons` package, per
  `docs/brand/14-icon-system.md`.
- **All 13 screens** from `docs/brand/15-mobile-screen-inventory.md` §1, each a real, running
  widget rather than a stub:
  1. **Splash** — no in-app widget (platform-native launch screen); see app-icon/splash export
     below.
  2. **Onboarding** (`onboarding_screen.dart`) — 3-step `PageView`, Skip action, dot indicator.
  3. **Sign in** (`sign_in_screen.dart`).
  4. **Forgot password** (`forgot_password_screen.dart`) — pushed from Sign in.
  5/6. **Home / generic list** (`home_screen.dart`) — same List template serves both inventory
     rows; placeholder rows (no real product data — see note below).
  7. **Detail** (`detail_screen.dart`) — sunken read-only section, wired to the Modal-action
     template (row 11) via a real Delete call site.
  8. **Search / filter** (`search_screen.dart`) — pushed from Home's header search action; List
     template + search `TextField` header, falls back to the Empty-state template on no results.
  9. **Notifications** (`notifications_screen.dart`) — List template rendered via Empty-state
     (no backing notification source yet — see note below).
  10. **Settings / account** (`settings_screen.dart`) — the one genuinely live piece of state:
      the theme override control. Also the reachability point for screens that don't have a
      natural in-app entry in this scaffold (Onboarding, Sign in, Error/offline) under a
      "Preview" section, so every inventory row is a running widget, not just a file on disk.
  11. **Modal actions** (`widgets/confirm_action_sheet.dart`) — `showConfirmActionSheet`, a
      bottom-sheet confirm/delete, called from Detail's Delete button.
  12. **Empty state** (`widgets/empty_state.dart`) — shared by Notifications (row 9) and
      Search's no-results state.
  13. **Error / offline** (`error_offline_screen.dart`) — reuses `EmptyState` per the inventory
      doc's own note ("reuses the empty-state template rather than inventing a new one"),
      reachable from Settings → Preview.
- **App icon / splash export** (`scripts/gen_app_icons.py`, `assets/icon/`, `assets/splash/`) —
  rasterizes `inovixux-icon-b2c.svg` (INO-82) into the source images
  `flutter_launcher_icons`/`flutter_native_splash` (configured in `pubspec.yaml`) consume to
  generate the actual per-size iOS `Assets.xcassets` AppIcon set and Android
  mipmap/adaptive-icon directories. Same hand-rolled-rasterizer approach as
  `mobile/react-native/scripts/gen-app-icons.py` (INO-89) and for the same reason: no
  `cairo`/`rsvg`/`inkscape`/`imagemagick` available in this sandbox to render the SVG directly.
  A second script rather than shared code, per this track's "no shared code" boundary — both
  happen to rasterize the same source glyph, kept as parallel, independently-editable copies.

## What's deliberately not done yet

- **Tab slot 2** ("second core surface") — intentionally left out of `root_shell.dart` rather
  than invented; naming it is a product-scope question per the inventory doc §2, not a branding
  decision.
- **Placeholder content** — `home_screen.dart`/`search_screen.dart`'s list rows and
  `detail_screen.dart`'s fields are dummy data; `notifications_screen.dart` has no backing
  notification source. Real data wiring is backend/product work, out of this track's remit.
- **Native project scaffolding** (`android/`, `ios/` platform folders, `flutter create` output) —
  not generated in this sandbox (no Flutter SDK / `flutter create` run here).
- **Running the icon/splash generators** — `pubspec.yaml`'s `flutter_launcher_icons` and
  `flutter_native_splash` config, and their source images, are in place, but actually invoking
  them (`dart run flutter_launcher_icons`, `dart run flutter_native_splash:create`) needs the
  `android`/`ios` folders from `flutter create .` to exist first — no Flutter SDK in this
  sandbox to run either.

## Running

Not runnable as-is in this sandbox (no Flutter SDK / platform folders generated). Once set up:

```
flutter create .
flutter pub get
dart run flutter_launcher_icons
dart run flutter_native_splash:create
flutter run
```

(`flutter create .` only adds the missing `android`/`ios` platform folders — safe to run against
this existing `lib/`, doesn't touch it.)
