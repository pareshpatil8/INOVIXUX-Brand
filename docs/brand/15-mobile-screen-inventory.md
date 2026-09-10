# 15 — Mobile App Screen Inventory (framework-agnostic)

**Responds to:** the "screen inventory" half of INO-85 and checklist §5 ("Actual screen inventory
… ⬜"). This is the list of screens the mobile app needs and which `13-mobile-app-patterns.md` §2
template each maps to — content and structure only, no code. It does not need the framework
decision (React Native / Flutter / Capacitor, `13-mobile-app-patterns.md` §5) to exist, because
every row below cites a template that's already defined at the token/composition level, not in any
framework's syntax. Building the *actual* screens (real components, real navigation container)
still needs that decision made first.

**Status (2026-09-10):** every row below is now built on all three framework tracks — see §4 for
the as-built file map. The framework decision (all three, in parallel) and the icon system are
both resolved; §3's prerequisites are closed out.

---

## 1. Screen list

| # | Screen | Template (`13-…patterns.md` §2) | Nav placement | Notes |
|---|---|---|---|---|
| 1 | Splash | — (platform-native launch screen, not an app screen) | n/a | Exported per platform from `inovixux-icon-b2c.svg` (`10-logo-redesign-…md`) by each track's `scripts/gen*app*icon*` generator — see §4 |
| 2 | Onboarding (1–3 steps) | Auth / onboarding | Pre-tab-bar, own stack | Uses `--ino-type-display-size-sm`, large tap targets throughout per template |
| 3 | Sign in / Sign up | Auth / onboarding | Pre-tab-bar, own stack | Same template as onboarding, different form fields |
| 4 | Forgot / reset password | Auth / onboarding | Pushed from Sign in | Stack push, not a tab |
| 5 | Home / dashboard | List (cards) | Tab 1 | `ino-card` rows, `interactive` |
| 6 | List (generic — vendor list, document list, etc.) | List | Tab or pushed from Home | Reuse dense row token (`--ino-row-min-height`, fluid) if the list is long |
| 7 | Detail (item opened from a List) | Detail | Stack push from List | `variant="sunken"` sections for read-only/reference data |
| 8 | Search / filter | List (with a search-input header) | Pushed, usually from a List's header action | No new template — List + a form-control header once buttons/forms (checklist §3) exist |
| 9 | Notifications | List | Tab or pushed from a bell icon | Empty state applies when there are none (see row 12) |
| 10 | Settings / account | Settings / account | Tab (last position, per the "3–5 items" cap in §1) | Grouped `ino-card` sections |
| 11 | Modal actions (confirm/delete, quick-create) | Modal / bottom sheet | Overlay, not a nav destination | `variant="overlay"`, `--ino-color-overlay-scrim` backdrop |
| 12 | Empty state (no data yet, e.g. empty list/notifications) | Empty state | Rendered inside whichever tab/screen has no content | Now unblocked — icon source decided (`14-icon-system.md`), use the 32px icon row |
| 13 | Error / offline | Empty state (same composition, different copy+icon) | Rendered inside whichever screen failed to load | Reuses the empty-state template rather than inventing a new one |

## 2. Tab bar (bottom nav) composition

Per `13-mobile-app-patterns.md` §1 (3–5 items, icon + label, ≥44px targets, 8px spacing):

1. Home
2. Notifications
3. Settings

**As built (all three tracks):** three tabs, not four. The original slot-2 placeholder ("second
core surface — name pending product scope") was left unfilled rather than invented: naming it
needs product scope, which is outside this design-system issue. Three items still satisfies the
§1 "3–5 items" rule, so the tab bar ships as-is and slot 2 gets added when the mobile app's core
product surface is defined — a product question, not a branding blocker.

Search is a **header action pushed from Home**, not a tab, on all three tracks
(`HomeScreen.tsx` header `actions`, `home_screen.dart` `IconButton`, `home.component.html`
`.home__search-action`). Detail is likewise a stack push from Home, per §1 rows 7–8.

## 3. Prerequisites — all closed

1. ~~**Framework decision**~~ ✅ (`13-mobile-app-patterns.md` §5) — board answered *all three*,
   built in parallel, one folder per framework. Nothing in this doc was framework-specific, so
   the inventory and templates it points to did not change.
2. ~~**Buttons + form controls**~~ ✅ (checklist §3) — shipped on web under INO-83
   (`web/src/app/components/{button,input,select,checkbox,radio-group,toggle,modal,alert,toast-container}`);
   each mobile track re-implements the same token contract in its own idiom.
3. ~~**Splash/app-icon platform export**~~ ✅ (row 1) — `inovixux-icon-b2c.svg` re-cropped to each
   platform's icon/splash safe-zone spec by a per-track generator script (§4).

## 4. As-built coverage (2026-09-10)

Every §1 row, per framework track. Rows 6 and 11 have no route of their own by design — the §1
notes for those rows say "no new template", so they reuse Home's list rows and the shared
confirm-action-sheet respectively.

| # | Screen | Capacitor (`mobile/capacitor/`) | React Native (`mobile/react-native/`) | Flutter (`mobile/flutter/`) |
|---|---|---|---|---|
| 1 | Splash / app icon | `resources/{icon,icon-foreground,icon-background,splash,splash-dark}.png` | `assets/{icon,adaptive-icon,splash-icon,favicon}.png` | `assets/icon/app_icon_1024.png`, `assets/splash/splash_logo_1024.png` |
| 2 | Onboarding | `app/src/app/pages/onboarding/` | `src/screens/OnboardingScreen.tsx` | `lib/screens/onboarding_screen.dart` |
| 3 | Sign in / Sign up | `pages/sign-in/` | `src/screens/SignInScreen.tsx` | `lib/screens/sign_in_screen.dart` |
| 4 | Forgot / reset password | `pages/forgot-password/` | `src/screens/ForgotPasswordScreen.tsx` | `lib/screens/forgot_password_screen.dart` |
| 5 | Home / dashboard | `pages/home/` | `src/screens/HomeScreen.tsx` | `lib/screens/home_screen.dart` |
| 6 | List (generic) | *(Home list rows — no separate route)* | *(Home list rows)* | *(Home list rows)* |
| 7 | Detail | `pages/detail/` (`home/:id`) | `src/screens/DetailScreen.tsx` | `lib/screens/detail_screen.dart` |
| 8 | Search / filter | `pages/search/` | `src/screens/SearchScreen.tsx` | `lib/screens/search_screen.dart` |
| 9 | Notifications | `pages/notifications/` | `src/screens/NotificationsScreen.tsx` | `lib/screens/notifications_screen.dart` |
| 10 | Settings / account | `pages/settings/` | `src/screens/SettingsScreen.tsx` | `lib/screens/settings_screen.dart` |
| 11 | Modal actions | `components/confirm-action-sheet/` | `src/components/ConfirmActionSheet.tsx` | `lib/widgets/confirm_action_sheet.dart` |
| 12 | Empty state | `components/empty-state/` | `src/components/EmptyState.tsx` | `lib/widgets/empty_state.dart` |
| 13 | Error / offline | `pages/error-offline/` | `src/screens/ErrorOfflineScreen.tsx` | `lib/screens/error_offline_screen.dart` |

Shared per-track scaffolding (nav shell, screen template, theming, token port) is listed in each
track's `README.md`. Builds are tracked on INO-88 (Capacitor), INO-89 (React Native), INO-90
(Flutter) — all three closed.
