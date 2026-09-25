/**
 * Deep-link path grammar — docs/brand/13-mobile-app-patterns.md §6.5 / §6.6, INO-112.
 *
 * §6.5 states that the path grammar **is** this track's route table (`../app.routes.ts`), and that
 * React Native and Flutter map *to* these paths rather than inventing their own, because one link
 * string has to resolve to the same screen on all three tracks or it can't go in a notification
 * payload at all. This file is therefore the canonical statement of that table; the other two are
 * `mobile/flutter/lib/navigation/deep_link.dart` and
 * `mobile/react-native/src/navigation/linking.ts`, and `scripts/check-deep-link-parity.mjs` asserts
 * all three still agree.
 *
 * Pure functions, no Angular — so the grammar is testable and so `DeepLinkService` stays a thin
 * adapter over it rather than the place the rules live.
 */

/** Custom scheme — always resolvable, never verified by anyone (§6.5). Matches app id
 * `com.inovixux.app` (`mobile/capacitor/capacitor.config.ts`). */
export const LINK_SCHEME = 'inovixux';

/**
 * Universal Link / App Link host. **Does not exist yet** — §6.7 item 2. Parsing it is correct and
 * testable today; what is missing is the served Apple App Site Association file and
 * `assetlinks.json` that let the OS hand the link to the app at all.
 */
export const LINK_HOST = 'app.inovixux.com';

export type DeepLinkTab = 'home' | 'notifications' | 'settings';

export interface ResolvedDeepLink {
  /** Concrete path with parameters substituted, e.g. `/home/42`. This is what gets navigated to. */
  path: string;
  /** The grammar row that matched, e.g. `/home/:id`. */
  pattern: string;
  /** §6.5's Auth column. Carried, not enforced — no session backend (§6.7 item 5). */
  requiresAuth: boolean;
  /** Owning tab for §6.6's warm-start rule. Null for the pre-tab-bar auth stack. */
  tab: DeepLinkTab | null;
  /** Parent chain ending with `path` (§6.6) — `/home/42` → `['/home', '/home/42']`. */
  stack: string[];
  /** Query string, preserved verbatim. `/forgot-password` is the reset-token landing (§6.5). */
  query: Record<string, string>;
  /** False when the link fell through to Home. Logging only — §6.5 requires no visible difference. */
  recognised: boolean;
}

export const PATHS = {
  home: '/home',
  detail: '/home/:id',
  search: '/search',
  notifications: '/notifications',
  settings: '/settings',
  signIn: '/sign-in',
  forgotPassword: '/forgot-password',
} as const;

/** The `anything else` row of the §6.5 table. */
const FALLBACK: ResolvedDeepLink = {
  path: PATHS.home,
  pattern: PATHS.home,
  requiresAuth: true,
  tab: 'home',
  stack: [PATHS.home],
  query: {},
  recognised: false,
};

/**
 * Reduce either link form to a bare path. Returns `''` for anything not addressed to this app —
 * which then falls through to Home, same as an unknown path.
 */
function pathOf(url: URL): string {
  const scheme = url.protocol.replace(/:$/, '').toLowerCase();

  if (scheme === 'https' || scheme === 'http') {
    // A Universal Link for someone else's host is not ours to route. This check matters: Android
    // App Link filters are host-scoped, but a WebView navigation or an Intent from another app can
    // hand us any https URL at all.
    if (url.host.toLowerCase() !== LINK_HOST) return '';
    return url.pathname;
  }

  if (scheme === LINK_SCHEME) {
    // `inovixux://home/42` parses as host `home` + pathname `/42`, while `inovixux:///home/42`
    // parses as empty host + pathname `/home/42`. Both are valid spellings of the same link and
    // both appear depending on who built the payload, so normalise rather than pick one.
    //
    // Note: browsers parse non-special schemes as "opaque path" URLs, leaving `host` empty and
    // putting everything in `pathname`. Handled by reading the raw remainder instead of `host`.
    const raw = url.href.slice(`${scheme}:`.length).replace(/^\/\//, '');
    return raw.startsWith('/') ? raw : `/${raw}`;
  }

  return '';
}

/**
 * Resolve a link to its destination. Total — never throws; an unparseable or unknown link resolves
 * to Home (§6.5: "Unknown path → Home, not an error screen").
 */
export function resolveDeepLink(raw: string): ResolvedDeepLink {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return FALLBACK;
  }

  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const withoutQuery = pathOf(url).split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  if (segments.length === 0) return FALLBACK;

  const at = (
    path: string,
    pattern: string,
    requiresAuth: boolean,
    tab: DeepLinkTab | null,
    stack: string[],
  ): ResolvedDeepLink => ({ path, pattern, requiresAuth, tab, stack, query, recognised: true });

  switch (segments[0].toLowerCase()) {
    case 'home':
      if (segments.length === 1) return at(PATHS.home, PATHS.home, true, 'home', [PATHS.home]);
      if (segments.length === 2) {
        const path = `/home/${segments[1]}`;
        // Detail's parent is Home — §6.6's worked example: back goes Detail → Home → exit.
        return at(path, PATHS.detail, true, 'home', [PATHS.home, path]);
      }
      return FALLBACK;
    case 'search':
      if (segments.length !== 1) return FALLBACK;
      // Search sits in the Home stack on all three tracks (React Navigation nests it under
      // HomeStack; Flutter pushes it from HomeScreen), so its parent chain is Home's too.
      return at(PATHS.search, PATHS.search, true, 'home', [PATHS.home, PATHS.search]);
    case 'notifications':
      if (segments.length !== 1) return FALLBACK;
      return at(PATHS.notifications, PATHS.notifications, true, 'notifications', [PATHS.notifications]);
    case 'settings':
      if (segments.length !== 1) return FALLBACK;
      return at(PATHS.settings, PATHS.settings, true, 'settings', [PATHS.settings]);
    case 'sign-in':
      if (segments.length !== 1) return FALLBACK;
      return at(PATHS.signIn, PATHS.signIn, false, null, [PATHS.signIn]);
    case 'forgot-password':
      if (segments.length !== 1) return FALLBACK;
      // Back from a reset-token landing goes to Sign in, not out of the app.
      return at(PATHS.forgotPassword, PATHS.forgotPassword, false, null, [
        PATHS.signIn,
        PATHS.forgotPassword,
      ]);
    default:
      return FALLBACK;
  }
}

/** Rebuild the navigable URL, query included — what `Router.navigateByUrl` is handed. */
export function toRouterUrl(link: ResolvedDeepLink): string {
  const entries = Object.entries(link.query);
  if (entries.length === 0) return link.path;
  const search = new URLSearchParams(entries).toString();
  return `${link.path}?${search}`;
}
