import { getStateFromPath as defaultGetStateFromPath, type LinkingOptions } from '@react-navigation/native';

/**
 * Deep-link configuration — docs/brand/13-mobile-app-patterns.md §6.5 / §6.6, INO-112.
 *
 * §6.6's per-track table for React Native says: use React Navigation's `linking` config
 * (`prefixes` + `config`), and let it synthesize the parent stack natively rather than writing
 * manual `push` chains. That is what this file is: the declarative half is the `config` object,
 * and the two rules React Navigation does *not* give for free (unknown path → Home; where the
 * grammar's auth flag lives) are the two overrides below.
 *
 * §6.5 states the path grammar *is* the Capacitor route table — React Native and Flutter map *to*
 * those paths rather than inventing their own, because one link string has to resolve to the same
 * screen on all three tracks or it can't go in a notification payload at all. The paths below are
 * therefore copied from `mobile/capacitor/app/src/app/app.routes.ts` and must not drift; the
 * Flutter side of the same table is `mobile/flutter/lib/navigation/deep_link.dart`.
 */

/** Custom scheme — always resolvable, never verified by anyone (§6.5). */
export const LINK_SCHEME = 'inovixux://';

/**
 * Universal Link / App Link origin. **The host does not exist yet** (§6.7 item 2): there is no
 * served Apple App Site Association file and no `assetlinks.json`, so the OS will never route an
 * `https://app.inovixux.com/...` URL into the app and these links cannot be OS-verified. Declared
 * anyway because nothing here changes when the host lands — it is the same grammar behind a
 * second prefix.
 */
export const LINK_ORIGIN = 'https://app.inovixux.com';

/**
 * Native registration is NOT in this repo. Expo's managed config (`app.json`) has no `scheme`
 * field set, so even the custom scheme is inert until it is added:
 *   - `expo.scheme: "inovixux"` — generates the Android `<intent-filter>` and the iOS
 *     `CFBundleURLTypes` entry on prebuild.
 *   - `expo.ios.associatedDomains: ["applinks:app.inovixux.com"]` and
 *     `expo.android.intentFilters` with `autoVerify: true` — only meaningful once the host serves
 *     the two association files.
 * Adding the scheme is a one-line change; it is deliberately not made here because it is a native
 * build-config change on a track with no `ios/`/`android/` directories generated yet, and it would
 * read as "deep links work now" when the transport and host still do not exist.
 */

/** §6.5's auth column. Carried, not enforced — there is no session backend (§6.7 item 5). */
export const PUBLIC_PATHS = ['/sign-in', '/forgot-password'] as const;

export function pathRequiresAuth(path: string): boolean {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/home';
  return !PUBLIC_PATHS.some((p) => p === normalized);
}

export const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [LINK_SCHEME, LINK_ORIGIN],
  config: {
    screens: {
      HomeTab: {
        /**
         * This one line is §6.6's back-stack rule for this track. With it, deep-linking
         * `home/42` produces the stack `[Home, Detail]` — back goes Detail → Home → exit, never
         * Detail → exit. Without it React Navigation renders Detail as the only route in the
         * stack and back leaves the app. Same for `search`, which is why Search lives in this
         * stack rather than as its own tab.
         */
        initialRouteName: 'Home',
        screens: {
          Home: 'home',
          Detail: 'home/:id',
          Search: 'search',
        },
      },
      NotificationsTab: 'notifications',
      SettingsTab: {
        initialRouteName: 'Settings',
        screens: {
          Settings: 'settings',
          /**
           * DIVERGENCE, recorded rather than hidden: on the Capacitor and Flutter tracks the auth
           * screens are a pre-tab-bar stack *above* the shell (`app.routes.ts` splits them out
           * explicitly). Here they sit inside the Settings stack, because this scaffold models no
           * signed-out state and reaches them through Settings → Preview — the reason
           * `RootNavigator.tsx` already gives for that placement.
           *
           * Consequence: `inovixux://sign-in` lands on the right *screen* on all three tracks, but
           * on this one it renders with the tab bar visible. That is a scaffold artifact, and it
           * resolves itself when a real signed-out state exists — which needs the session backend
           * (§6.7 item 5). Not worth duplicating the screens to paper over in the meantime.
           */
          SignIn: 'sign-in',
          ForgotPassword: 'forgot-password',
        },
      },
    },
  },

  /**
   * §6.5: "Unknown path → Home, not an error screen." React Navigation's default returns
   * `undefined` for an unmatched path, which makes the app silently ignore the link — the user
   * taps a notification and nothing happens. Falling back to Home matches the `**` redirect in the
   * Capacitor route table and the Flutter resolver, and beats both alternatives: an error screen
   * reads as a broken app rather than a stale link, and doing nothing reads as a broken tap.
   */
  getStateFromPath: (path, options) =>
    defaultGetStateFromPath(path, options) ?? defaultGetStateFromPath('/home', options),
};

/**
 * Reduce a link in either form to the bare path React Navigation's `useLinkTo` wants.
 *
 * Needed because a notification payload carries a full link (`inovixux:///home/42`), while
 * `linkTo` takes a path (`/home/42`). Mirrors `_pathOf` in the Flutter resolver, including the
 * two spellings of the custom scheme and the foreign-host rejection.
 */
export function pathFromLink(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/')) return trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const withoutScheme = trimmed.replace(/^https?:\/\//, '');
    const slash = withoutScheme.indexOf('/');
    const host = (slash === -1 ? withoutScheme : withoutScheme.slice(0, slash)).toLowerCase();
    // An in-app webview or a foreign Intent can hand the app any https URL at all; only ours
    // routes. Everything else is an unknown path, which is Home.
    if (host !== LINK_ORIGIN.replace(/^https:\/\//, '')) return '/home';
    return slash === -1 ? '/home' : withoutScheme.slice(slash) || '/home';
  }

  if (trimmed.toLowerCase().startsWith('inovixux:')) {
    // `inovixux://home/42` and `inovixux:///home/42` are the same link, spelled two ways —
    // normalise both rather than picking one and being surprised by payloads using the other.
    const rest = trimmed.slice('inovixux:'.length).replace(/^\/\//, '');
    return rest.startsWith('/') ? rest : `/${rest}`;
  }

  return '/home';
}
