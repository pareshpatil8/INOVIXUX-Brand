import { Routes } from '@angular/router';

/**
 * Route table for the Capacitor product app — the 13-row screen inventory
 * (`docs/brand/15-mobile-screen-inventory.md` §1), unlike `web/src/app/app.routes.ts` which is
 * explicitly marketing/docs-only. See `mobile/capacitor/README.md` for why these live in a
 * second Angular workspace instead of being added to `web/`'s route table.
 *
 * Two top-level branches, matching `13-mobile-app-patterns.md` §1 ("primary nav = bottom tabs,
 * secondary nav = stack push, auth is its own stack, not a tab"):
 *   - `onboarding` / `sign-in` (+ `forgot-password`) — pre-tab-bar auth stack, no shell chrome.
 *   - everything under `AppShellComponent` — tab-bar chrome + the tab/stack screens.
 *
 * All 13 `15-mobile-screen-inventory.md` §1 rows are covered: splash is the platform-native
 * launch screen (not a route, see the icon/splash export in `mobile/capacitor/resources/`);
 * "list (generic)" and "modal actions" reuse Home's list rows and `<ino-confirm-action-sheet>`
 * respectively rather than getting their own route, per that doc's own "no new template" notes.
 */
export const routes: Routes = [
  // No auth/session backend wired (product/backend work, out of this design-system track's
  // scope — see sign-in.component.ts) to gate first-launch-vs-returning-user, so this always
  // lands on onboarding rather than skipping straight to the tab shell.
  { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
    title: 'Welcome — INOVIXUX',
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in/sign-in.component').then((m) => m.SignInComponent),
    title: 'Sign in — INOVIXUX',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    title: 'Reset password — INOVIXUX',
  },
  {
    path: '',
    loadComponent: () => import('./shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
        title: 'Home — INOVIXUX',
      },
      {
        path: 'home/:id',
        loadComponent: () =>
          import('./pages/detail/detail.component').then((m) => m.DetailComponent),
        title: 'Detail — INOVIXUX',
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.component').then((m) => m.SearchComponent),
        title: 'Search — INOVIXUX',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
        title: 'Notifications — INOVIXUX',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
        title: 'Settings — INOVIXUX',
      },
      {
        path: 'error-offline',
        loadComponent: () =>
          import('./pages/error-offline/error-offline.component').then(
            (m) => m.ErrorOfflineComponent,
          ),
        title: 'Offline — INOVIXUX',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
