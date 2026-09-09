import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Mirrors web/src/app/services/theme.service.ts: default to OS `prefers-color-scheme`
/// (Flutter: `ThemeMode.system`), explicit in-app override persisted via SharedPreferences
/// instead of `localStorage` — per docs/brand/13-mobile-app-patterns.md §3.
class ThemeController extends ChangeNotifier {
  static const _storageKey = 'inovixux_theme_mode';

  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey);
    if (stored == 'dark') {
      _mode = ThemeMode.dark;
    } else if (stored == 'light') {
      _mode = ThemeMode.light;
    } else {
      _mode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, mode.name);
  }
}
