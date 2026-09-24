import 'package:flutter/material.dart';

import '../screens/detail_screen.dart';
import '../screens/error_offline_screen.dart';
import '../screens/forgot_password_screen.dart';
import '../screens/home_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/search_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/sign_in_screen.dart';
import '../theme/theme_controller.dart';
import 'deep_link.dart';

/// Named-route table + deep-link application — docs/brand/13-mobile-app-patterns.md §6.6, INO-112.
///
/// This is the preparatory work §6.6's per-track table calls out for Flutter: before this file,
/// `root_shell.dart` navigated with imperative `Navigator.push(MaterialPageRoute(...))` and no
/// route names at all, so the parent-chain rule had nothing to build on — there was no way to say
/// "put Home underneath this Detail" without hand-assembling widget instances.
///
/// Why hand-rolled named routes and not `go_router`: §6.6 allows either. The app has seven paths,
/// one of which takes a parameter, and the nested-tab-navigator shape below is the thing that has
/// to be gotten right — go_router would add a dependency and its own `StatefulShellRoute` idiom on
/// top of that same shape without removing any of it. Revisit if the path count grows or nested
/// query-state routing appears.
///
/// Structure mirrors the React Native track deliberately (see
/// `mobile/react-native/src/navigation/RootNavigator.tsx`): one [Navigator] per tab, so each tab
/// keeps its own back stack, plus a root [Navigator] that hosts the shell and the pre-tab-bar
/// auth stack above it. React Navigation gets this shape for free from a nested `linking` config;
/// Flutter has to be told.
class InoRouter {
  InoRouter._();

  /// Hosts the shell, and the auth stack pushed above it (`/sign-in`, `/forgot-password` are
  /// pre-tab-bar per `app.routes.ts`'s own two-branch split).
  static final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

  static final Map<InoTab, GlobalKey<NavigatorState>> _tabNavigatorKeys = {
    for (final tab in InoTab.values) tab: GlobalKey<NavigatorState>(),
  };

  static final Map<InoTab, InoTopRouteObserver> _tabObservers = {
    for (final tab in InoTab.values) tab: InoTopRouteObserver(),
  };

  static GlobalKey<NavigatorState> navigatorKeyFor(InoTab tab) => _tabNavigatorKeys[tab]!;

  static InoTopRouteObserver observerFor(InoTab tab) => _tabObservers[tab]!;

  /// Which tab the shell is showing. Driven by tab taps and by [open]'s warm-start rule; watched
  /// by `RootShell`.
  static final ValueNotifier<InoTab> activeTab = ValueNotifier<InoTab>(InoTab.home);

  /// Initial route for each tab's nested navigator.
  static String rootPathFor(InoTab tab) => switch (tab) {
        InoTab.home => InoPaths.home,
        InoTab.notifications => InoPaths.notifications,
        InoTab.settings => InoPaths.settings,
      };

  /// Routes reachable inside a tab's own stack. Returning null lets the root navigator handle it
  /// (that is how a tab-level `Navigator.pushNamed('/sign-in')` bubbles up to the auth stack).
  static Route<dynamic>? generateTabRoute(
    RouteSettings settings,
    ThemeController themeController,
  ) {
    final name = settings.name ?? InoPaths.home;
    final segments = name.split('/').where((s) => s.isNotEmpty).toList();

    Widget? page;
    if (name == InoPaths.home) {
      page = const HomeScreen();
    } else if (name == InoPaths.search) {
      page = const SearchScreen();
    } else if (name == InoPaths.notifications) {
      page = const NotificationsScreen();
    } else if (name == InoPaths.settings) {
      page = SettingsScreen(controller: themeController);
    } else if (segments.length == 2 && segments.first == 'home') {
      final args = settings.arguments;
      page = DetailScreen(
        id: Uri.decodeComponent(segments[1]),
        // A deep link carries an id, never a title — the title belongs to the record, and there
        // is no notification/record data model to read it from yet (§6.7 item 4). In-app pushes
        // from the Home list pass the title they already have via `arguments`; a cold deep link
        // falls back to DetailScreen's own id-derived heading rather than flashing a wrong one.
        title: args is String ? args : null,
      );
    }

    if (page == null) return null;
    return MaterialPageRoute<void>(builder: (_) => page!, settings: settings);
  }

  /// Routes that live above the shell: the auth stack, plus the two screens that are full-screen
  /// states rather than tab content.
  static Route<dynamic>? generateRootRoute(RouteSettings settings) {
    final page = switch (settings.name) {
      InoPaths.signIn => const SignInScreen(),
      InoPaths.forgotPassword => const ForgotPasswordScreen(),
      '/onboarding' => const OnboardingScreen(),
      '/error-offline' => const ErrorOfflineScreen(),
      _ => null,
    };
    if (page == null) return null;
    return MaterialPageRoute<void>(builder: (_) => page, settings: settings);
  }

  /// Cold-start parent chain (§6.6). Handed to each tab [Navigator]'s `onGenerateInitialRoutes`,
  /// so a link that arrives before the first frame paints its destination *with the parent already
  /// beneath it* — rather than painting Home and then animating a push on top, which is the
  /// visible jump §6.6 rules out.
  ///
  /// Only the owning tab gets the deep link's stack; the other two start at their own roots.
  static List<Route<dynamic>> initialRoutesFor(
    InoTab tab,
    InoDeepLink? link,
    ThemeController themeController,
  ) {
    final paths = (link != null && link.tab == tab) ? link.stack : [rootPathFor(tab)];
    final routes = <Route<dynamic>>[];
    for (final path in paths) {
      final route = generateTabRoute(RouteSettings(name: path), themeController);
      if (route != null) routes.add(route);
    }
    // Never hand Navigator an empty list — it asserts. Falling back to the tab root keeps a
    // malformed link at the §6.5 "unknown path → Home, silently" standard rather than a crash.
    if (routes.isEmpty) {
      final fallback = generateTabRoute(RouteSettings(name: rootPathFor(tab)), themeController);
      if (fallback != null) routes.add(fallback);
    }
    return routes;
  }

  /// Apply a resolved link — the behavioural half of §6.6.
  ///
  /// Warm start ("resolve onto the existing navigation state"): switch to the owning tab, then
  /// push the target only if it is not already on top. The existing stack underneath is left
  /// alone, because a user returning from a notification expects the app they left to still be
  /// underneath.
  ///
  /// Parent chain: the tab's navigator is rooted at its tab path, so pushing the tail of
  /// [InoDeepLink.stack] leaves the parent already in place — back from a deep-linked Detail goes
  /// Detail → Home → exit, never Detail → exit.
  static void open(InoDeepLink link) {
    final root = rootNavigatorKey.currentState;
    if (root == null) return;

    // §6.5: auth-required path while signed out → Sign in, holding the target. There is no
    // session backend (§6.7 item 5), so there is nothing to ask "is the user signed out?" — the
    // hold is implemented and unit-reachable via [heldTarget] below, but nothing sets the
    // signed-out condition yet. Wiring point is `InoSession.isSignedIn` when that exists; until
    // then every link is treated as permitted, which is the same assumption the sign-in screens
    // already ship with.

    if (link.tab == null) {
      // Pre-tab-bar auth stack, above the shell.
      root.popUntil((route) => route.isFirst);
      for (final path in link.stack) {
        root.pushNamed(path);
      }
      return;
    }

    // Drop any auth screens / full-screen states sitting above the shell first, otherwise the tab
    // switch happens invisibly underneath them.
    root.popUntil((route) => route.isFirst);
    activeTab.value = link.tab!;

    final nav = _tabNavigatorKeys[link.tab]!.currentState;
    if (nav == null) return;
    final observer = _tabObservers[link.tab]!;

    if (link.stack.length == 1) {
      // The target *is* the tab root; the only way to show it is to pop back down to it.
      nav.popUntil((route) => route.isFirst);
      return;
    }

    for (final path in link.stack.skip(1)) {
      if (observer.topRouteName.value == path) continue; // already on top — §6.6's own wording
      nav.pushNamed(path);
    }
  }

  /// Target held across a sign-in that cannot happen yet (§6.5 / §6.7 item 5). Set when an
  /// auth-required link arrives while signed out; consumed by the sign-in success handler.
  /// Public so the seam is visible and testable rather than implied by a comment.
  static final ValueNotifier<InoDeepLink?> heldTarget = ValueNotifier<InoDeepLink?>(null);

  /// Call after a successful sign in: resume to the held target instead of dropping the user on
  /// Home. No caller yet — there is no sign-in success to hook.
  static void resumeHeldTarget() {
    final held = heldTarget.value;
    if (held == null) return;
    heldTarget.value = null;
    open(held);
  }
}

/// Tracks the top route name of a [Navigator], so [InoRouter.open] can honour §6.6's "push the
/// target if it isn't already on top" without re-pushing a screen the user is already looking at.
/// Flutter exposes no read-only "current route" accessor, hence the observer.
class InoTopRouteObserver extends NavigatorObserver {
  final ValueNotifier<String?> topRouteName = ValueNotifier<String?>(null);

  void _set(Route<dynamic>? route) => topRouteName.value = route?.settings.name;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) => _set(route);

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) => _set(previousRoute);

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) => _set(previousRoute);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) => _set(newRoute);
}
