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
  accentActive: '#6A44E8', // INO-123 — pressed/:active accent fill; 5.83:1 with onAccent
  onAccent: '#FFFFFF',
  success: '#3A9B6B',
  onSuccess: '#000000',
  warning: '#B98A3C',
  onWarning: '#000000',
  danger: '#C24C43',
  dangerTextSafe: '#DE6A61', // danger as TEXT: danger itself is only 4.16:1 on surface and fails AA 1.4.3
  onDanger: '#FFFFFF',
  info: '#3D92BD', // INO-128 — fourth, non-alarming severity register; see tokens.css §2
  onInfo: '#000000',
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
  accentActive: '#3F37C9', // pressed — darkens the indigo, since indigo is light mode's filled-accent role
  onAccent: '#FFFFFF',
  success: '#1F7A4F',
  onSuccess: '#FFFFFF',
  warning: '#8A5D1E',
  onWarning: '#FFFFFF',
  danger: '#A6362D',
  dangerTextSafe: '#A6362D', // light's fill red is already a legible text red — roles converge
  onDanger: '#FFFFFF',
  info: '#226587',
  onInfo: '#FFFFFF',
} as const;

// Third theme, added INO-92 — WCAG 2.2 AAA target (7:1+), not just the AA floor dark/light hit.
// Same role set as colorsDark/colorsLight (Palette type below still applies), values ported 1:1
// from tokens.css §2c [data-theme="high-contrast"]. Full contrast audit: docs/brand/
// 02-design-tokens/README.md §Contrast (high-contrast).
export const colorsHighContrast = {
  surface: '#000000',
  surfaceRaised: '#050505',
  surfaceSunken: '#000000',
  onSurface: '#FFFFFF',
  onSurfaceMuted: '#AAAAAA', // 9.04:1 on surface — AAA body text
  onSurfaceSubtle: '#5A5A5C', // decorative/disabled only, same rule as dark/light
  overlayScrim: 'rgba(0, 0, 0, 0.92)',
  border: '#FFFFFF', // solid, opaque — not a translucent hairline like dark/light
  borderSoft: 'rgba(255, 255, 255, 0.5)',
  accent: '#FFD60A',
  accentSecondary: '#00E5FF',
  accentTextSafe: '#FFD60A', // 14.88:1 on surface — AAA even as small body text
  accentActive: '#E6BC00', // pressed — 11.56:1 with black, so the press keeps its AAA budget
  onAccent: '#000000', // white on this yellow is 1.41:1 — must be black, unlike dark/light's white
  success: '#00E676',
  onSuccess: '#000000',
  warning: '#FFC400',
  onWarning: '#000000',
  danger: '#FF6B6B', // brightest red that still clears 7:1 both directions — see README
  dangerTextSafe: '#FF6B6B', // clears this theme's AAA bar as text — roles converge
  onDanger: '#000000',
  info: '#6BB6FF', // true blue, not a second cyan — accentSecondary already owns #00E5FF here
  onInfo: '#000000',
} as const;

// Gradient stops for accent surfaces (LinearGradient colors prop) — same stops as
// --ino-gradient-accent in both themes.
export const gradientAccent = ['#7C5CFC', '#4F46E5'] as const;
export const gradientAccentHighContrast = ['#FFD60A', '#00E5FF'] as const;

// High-contrast mode disables decorative glow — see tokens.css §2c note. No RN component
// currently renders --ino-glow-accent (no shadow/elevation tokens exist in this file either),
// so there's nothing to null out here; flagged so a future glow/shadow port doesn't miss it.

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

// tokens.css §12 — control-size scale behind the `size` prop. These are the FLUID resolution
// only, because mobile is always fluid (same rule as rowMinHeight above); the dense column of
// that table has no mobile counterpart by design, so porting it would just be dead values that
// drift. `default` matches targetComfortable (44) — the platform HIG minimum — which is why
// mobile has no reason to reach for `lg` on ordinary controls.
// check-theme-parity.mjs asserts every number below against the CSS, so edit tokens.css first.
export const control = {
  sm: { height: 36, paddingInline: 12, paddingInlineRoomy: 16, fontSize: 12.5, iconSize: 16, gap: 8 },
  default: { height: 44, paddingInline: 16, paddingInlineRoomy: 20, fontSize: 15, iconSize: 20, gap: 8 },
  lg: { height: 52, paddingInline: 20, paddingInlineRoomy: 24, fontSize: 17, iconSize: 24, gap: 12 },
} as const;

export type ControlSize = keyof typeof control;

export const type = {
  displaySm: { fontSize: 38, lineHeight: 38 * 1.05, fontWeight: '600' as const },
  h2: { fontSize: 32, lineHeight: 32 * 1.25, fontWeight: '600' as const },
  h3: { fontSize: 16, lineHeight: 16 * 1.4, fontWeight: '600' as const },
  bodyLg: { fontSize: 17, lineHeight: 17 * 1.65, fontWeight: '400' as const },
  body: { fontSize: 15, lineHeight: 15 * 1.65, fontWeight: '400' as const }, // fluid-density body size
  bodySm: { fontSize: 12.5, lineHeight: 12.5 * 1.55, fontWeight: '400' as const },
  // Mono UPPERCASE display accent — section kickers, group headers. Renamed from `label` in
  // INO-125: the name now belongs to the form-label set below. Values unchanged.
  eyebrow: { fontSize: 11, letterSpacing: 1.54, fontWeight: '600' as const }, // 0.14em @ 11px

  // Form-label set — tokens.css §4b. Mobile is always fluid density
  // (13-mobile-app-patterns.md §3), so these mirror the [data-density="fluid"] column, not the
  // :root defaults — exactly as `body` above already does. letterSpacing is px (RN has no em),
  // computed at the listed size. check-theme-parity.mjs asserts all of it against the CSS.
  labelLg: { fontSize: 16, lineHeight: 16 * 1.35, fontWeight: '500' as const, letterSpacing: -0.16 },
  label: { fontSize: 14.5, lineHeight: 14.5 * 1.45, fontWeight: '500' as const, letterSpacing: 0 },
  labelSm: { fontSize: 12, lineHeight: 12 * 1.4, fontWeight: '500' as const, letterSpacing: 0.06 },
  hint: { fontSize: 13, lineHeight: 13 * 1.55, fontWeight: '400' as const, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 12 * 1.5, fontWeight: '400' as const, letterSpacing: 0.12 },
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

// Widened to plain `string` per key — `typeof colorsDark` would pin every value to its dark-mode
// literal, which then rejects colorsLight's (differently-literal) values at the ThemeProvider
// call site that picks between the two at runtime.
export type Palette = { [K in keyof typeof colorsDark]: string };
