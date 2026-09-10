# INOVIXUX — Capacitor track (INO-88)

Wraps the existing Angular web app per `docs/brand/13-mobile-app-patterns.md` §5. Fastest of the
three tracks to stand up — no new component library, no new token port.

## Scope decision — option 3 (a second Angular workspace)

`docs/brand/15-mobile-screen-inventory.md`'s screen list (sign in, home/dashboard, list, detail,
notifications, settings, …) describes **product app screens**, while `web/`'s own route table
(`web/src/app/app.routes.ts`) states its scope explicitly as marketing/docs-only — a boundary
restated in `docs/brand/12-branding-completeness-checklist.md` §7. That left three ways to read
"wrap the existing Angular web app," recorded here as the decision of record (flag for a human to
confirm if the intent was different):

1. ~~Ship the marketing site as the Capacitor app~~ — doesn't produce the screen inventory.
2. ~~Add the product screens as new routes inside `web/`~~ — would cross `web/`'s own paused-KYB
   boundary.
3. **Stand up a second, separate Angular workspace inside `mobile/capacitor/app/`** that imports
   `web/`'s components and `tokens.css` directly (via the `@web-app/*` path alias in
   `app/tsconfig.json`) but keeps its own route table — the option implemented. "Reuses Angular
   components... directly" happens via a second Angular project consuming the first's source
   files, not literally the same running app.

## What's built

- `capacitor.config.ts` — points `webDir` at `web/`'s production build output, dark-mode
  background color from `tokens.css` (`--ino-color-surface`) set as the native splash/background
  fallback color.
- `app/` — the second Angular workspace (option 3 above). All 13 `15-mobile-screen-inventory.md`
  §1 rows are covered:
  - **Splash** — not a route (platform-native launch screen); source art exported below.
  - **Onboarding**, **Sign in**, **Forgot password** — pre-tab-bar auth stack
    (`app.routes.ts`), no shell chrome.
  - **Home**, **Detail**, **Notifications**, **Settings** — the tab-bar shell
    (`shell/app-shell.component.ts` + `shell/tab-bar/`).
  - **List (generic)** — Home's own row composition; no separate route, per the inventory doc's
    "no new template" note for this row.
  - **Search / filter** — `pages/search/`, pushed from Home's header search action.
  - **Empty state** / **Error / offline** — `<ino-empty-state>` (one component, two call sites:
    Notifications' empty list and `pages/error-offline/`, reachable from Settings → Developer
    preview), per the inventory doc's own "reuses the empty-state template" note.
  - **Modal actions** — `<ino-confirm-action-sheet>`, a thin wrapper around `web/`'s
    `<ino-modal variant="overlay">`; wired to Settings' "Delete account" action as its one live
    call site.
- `package.json` — Capacitor core + iOS/Android platform packages, `@capacitor/preferences`
  declared as a dependency (see "Theme persistence" below for why it's not wired in yet), plus
  `@capacitor/assets` as a dev dependency for the icon/splash pipeline below.
- `scripts/gen-app-icons.py` + `resources/` — app icon (`icon.png`, 1024×1024) and Android
  adaptive-icon layers (`icon-foreground.png` / `icon-background.png`) and splash source art
  (`splash.png` / `splash-dark.png`, 2732×2732) rasterized directly from
  `assets/brand/logo/inovixux-icon-b2c.svg`'s own path/gradient coordinates — no SVG renderer
  available in this sandbox (no cairo/rsvg/inkscape/imagemagick on `PATH`), same constraint and
  same fix the react-native track (INO-89) used, see that track's `scripts/gen-app-icons.py`.
  These are the `@capacitor/assets` CLI's expected source files
  (`npm run assets:generate`, once `npm install` has run) — that CLI turns them into the actual
  per-size Xcode `Images.xcassets` AppIcon set and Android `mipmap`/`adaptive-icon`/`drawable`
  splash directories; not run here since it needs `ios`/`android` platform folders present first.

## Theme persistence — flagged, not swapped

`13-mobile-app-patterns.md` §3 calls for the theme override to persist via the platform storage
API (Capacitor `Preferences`, already a declared dependency) instead of `localStorage`. The
Settings screen currently reuses `web/`'s `ThemeService` directly, unmodified, which persists via
`localStorage` — that still works correctly inside a Capacitor WebView (a real per-origin store
there, not a no-op), so nothing is broken, but it isn't the `Preferences`-backed storage the
pattern doc specifies. Swapping it needs either an injectable storage seam added to
`ThemeService` itself (a `web/` change, outside this track's file boundary) or a parallel
mobile-only theme service duplicating its toggle logic — a real decision, not picked silently.

## What's deliberately not done yet

- Native project files (`ios/`, `android/` folders) — not generated in this sandbox; needs
  `npm install && npm run build:web && npx cap add ios android` (`web/` needs a production build
  to point at first, per `capacitor.config.ts`'s `webDir`).
- Running `npm run assets:generate` against those platform folders once they exist.
- Real auth/data backend — every screen uses inline dummy data or a no-op action, flagged inline
  in each component's doc comment; wiring a real API is product/backend work, out of this
  design-system track's scope (same note the other two framework tracks carry).
