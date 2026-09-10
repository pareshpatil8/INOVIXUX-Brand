import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Explicit themes persist independently of Flutter's system brightness setting.
enum InoThemeMode { system, dark, light, highContrast }

class ThemeController extends ChangeNotifier {
  static const _storageKey = 'inovixux_theme_mode';
  InoThemeMode _mode = InoThemeMode.system;
  InoThemeMode get mode => _mode;
  ThemeMode get materialMode => switch (_mode) {
    InoThemeMode.system => ThemeMode.system,
    InoThemeMode.light => ThemeMode.light,
    _ => ThemeMode.dark,
  };

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _mode = switch (prefs.getString(_storageKey)) {
      'dark' => InoThemeMode.dark,
      'light' => InoThemeMode.light,
      'high-contrast' => InoThemeMode.highContrast,
      _ => InoThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> setMode(InoThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey,
        mode == InoThemeMode.highContrast ? 'high-contrast' : mode.name);
  }
}
