import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../screens/home_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/settings_screen.dart';
import '../theme/theme_controller.dart';

/// Primary nav = bottom tab bar, 3–5 items, icon + label, ≥44px targets
/// (docs/brand/13-mobile-app-patterns.md §1). Secondary nav (Home → Detail) uses `Navigator.push`
/// from within `HomeScreen`, not tabs-within-tabs.
///
/// Tab bar composition per docs/brand/15-mobile-screen-inventory.md §2: Home, [slot 2 — core
/// product surface, name pending], Notifications, Settings. Slot 2 intentionally omitted rather
/// than invented — flagging it in code the same way the spec doc flags it.
class RootShell extends StatefulWidget {
  final ThemeController themeController;

  const RootShell({super.key, required this.themeController});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const HomeScreen(),
      const NotificationsScreen(),
      SettingsScreen(controller: widget.themeController),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(LucideIcons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.bell), label: 'Notifications'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
