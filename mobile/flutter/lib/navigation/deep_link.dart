/// Deep-link path grammar — docs/brand/13-mobile-app-patterns.md §6.5, INO-112.
///
/// Pure resolution logic: [Uri] in, [InoDeepLink] out. No Flutter imports, no navigation, no
/// plugin dependency — so the grammar can be unit-tested without a widget tree, and so the
/// `app_links` intake in [InoLinkIntake] stays a thin adapter over it rather than the place the
/// rules live.
///
/// §6.5 says the path grammar *is* the Capacitor route table
/// (`mobile/capacitor/app/src/app/app.routes.ts`); this file and
/// `mobile/react-native/src/navigation/linking.ts` both map onto those same strings so one link
/// resolves to the same screen on all three tracks.
library;

/// Custom scheme — always resolvable, never verified by anyone (§6.5). Matches the shipped app
/// id `com.inovixux.app`.
const String inoLinkScheme = 'inovixux';

/// Universal Link / App Link host. **Does not exist yet** — §6.7 item 2. Parsing it is correct
/// and testable today; what is missing is the served AASA / `assetlinks.json` that lets the OS
/// hand the link to the app at all. Until then only [inoLinkScheme] actually arrives.
const String inoLinkHost = 'app.inovixux.com';

/// The three bottom-tab destinations (`13-mobile-app-patterns.md` §1, tab composition in
/// `15-mobile-screen-inventory.md` §2). Slot 2 is still an open product question and is
/// deliberately absent here too, rather than invented to fill the grammar out.
enum InoTab { home, notifications, settings }

/// Canonical path constants. Every route name in [InoRouter] and every entry below comes from
/// here, so a typo is a compile error rather than a silent fall-through to Home.
class InoPaths {
  static const String home = '/home';
  static const String detail = '/home/:id';
  static const String search = '/search';
  static const String notifications = '/notifications';
  static const String settings = '/settings';
  static const String signIn = '/sign-in';
  static const String forgotPassword = '/forgot-password';
}

/// A resolved link: which screen, under which tab, with what stack beneath it.
class InoDeepLink {
  /// Concrete path with parameters substituted, e.g. `/home/42`. This is what gets pushed.
  final String path;

  /// The grammar row that matched, e.g. `/home/:id`. Distinct from [path] so callers can switch
  /// on the route without re-parsing the id back out.
  final String pattern;

  /// §6.5 "Auth" column. The signed-out behaviour (hold the target through sign in) needs a
  /// session backend that does not exist — §6.7 item 5 — so this flag is carried, not enforced;
  /// see [InoRouter.open].
  final bool requiresAuth;

  /// Owning tab for the warm-start rule (§6.6: "switch to the owning tab, then push the target").
  /// `null` for the pre-tab-bar auth stack, which sits above the shell rather than inside a tab.
  final InoTab? tab;

  /// Parent chain, ending with [path] (§6.6 "a deep link must synthesize its parent chain").
  /// `/home/42` yields `['/home', '/home/42']` so back goes Detail → Home → exit, never
  /// Detail → exit.
  final List<String> stack;

  /// Query string, preserved verbatim. Carried because `/forgot-password` is "typically the
  /// reset-token landing" (§6.5) and dropping its token would break the one deep link that has a
  /// real payload today.
  final Map<String, String> query;

  /// False when the link did not match the grammar and was silently rerouted to Home (§6.5:
  /// "Unknown path → Home, not an error screen"). Exposed for logging only — there is
  /// deliberately no user-visible difference, because a stale link from an older app version
  /// landing on an error page reads as a broken app rather than a stale link.
  final bool recognised;

  const InoDeepLink({
    required this.path,
    required this.pattern,
    required this.requiresAuth,
    required this.tab,
    required this.stack,
    this.query = const {},
    this.recognised = true,
  });

  /// The `anything else` row of the §6.5 table.
  static const InoDeepLink fallback = InoDeepLink(
    path: InoPaths.home,
    pattern: InoPaths.home,
    requiresAuth: true,
    tab: InoTab.home,
    stack: [InoPaths.home],
    recognised: false,
  );

  /// Route parameter for `/home/:id`, else null.
  String? get detailId =>
      pattern == InoPaths.detail ? Uri.decodeComponent(path.split('/').last) : null;

  @override
  String toString() => 'InoDeepLink($path, tab: $tab, stack: $stack)';
}

/// Reduce either link form to a bare path. Returns `''` for anything not addressed to this app —
/// which then falls through to Home, same as an unknown path.
String _pathOf(Uri uri) {
  final scheme = uri.scheme.toLowerCase();
  if (scheme == 'https' || scheme == 'http') {
    // A Universal Link for someone else's host is not ours to route. Checking this matters:
    // Android App Link filters are host-scoped, but an in-app webview or an `Intent` from
    // another app can hand us any https URL at all.
    if (uri.host.toLowerCase() != inoLinkHost) return '';
    return uri.path;
  }
  if (scheme == inoLinkScheme) {
    // `inovixux://home/42` parses as host `home` + path `/42`, while `inovixux:///home/42`
    // parses as empty host + path `/home/42`. Both are valid spellings of the same link and both
    // appear in the wild depending on who built the payload, so normalise rather than pick one.
    return uri.host.isEmpty ? uri.path : '/${uri.host}${uri.path}';
  }
  return '';
}

/// Resolve a link to its destination. Total — never throws, never returns null; an unparseable
/// or unknown link resolves to [InoDeepLink.fallback] (Home), per §6.5.
InoDeepLink resolveInoDeepLink(Uri uri) {
  final query = uri.queryParameters;
  final segments = _pathOf(uri)
      .split('/')
      .where((s) => s.isNotEmpty)
      .toList(growable: false);

  if (segments.isEmpty) return InoDeepLink.fallback;

  InoDeepLink at(
    String path,
    String pattern,
    bool requiresAuth,
    InoTab? tab,
    List<String> stack,
  ) =>
      InoDeepLink(
        path: path,
        pattern: pattern,
        requiresAuth: requiresAuth,
        tab: tab,
        stack: stack,
        query: query,
      );

  switch (segments.first.toLowerCase()) {
    case 'home':
      if (segments.length == 1) {
        return at(InoPaths.home, InoPaths.home, true, InoTab.home, const [InoPaths.home]);
      }
      if (segments.length == 2) {
        final path = '/home/${segments[1]}';
        // Detail's parent is Home — the §6.6 worked example.
        return at(path, InoPaths.detail, true, InoTab.home, [InoPaths.home, path]);
      }
      return InoDeepLink.fallback;
    case 'search':
      if (segments.length != 1) return InoDeepLink.fallback;
      // Search sits inside the Home stack on all three tracks (React Navigation nests it under
      // HomeStack; Flutter pushes it from HomeScreen), so its parent chain is Home's too.
      return at(InoPaths.search, InoPaths.search, true, InoTab.home,
          const [InoPaths.home, InoPaths.search]);
    case 'notifications':
      if (segments.length != 1) return InoDeepLink.fallback;
      return at(InoPaths.notifications, InoPaths.notifications, true, InoTab.notifications,
          const [InoPaths.notifications]);
    case 'settings':
      if (segments.length != 1) return InoDeepLink.fallback;
      return at(InoPaths.settings, InoPaths.settings, true, InoTab.settings,
          const [InoPaths.settings]);
    case 'sign-in':
      if (segments.length != 1) return InoDeepLink.fallback;
      return at(InoPaths.signIn, InoPaths.signIn, false, null, const [InoPaths.signIn]);
    case 'forgot-password':
      if (segments.length != 1) return InoDeepLink.fallback;
      // Back from a reset-token landing goes to Sign in, not out of the app — same parent-chain
      // rule as Detail → Home.
      return at(InoPaths.forgotPassword, InoPaths.forgotPassword, false, null,
          const [InoPaths.signIn, InoPaths.forgotPassword]);
    default:
      return InoDeepLink.fallback;
  }
}

/// Convenience for the string form notification payloads carry (§6.7 item 3 owns the field name;
/// this owns what the value means).
InoDeepLink resolveInoDeepLinkString(String raw) {
  final uri = Uri.tryParse(raw.trim());
  return uri == null ? InoDeepLink.fallback : resolveInoDeepLink(uri);
}
