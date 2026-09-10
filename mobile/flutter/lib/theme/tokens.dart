import 'package:flutter/material.dart';

/// INOVIXUX design tokens, ported for Flutter.
///
/// Source of truth: docs/brand/02-design-tokens/tokens.css (INO-31). Mirrors the semantic role
/// values 1:1 as Dart constants — Flutter has no CSS custom properties, so each theme (dark/light)
/// gets its own [InoPalette] instance instead of runtime var() resolution. Follows tokens.css,
/// never edited independently of it. Mobile-relevant subset only (no dense-mode values — mobile
/// is always fluid per docs/brand/13-mobile-app-patterns.md §3).
class InoPalette {
  final Color surface;
  final Color surfaceRaised;
  final Color surfaceSunken;
  final Color onSurface;
  final Color onSurfaceMuted;
  final Color onSurfaceSubtle;
  final Color overlayScrim;
  final Color border;
  final Color borderSoft;
  final Color accent;
  final Color accentSecondary;
  final Color accentTextSafe;
  final Color onAccent;
  final Color success;
  final Color onSuccess;
  final Color warning;
  final Color onWarning;
  final Color danger;
  final Color onDanger;

  const InoPalette({
    required this.surface,
    required this.surfaceRaised,
    required this.surfaceSunken,
    required this.onSurface,
    required this.onSurfaceMuted,
    required this.onSurfaceSubtle,
    required this.overlayScrim,
    required this.border,
    required this.borderSoft,
    required this.accent,
    required this.accentSecondary,
    required this.accentTextSafe,
    required this.onAccent,
    required this.success,
    required this.onSuccess,
    required this.warning,
    required this.onWarning,
    required this.danger,
    required this.onDanger,
  });

  static const dark = InoPalette(
    surface: Color(0xFF0A0A0A),
    surfaceRaised: Color(0xFF0D0D0E),
    surfaceSunken: Color(0xFF000000),
    onSurface: Color(0xFFF5F5F4),
    onSurfaceMuted: Color(0xFF8C8C8E),
    onSurfaceSubtle: Color(0xFF5A5A5C), // decorative/disabled only — fails AA as text
    overlayScrim: Color(0xB8000000), // rgba(0,0,0,0.72)
    border: Color(0x1AFFFFFF), // rgba(255,255,255,0.10)
    borderSoft: Color(0x0FFFFFFF), // rgba(255,255,255,0.06)
    accent: Color(0xFF7C5CFC),
    accentSecondary: Color(0xFF4F46E5),
    accentTextSafe: Color(0xFF7C5CFC),
    onAccent: Color(0xFFFFFFFF),
    success: Color(0xFF3A9B6B),
    onSuccess: Color(0xFF000000),
    warning: Color(0xFFB98A3C),
    onWarning: Color(0xFF000000),
    danger: Color(0xFFC24C43),
    onDanger: Color(0xFFFFFFFF),
  );

  static const light = InoPalette(
    surface: Color(0xFFFAFAFA),
    surfaceRaised: Color(0xFFFFFFFF),
    surfaceSunken: Color(0xFFEFEFED),
    onSurface: Color(0xFF14141A),
    onSurfaceMuted: Color(0xFF55555C),
    onSurfaceSubtle: Color(0xFF8C8C8E),
    overlayScrim: Color(0x6614141A), // rgba(20,20,26,0.4) — fixed INO-92 drift audit: blue channel was 0x16 (22), tokens.css charcoal primitive is 0x1A (26)
    border: Color(0x1A0A0A0A), // rgba(10,10,10,0.10)
    borderSoft: Color(0x0F0A0A0A), // rgba(10,10,10,0.06)
    accent: Color(0xFF7C5CFC),
    accentSecondary: Color(0xFF4F46E5),
    accentTextSafe: Color(0xFF4F46E5), // 6.29:1 on white — text/links/filled buttons on light
    onAccent: Color(0xFFFFFFFF),
    success: Color(0xFF1F7A4F),
    onSuccess: Color(0xFFFFFFFF),
    warning: Color(0xFF8A5D1E),
    onWarning: Color(0xFFFFFFFF),
    danger: Color(0xFFA6362D),
    onDanger: Color(0xFFFFFFFF),
  );

  static const highContrast = InoPalette(
    surface: Color(0xFF000000),
    surfaceRaised: Color(0xFF050505),
    surfaceSunken: Color(0xFF000000),
    onSurface: Color(0xFFFFFFFF),
    onSurfaceMuted: Color(0xFFAAAAAA),
    onSurfaceSubtle: Color(0xFF5A5A5C),
    overlayScrim: Color(0xEB000000),
    border: Color(0xFFFFFFFF),
    borderSoft: Color(0x80FFFFFF),
    accent: Color(0xFFFFD60A),
    accentSecondary: Color(0xFF00E5FF),
    accentTextSafe: Color(0xFFFFD60A),
    onAccent: Color(0xFF000000),
    success: Color(0xFF00E676),
    onSuccess: Color(0xFF000000),
    warning: Color(0xFFFFC400),
    onWarning: Color(0xFF000000),
    danger: Color(0xFFFF6B6B),
    onDanger: Color(0xFF000000),
  );
}

/// tokens.css §5 — space scale (t-shirt tokens, px == logical pixels in Flutter).
/// s10/s11 added INO-92 for parity with mobile/react-native/src/theme/tokens.ts — both mobile
/// ports previously stopped at s9; s10/s11 exist in tokens.css and RN already had them.
class InoSpace {
  static const double s1 = 4, s2 = 8, s3 = 12, s4 = 16, s5 = 20, s6 = 24, s7 = 32, s8 = 40, s9 = 56,
      s10 = 80, s11 = 96;
}

/// tokens.css §6 — radius scale.
class InoRadius {
  static const double sm = 6, md = 8, lg = 10, xl = 14, pill = 20;
}

/// tokens.css §7 — touch targets. Mobile always uses -comfortable per
/// docs/brand/13-mobile-app-patterns.md §1/§3, never -min (dense-mode desktop exception only).
class InoTarget {
  static const double comfortable = 44, spacing = 8;
}

/// tokens.css §10 [data-density="fluid"] row height — mobile never uses dense.
const double inoRowMinHeight = 44;

/// tokens.css §9 — motion durations (ms) / Flutter Curves equivalents.
class InoMotion {
  static const Duration fast = Duration(milliseconds: 120);
  static const Duration base = Duration(milliseconds: 200);
  static const Duration slow = Duration(milliseconds: 480);
  static const Curve easingStandard = Cubic(0.2, 0, 0, 1);
  static const Curve easingDecelerate = Cubic(0, 0, 0, 1);
  static const Curve easingAccelerate = Cubic(0.3, 0, 1, 1);
}
