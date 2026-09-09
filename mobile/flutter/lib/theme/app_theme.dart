import 'package:flutter/material.dart';
import 'tokens.dart';

/// Builds Flutter [ThemeData] from [InoPalette] — dark is the default, matching tokens.css
/// (`:root`, no attribute needed). Light is the explicit override, same values as tokens.css §2b.
/// Default source = OS `prefers-color-scheme`, in-app override persisted via SharedPreferences,
/// mirroring web's ThemeService (docs/brand/13-mobile-app-patterns.md §3) — see ThemeController.
ThemeData buildInoTheme(InoPalette p, Brightness brightness) {
  return ThemeData(
    brightness: brightness,
    scaffoldBackgroundColor: p.surface,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: p.accentTextSafe,
      onPrimary: p.onAccent,
      secondary: p.accentSecondary,
      onSecondary: p.onAccent,
      error: p.danger,
      onError: p.onDanger,
      surface: p.surface,
      onSurface: p.onSurface,
    ),
    textTheme: TextTheme(
      displaySmall: TextStyle(fontSize: 38, height: 1.05, fontWeight: FontWeight.w600, color: p.onSurface),
      headlineMedium: TextStyle(fontSize: 32, height: 1.25, fontWeight: FontWeight.w600, color: p.onSurface),
      titleMedium: TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w600, color: p.onSurface),
      bodyLarge: TextStyle(fontSize: 17, height: 1.65, color: p.onSurface),
      bodyMedium: TextStyle(fontSize: 15, height: 1.65, color: p.onSurface), // fluid-density body
      bodySmall: TextStyle(fontSize: 12.5, height: 1.55, color: p.onSurfaceMuted),
      labelLarge: TextStyle(fontSize: 11, letterSpacing: 1.54, fontWeight: FontWeight.w600, color: p.onSurfaceMuted),
    ),
    dividerColor: p.borderSoft,
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: p.surfaceRaised,
      selectedItemColor: p.accent,
      unselectedItemColor: p.onSurfaceMuted,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: p.accent,
        foregroundColor: p.onAccent,
        minimumSize: const Size.fromHeight(InoTarget.comfortable),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(InoRadius.md)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surfaceSunken,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(InoRadius.md),
        borderSide: BorderSide(color: p.border),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: InoSpace.s4, vertical: InoSpace.s3),
    ),
    extensions: [InoPaletteExtension(p)],
  );
}

/// Lets widgets read the full [InoPalette] (incl. roles ThemeData has no 1:1 slot for, like
/// surfaceRaised vs surfaceSunken as distinct roles) via `Theme.of(context).extension()`.
class InoPaletteExtension extends ThemeExtension<InoPaletteExtension> {
  final InoPalette palette;
  const InoPaletteExtension(this.palette);

  @override
  InoPaletteExtension copyWith({InoPalette? palette}) => InoPaletteExtension(palette ?? this.palette);

  @override
  InoPaletteExtension lerp(ThemeExtension<InoPaletteExtension>? other, double t) => this;
}

extension InoPaletteContext on BuildContext {
  InoPalette get inoColors =>
      Theme.of(this).extension<InoPaletteExtension>()?.palette ?? InoPalette.dark;
}
