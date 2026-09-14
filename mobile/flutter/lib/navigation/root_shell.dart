import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../notifications/notification_center.dart';
import '../notifications/notification_widgets.dart';
import '../theme/theme_controller.dart';
import 'deep_link.dart';
import 'ino_router.dart';

/// Primary nav = bottom tab bar, 3–5 items, icon + label, ≥44px targets
/// (docs/brand/13-mobile-app-patterns.md §1). Secondary nav = stack push, not tabs-within-tabs.
///
/// Tab bar composition per docs/brand/15-mobile-screen-inventory.md §2: Home, [slot 2 — core
/// product surface, name pending], Notifications, Settings. Slot 2 intentionally omitted rather
/// than invented — flagging it in code the same way the spec doc flags it.
///
/// **Changed by INO-112**: each tab now hosts its own [Navigator] with a named-route table
/// ([InoRouter]) instead of the screens being bare widgets in an [IndexedStack] with
/// `Navigator.push(MaterialPageRoute(...))` called from inside them. §6.6's parent-chain rule —
/// "back from a deep-linked Detail goes Detail → Home → exit, never Detail → exit" — has nothing
/// to build on without route names, which is exactly what §6.6's per-track table flags for this
/// track. [IndexedStack] is kept so switching tabs preserves each tab's stack: §6.6's warm-start
/// rule says "do not tear down and rebuild the stack".
class RootShell extends StatefulWidget {
  final ThemeController themeController;

  /// Link captured before the first frame (cold start, §6.6). Its destination is painted *with
  /// its parent stack already in place* rather than pushed on top of an already-painted Home.
  final InoDeepLink? initialLink;

  const RootShell({super.key, required this.themeController, this.initialLink});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  final _center = InoNotificationCenter.instance;

  @override
  void initState() {
    super.initState();
    // Before first build, so the correct tab is the one that paints — not a Home that then jumps.
    final tab = widget.initialLink?.tab;
    if (tab != null) InoRouter.activeTab.value = tab;

    InoRouter.activeTab.addListener(_onTabChanged);
    _onTabChanged();
  }

  @override
  void dispose() {
    InoRouter.activeTab.removeListener(_onTabChanged);
    super.dispose();
  }

  /// §6.2 row 1: "Clear on Notifications-screen view, not on app open." With an [IndexedStack] the
  /// screen is built once and never disposed, so "view" is the tab becoming active — not the
  /// screen's own initState, which would fire once at launch and never again.
  void _onTabChanged() {
    if (InoRouter.activeTab.value == InoTab.notifications) {
      _center.markNotificationsViewed();
    }
  }

  Widget _tabNavigator(InoTab tab) {
    return Navigator(
      key: InoRouter.navigatorKeyFor(tab),
      observers: [InoRouter.observerFor(tab)],
      initialRoute: InoRouter.rootPathFor(tab),
      onGenerateInitialRoutes: (_, __) =>
          InoRouter.initialRoutesFor(tab, widget.initialLink, widget.themeController),
      onGenerateRoute: (settings) =>
          InoRouter.generateTabRoute(settings, widget.themeController),
    );
  }

  /// Android system back. A nested [Navigator] does not receive the OS back event on its own —
  /// the root route does — so it is forwarded here. Dumping the user out of the app while a tab
  /// still has a stack is the policy-level smell §6.6 calls out.
  void _handleBack(InoTab tab) {
    final nav = InoRouter.navigatorKeyFor(tab).currentState;
    if (nav != null && nav.canPop()) {
      nav.pop();
      return;
    }
    // At a tab root. Back from a secondary tab returns to Home rather than exiting — the same
    // "synthesize the parent chain" reasoning one level up, applied to tabs.
    if (tab != InoTab.home) {
      InoRouter.activeTab.value = InoTab.home;
      return;
    }
    // Home tab, empty stack: this is the one place back should leave the app.
    SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<InoTab>(
      valueListenable: InoRouter.activeTab,
      builder: (context, tab, _) => PopScope(
        // Always intercept: whether there is anything to pop lives in the nested navigator, which
        // this widget cannot synchronously observe without re-rendering on every push.
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (didPop) return;
          _handleBack(tab);
        },
        child: Scaffold(
          body: IndexedStack(
            index: tab.index,
            children: [for (final t in InoTab.values) _tabNavigator(t)],
          ),
          bottomNavigationBar: AnimatedBuilder(
            animation: _center,
            builder: (context, _) => BottomNavigationBar(
              currentIndex: tab.index,
              onTap: (i) {
                final next = InoTab.values[i];
                // Tapping the active tab pops it to its root — the platform convention, and the
                // only in-app way back to a tab root once a deep link has pushed onto it.
                if (next == tab) {
                  InoRouter.navigatorKeyFor(tab).currentState?.popUntil((r) => r.isFirst);
                  return;
                }
                InoRouter.activeTab.value = next;
              },
              type: BottomNavigationBarType.fixed,
              items: [
                const BottomNavigationBarItem(icon: Icon(LucideIcons.home), label: 'Home'),
                BottomNavigationBarItem(
                  icon: InoTabBadge(
                    icon: const Icon(LucideIcons.bell),
                    state: _center.tabBadge,
                  ),
                  label: 'Notifications',
                ),
                const BottomNavigationBarItem(
                    icon: Icon(LucideIcons.settings), label: 'Settings'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
