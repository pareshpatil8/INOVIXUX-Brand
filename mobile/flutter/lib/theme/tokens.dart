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
  final Color accentActive;
  final Color onAccent;
  final Color success;
  final Color onSuccess;
  final Color warning;
  final Color onWarning;
  final Color danger;
  final Color onDanger;
  /// Danger used as TEXT on a surface (invalid form labels, inline errors, required
  /// markers). Diverges from [danger] in dark mode only — see tokens.css
  /// --ino-color-danger-text-safe / INO-125.
  final Color dangerTextSafe;
  final Color info;
  final Color onInfo;

  /// INO-113 — data-viz layer, tokens.css §13. Categorical = series identity in fixed slot
  /// order; sequential = magnitude (violet, step 8 = highest); diverging = risk delta (cool
  /// azure decrease / warm red increase, neutral midpoint). Audit tables:
  /// docs/brand/24-data-visualization-tokens.md.
  final Color chartCat1;
  final Color chartCat2;
  final Color chartCat3;
  final Color chartCat4;
  final Color chartCat5;
  final Color chartCat6;
  final Color chartSeq1;
  final Color chartSeq2;
  final Color chartSeq3;
  final Color chartSeq4;
  final Color chartSeq5;
  final Color chartSeq6;
  final Color chartSeq7;
  final Color chartSeq8;
  final Color chartDivNeg3;
  final Color chartDivNeg2;
  final Color chartDivNeg1;
  final Color chartDivMid;
  final Color chartDivPos1;
  final Color chartDivPos2;
  final Color chartDivPos3;

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
    required this.accentActive,
    required this.onAccent,
    required this.success,
    required this.onSuccess,
    required this.warning,
    required this.onWarning,
    required this.danger,
    required this.onDanger,
    required this.dangerTextSafe,
    required this.info,
    required this.onInfo,
    required this.chartCat1,
    required this.chartCat2,
    required this.chartCat3,
    required this.chartCat4,
    required this.chartCat5,
    required this.chartCat6,
    required this.chartSeq1,
    required this.chartSeq2,
    required this.chartSeq3,
    required this.chartSeq4,
    required this.chartSeq5,
    required this.chartSeq6,
    required this.chartSeq7,
    required this.chartSeq8,
    required this.chartDivNeg3,
    required this.chartDivNeg2,
    required this.chartDivNeg1,
    required this.chartDivMid,
    required this.chartDivPos1,
    required this.chartDivPos2,
    required this.chartDivPos3,
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
    accentActive: Color(0xFF6A44E8), // INO-123 — pressed/:active accent fill
    onAccent: Color(0xFFFFFFFF),
    success: Color(0xFF3A9B6B),
    onSuccess: Color(0xFF000000),
    warning: Color(0xFFB98A3C),
    onWarning: Color(0xFF000000),
    danger: Color(0xFFC24C43),
    onDanger: Color(0xFFFFFFFF),
    dangerTextSafe: Color(0xFFDE6A61), // danger-500 is only 4.16:1 on dark surface, fails AA 1.4.3 as text
    info: Color(0xFF3D92BD), // INO-128 — fourth, non-alarming severity register
    onInfo: Color(0xFF000000),
    // INO-113 — data-viz layer, tokens.css §13 dark-mode values.
    chartCat1: Color(0xFF4683C5),
    chartCat2: Color(0xFFC95A8B),
    chartCat3: Color(0xFF829417),
    chartCat4: Color(0xFFAF62C1),
    chartCat5: Color(0xFFC56B23),
    chartCat6: Color(0xFF1E9997),
    chartSeq1: Color(0xFF4F417E),
    chartSeq2: Color(0xFF63529C),
    chartSeq3: Color(0xFF7764BA),
    chartSeq4: Color(0xFF8C77D6),
    chartSeq5: Color(0xFFA18EE8),
    chartSeq6: Color(0xFFB5A9EF),
    chartSeq7: Color(0xFFCBC2F8),
    chartSeq8: Color(0xFFE1DDF9),
    chartDivNeg3: Color(0xFF589CE6),
    chartDivNeg2: Color(0xFF467DB9),
    chartDivNeg1: Color(0xFF3A6089),
    chartDivMid: Color(0xFF383836),
    chartDivPos1: Color(0xFF894840),
    chartDivPos2: Color(0xFFBB584D),
    chartDivPos3: Color(0xFFE66F62),
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
    accentActive: Color(0xFF3F37C9), // pressed — darkens the indigo, light mode's filled-accent role
    onAccent: Color(0xFFFFFFFF),
    success: Color(0xFF1F7A4F),
    onSuccess: Color(0xFFFFFFFF),
    warning: Color(0xFF8A5D1E),
    onWarning: Color(0xFFFFFFFF),
    danger: Color(0xFFA6362D),
    onDanger: Color(0xFFFFFFFF),
    dangerTextSafe: Color(0xFFA6362D), // light's fill red is already a legible text red — roles converge
    info: Color(0xFF226587),
    onInfo: Color(0xFFFFFFFF),
    // INO-113 — categorical identical to dark (shared identity across the theme toggle);
    // ramps re-stepped so the strong end anchors against this light surface.
    chartCat1: Color(0xFF4683C5),
    chartCat2: Color(0xFFC95A8B),
    chartCat3: Color(0xFF829417),
    chartCat4: Color(0xFFAF62C1),
    chartCat5: Color(0xFFC56B23),
    chartCat6: Color(0xFF1E9997),
    chartSeq1: Color(0xFFB4A8EB),
    chartSeq2: Color(0xFFA193DD),
    chartSeq3: Color(0xFF8F7ECF),
    chartSeq4: Color(0xFF7D6ABF),
    chartSeq5: Color(0xFF6B57AC),
    chartSeq6: Color(0xFF5A4697),
    chartSeq7: Color(0xFF49367F),
    chartSeq8: Color(0xFF392866),
    chartDivNeg3: Color(0xFF2F74BB),
    chartDivNeg2: Color(0xFF6193CB),
    chartDivNeg1: Color(0xFF8EB1DA),
    chartDivMid: Color(0xFFEBEBE9),
    chartDivPos1: Color(0xFFD79E95),
    chartDivPos2: Color(0xFFC97469),
    chartDivPos3: Color(0xFFB9473D),
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
    accentActive: Color(0xFFE6BC00), // pressed — 11.56:1 with black, keeps AAA
    onAccent: Color(0xFF000000),
    success: Color(0xFF00E676),
    onSuccess: Color(0xFF000000),
    warning: Color(0xFFFFC400),
    onWarning: Color(0xFF000000),
    danger: Color(0xFFFF6B6B),
    onDanger: Color(0xFF000000),
    dangerTextSafe: Color(0xFFFF6B6B), // clears this theme's AAA bar as text — roles converge
    info: Color(0xFF6BB6FF), // true blue — accentSecondary already owns cyan in this theme
    onInfo: Color(0xFF000000),
    // INO-113 — high-contrast restep: same hue families at the top of the dark lightness
    // band (~6:1 on pure black), ramps stretched wider than dark mode's.
    chartCat1: Color(0xFF5896D9),
    chartCat2: Color(0xFFD76797),
    chartCat3: Color(0xFF8B9D26),
    chartCat4: Color(0xFFBC6ECE),
    chartCat5: Color(0xFFD37732),
    chartCat6: Color(0xFF15A7A5),
    chartSeq1: Color(0xFF5A4A90),
    chartSeq2: Color(0xFF6E5CAD),
    chartSeq3: Color(0xFF836FC9),
    chartSeq4: Color(0xFF9883E3),
    chartSeq5: Color(0xFFAC9CF0),
    chartSeq6: Color(0xFFC2B7F7),
    chartSeq7: Color(0xFFD8D1FD),
    chartSeq8: Color(0xFFEEECFB),
    chartDivNeg3: Color(0xFFADD1FB),
    chartDivNeg2: Color(0xFF64A2E7),
    chartDivNeg1: Color(0xFF4374AA),
    chartDivMid: Color(0xFF535350),
    chartDivPos1: Color(0xFFAD5349),
    chartDivPos2: Color(0xFFE8796C),
    chartDivPos3: Color(0xFFF69C8F),
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

/// Font pairing (INO-119) — tokens.css §4's mandatory fallback chain, ported as data. Unlike
/// React Native, Flutter's `TextStyle.fontFamilyFallback` genuinely supports an ordered list
/// like CSS does, so [displayFallback] can be passed there directly once the `.ttf` assets are
/// declared in pubspec.yaml (not done in this pass — same "flagged, not fetched" status as Geist
/// itself on this platform). No Devanagari-safe line-height variants are ported here: tokens.dart
/// has no font-size/line-height scale at all yet (a pre-existing gap, not introduced by this
/// ticket) — see tokens.css README §Indic/Devanagari typography pairing.
class InoFont {
  static const String display = 'Geist';
  static const List<String> displayFallback = ['Noto Sans Devanagari'];
}

/// tokens.css §12 — control-size scale behind the `size` prop, FLUID resolution only
/// (mobile is always fluid, same rule as [inoRowMinHeight]). `standard` is the port of
/// size="default": `default` is a reserved word in Dart and cannot name a member, so the
/// one place this scale's names diverge from the web API is here, on purpose.
/// check-theme-parity.mjs asserts every number below against the CSS — edit tokens.css first.
class InoControlSize {
  const InoControlSize({
    required this.height,
    required this.paddingInline,
    required this.paddingInlineRoomy,
    required this.fontSize,
    required this.iconSize,
    required this.gap,
  });

  final double height;
  final double paddingInline;
  final double paddingInlineRoomy;
  final double fontSize;
  final double iconSize;
  final double gap;

  static const sm = InoControlSize(
      height: 36, paddingInline: 12, paddingInlineRoomy: 16, fontSize: 12.5, iconSize: 16, gap: 8);
  static const standard = InoControlSize(
      height: 44, paddingInline: 16, paddingInlineRoomy: 20, fontSize: 15, iconSize: 20, gap: 8);
  static const lg = InoControlSize(
      height: 52, paddingInline: 20, paddingInlineRoomy: 24, fontSize: 17, iconSize: 24, gap: 12);
}

/// tokens.css §9 — motion durations (ms) / Flutter Curves equivalents.
class InoMotion {
  static const Duration fast = Duration(milliseconds: 120);
  static const Duration base = Duration(milliseconds: 200);
  static const Duration slow = Duration(milliseconds: 480);
  static const Curve easingStandard = Cubic(0.2, 0, 0, 1);
  static const Curve easingDecelerate = Cubic(0, 0, 0, 1);
  static const Curve easingAccelerate = Cubic(0.3, 0, 1, 1);
}

/// tokens.css §9b — read-time for transient, self-dismissing surfaces. Not a motion duration
/// (see tokens.css §9b for why dwell is its own scale, INO-174).
class InoDwell {
  static const Duration toast = Duration(milliseconds: 5000);
}
