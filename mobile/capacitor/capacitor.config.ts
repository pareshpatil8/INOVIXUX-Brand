import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Wraps the Angular web app per docs/brand/13-mobile-app-patterns.md §5 ("mobile/capacitor/
 * wraps the existing Angular web app (web/); reuses components, design tokens, and ThemeService
 * directly"). `webDir` points at web/'s production build output — run `npm run build:web` (this
 * package's script) before `cap sync`.
 *
 * See README.md in this folder for the open scope question this config alone can't resolve:
 * web/ is explicitly the marketing/docs site (web/src/app/app.routes.ts's own boundary comment),
 * not a place the mobile screen inventory's product screens (sign-in, dashboard, notifications)
 * currently live.
 */
const config: CapacitorConfig = {
  appId: 'com.inovixux.app',
  appName: 'INOVIXUX',
  webDir: '../../web/dist/web/browser',
  backgroundColor: '#0A0A0A', // --ino-color-surface, dark-mode default (tokens.css)
  server: {
    androidScheme: 'https',
  },
};

export default config;
