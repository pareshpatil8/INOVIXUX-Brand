# INOVIXUX — Capacitor track (INO-88)

Wraps the existing Angular web app per `docs/brand/13-mobile-app-patterns.md` §5. Fastest of the
three tracks to stand up — no new component library, no new token port — but has one real scope
question the other two tracks don't, flagged below rather than guessed at.

## What's built this round

- `capacitor.config.ts` — points `webDir` at `web/`'s production build output, dark-mode
  background color from `tokens.css` (`--ino-color-surface`) set as the native splash/background
  fallback color.
- `package.json` — Capacitor core + iOS/Android platform packages, `@capacitor/preferences` (the
  Capacitor equivalent of `AsyncStorage`/`SharedPreferences`, for the theme-override persistence
  described in `13-mobile-app-patterns.md` §3) declared as a dependency.

## Open scope question — not resolved by this scaffold

`docs/brand/15-mobile-screen-inventory.md`'s screen list (sign in, home/dashboard, list, detail,
notifications, settings) describes **product app screens**. `web/`'s own route table
(`web/src/app/app.routes.ts`) states its scope explicitly: *"this is the marketing/docs surface
only. No KYB product screens (dashboard, reviewer queues) live behind any route here — that
codebase is separate and explicitly paused"* — a boundary restated in
`docs/brand/12-branding-completeness-checklist.md` §7.

So "wrap the existing Angular web app" as written either means:

1. **Ship the marketing site as the Capacitor app** — technically what this config does today
   (`webDir` → `web/`'s build), but that doesn't produce the screen inventory INO-88 is supposed
   to build (no sign-in, no dashboard, no bottom tab bar — a marketing site doesn't have those).
2. **Add the mobile product screens as new routes inside `web/`** — reuses Angular components and
   `ThemeService` directly as instructed, but adds product-app routes to a codebase whose own
   route table currently draws an explicit line against exactly that (KYB paused; unclear if the
   mobile app's screens count as the same paused surface or a distinct, unpaused one).
3. **Stand up a second, separate Angular workspace inside `mobile/capacitor/`** that imports the
   shared component library and `tokens.css` but keeps its own route table — avoids touching
   `web/`'s boundary, but means "reuses Angular components... directly" happens via a second
   Angular project, not literally the same app.

The React Native and Flutter tracks don't have this problem — they're new codebases where the
screen inventory is unambiguously in-scope. This one inherits an existing codebase with an
explicit prior scope boundary that the mobile screen inventory doesn't obviously fit inside.
Flagging this on INO-88 as a real decision needed rather than picking one of the three silently.

## What's deliberately not done yet

- The screens themselves (all 13 rows of `docs/brand/15-mobile-screen-inventory.md`) — blocked on
  the scope question above, not on tooling.
- Native project files (`ios/`, `android/` folders) — not generated in this sandbox; needs
  `npm install && npx cap add ios android` after `web/` has a production build to point at.
- App icon / splash export at Capacitor/Cordova config sizes from `inovixux-icon-b2c.svg`.
