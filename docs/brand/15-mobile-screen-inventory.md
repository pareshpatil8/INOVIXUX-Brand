# 15 — Mobile App Screen Inventory (framework-agnostic)

**Responds to:** the "screen inventory" half of INO-85 and checklist §5 ("Actual screen inventory
… ⬜"). This is the list of screens the mobile app needs and which `13-mobile-app-patterns.md` §2
template each maps to — content and structure only, no code. It does not need the framework
decision (React Native / Flutter / Capacitor, `13-mobile-app-patterns.md` §5) to exist, because
every row below cites a template that's already defined at the token/composition level, not in any
framework's syntax. Building the *actual* screens (real components, real navigation container)
still needs that decision made first.

---

## 1. Screen list

| # | Screen | Template (`13-…patterns.md` §2) | Nav placement | Notes |
|---|---|---|---|---|
| 1 | Splash | — (platform-native launch screen, not an app screen) | n/a | Blocked on final app-icon export, not this doc — `inovixux-icon-b2c.svg` exists (`10-logo-redesign-…md`) but hasn't been re-cropped to platform splash-screen specs (iOS/Android each have their own safe-zone rules) |
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
2. [second core surface — name pending product scope, not a branding decision]
3. Notifications
4. Settings

Three confirmed + one product-scope placeholder — filling slot 2 depends on what the mobile app's
core product surface actually is, which is outside this branding/design-system issue's scope
(INO-85 is explicitly the design/pattern layer, not product-requirements). Flag this as a product
question when mobile build work is scoped, not a branding blocker.

## 3. What's still needed before any screen in §1 becomes a real, running screen

1. **Framework decision** (`13-mobile-app-patterns.md` §5) — React Native / Flutter / Capacitor.
   Tracked as an open confirmation on INO-85; nothing in this doc is framework-specific, so
   whichever answer lands, this inventory and the templates it points to don't change.
2. **Buttons + form controls** (checklist §3, build order item 1) — screens 2–4, 8, and 11 all
   need real form/button components; they don't exist as reusable components yet on web either.
3. **Splash/app-icon platform export** (row 1) — needs the existing `inovixux-icon-b2c.svg`
   re-cropped to each platform's icon/splash safe-zone spec, a small follow-up once the framework
   (and its platform build tooling) is chosen.
