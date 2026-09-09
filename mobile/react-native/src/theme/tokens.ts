/**
 * INOVIXUX design tokens, ported for React Native.
 *
 * Source of truth: docs/brand/02-design-tokens/tokens.css (INO-31). This file mirrors the
 * DARK-MODE semantic role values 1:1 as plain JS values (RN has no CSS custom properties),
 * scoped to what the mobile screen inventory (docs/brand/15-mobile-screen-inventory.md) and
 * pattern set (docs/brand/13-mobile-app-patterns.md) actually consume — not the full desktop
 * token set (no dense-mode values: 13-mobile-app-patterns.md §3 says mobile is always fluid).
 *
 * Do not hand-edit values here without updating tokens.css first — this file follows that one,
 * never the reverse. Light-mode values included per 13-…patterns.md §3 (OS default + in-app
 * override, same values as tokens.css §2b).
 */

export const colorsDark = {
  surface: '#0A0A0A',
  surfaceRaised: '#0D0D0E',
  surfaceSunken: '#000000',
  onSurface: '#F5F5F4',
  onSurfaceMuted: '#8C8C8E',
  onSurfaceSubtle: '#5A5A5C', // decorative/disabled only — fails AA as text, see tokens.css
  overlayScrim: 'rgba(0, 0, 0, 0.72)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderSoft: 'rgba(255, 255, 255, 0.06)',
  accent: '#7C5CFC',
  accentSecondary: '#4F46E5',
  accentTextSafe: '#7C5CFC',
  onAccent: '#FFFFFF',
  success: '#3A9B6B',
  onSuccess: '#000000',
  warning: '#B98A3C',
  onWarning: '#000000',
  danger: '#C24C43',
  onDanger: '#FFFFFF',
} as const;

export const colorsLight = {
  surface: '#FAFAFA',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#EFEFED',
  onSurface: '#14141A',
  onSurfaceMuted: '#55555C',
  onSurfaceSubtle: '#8C8C8E',
  overlayScrim: 'rgba(20, 20, 26, 0.4)',
  border: 'rgba(10, 10, 10, 0.10)',
  borderSoft: 'rgba(10, 10, 10, 0.06)',
  accent: '#7C5CFC',
  accentSecondary: '#4F46E5',
  accentTextSafe: '#4F46E5', // 6.29:1 on white — use for text/links/filled buttons on light
  onAccent: '#FFFFFF',
  success: '#1F7A4F',
  onSuccess: '#FFFFFF',
  warning: '#8A5D1E',
  onWarning: '#FFFFFF',
  danger: '#A6362D',
  onDanger: '#FFFFFF',
} as const;

// Gradient stops for accent surfaces (LinearGradient colors prop) — same stops as
// --ino-gradient-accent in both themes.
export const gradientAccent = ['#7C5CFC', '#4F46E5'] as const;

export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 80, 11: 96,
} as const;

export const radius = {
  sm: 6, md: 8, lg: 10, xl: 14, pill: 20,
} as const;

// Touch targets — tokens.css §7. Mobile is always -comfortable per 13-…patterns.md §1/§3,
// never -min (that's a dense-mode desktop exception only).
export const targetComfortable = 44;
export const targetSpacing = 8;

// Fluid density row height — tokens.css §10 [data-density="fluid"]. Mobile never uses dense.
export const rowMinHeight = 44;

export const type = {
  displaySm: { fontSize: 38, lineHeight: 38 * 1.05, fontWeight: '600' as const },
  h2: { fontSize: 32, lineHeight: 32 * 1.25, fontWeight: '600' as const },
  h3: { fontSize: 16, lineHeight: 16 * 1.4, fontWeight: '600' as const },
  bodyLg: { fontSize: 17, lineHeight: 17 * 1.65, fontWeight: '400' as const },
  body: { fontSize: 15, lineHeight: 15 * 1.65, fontWeight: '400' as const }, // fluid-density body size
  bodySm: { fontSize: 12.5, lineHeight: 12.5 * 1.55, fontWeight: '400' as const },
  label: { fontSize: 11, letterSpacing: 1.54, fontWeight: '600' as const }, // 0.14em @ 11px
};

export const motion = {
  durationFast: 120,
  durationBase: 200,
  durationSlow: 480,
  // RN Easing equivalents wired up where each curve is used (Easing.bezier(...)), not here —
  // keeping this file free of the 'react-native' import so it stays theme-data-only.
  easingStandard: [0.2, 0, 0, 1] as const,
  easingDecelerate: [0, 0, 0, 1] as const,
  easingAccelerate: [0.3, 0, 1, 1] as const,
};

export type Palette = typeof colorsDark;
