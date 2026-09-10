# Tasks

- [x] Read assignment, capacity decision and existing plan; record fresh usage.
- [x] Inspect partial implementation and record specification before new code.
- [x] Finish third-theme palettes, selection and persistence on all surfaces.
- [x] Add and execute drift/contrast verification and theme regressions.
  - `node scripts/check-theme-parity.mjs` — pass (57 color roles × 3 themes × 2 mobile ports, plus shared scalar tokens and high-contrast AAA/3:1 contrast pairs).
  - `web`: `ng build` — pass, clean.
  - `mobile/react-native`: `tsc --noEmit` — pass, clean.
  - `mobile/capacitor/app`: found and fixed a pre-existing (INO-88, unrelated to this issue) broken relative import path in `styles.scss` that silently broke the shared-token build; `ng build` still fails on a pre-existing `@angular/router` duplicate-version resolution error (its own `node_modules` vs. the root workspace's) — not introduced by this change, confirmed by reproducing the identical failure on the pre-INO-92 `HEAD` tree. Flagged for QA/CTO; not fixed here as it is a monorepo dependency-resolution issue outside this ticket's scope.
  - `mobile/flutter`: no Flutter SDK available in this environment; Dart palette syntax and values are covered by the parity script instead. Flagged for QA to run `flutter analyze` / `flutter build` where the SDK is available.
- [x] Update recipe, measured audit, index and checklist.
- [x] Commit scoped work and hand off reproducible QA/board review.
