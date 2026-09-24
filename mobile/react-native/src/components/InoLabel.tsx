import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { type, ControlSize } from '../theme/tokens';

const SIZE_STYLE: Record<ControlSize, TextProps['style']> = {
  sm: type.labelSm,
  default: type.label,
  lg: type.labelLg,
};

/**
 * `<InoLabel>` — RN port of `<ino-label>` (web/src/app/components/label, INO-140 / INO-31 T-19).
 * Presentational only, matching the web component's non-interactive contract (SPEC.md §1): no
 * `onPress`, no focus handling — RN has no native `<label for>` concept, so the association with
 * the field this label names is left to the caller (e.g. wrapping both in one `accessible` group,
 * or setting the field's own `accessibilityLabel`), the same way every other RN port in this repo
 * leaves DOM-specific semantics to the platform's own idiom.
 *
 * Uses `type.label`/`type.labelSm`/`type.labelLg` (`theme/tokens.ts`) — the fluid-density
 * form-label type scale W0-3 added and left unconsumed until this issue. Colour aliases
 * (`onSurface`/`onSurfaceMuted`/`onSurfaceSubtle`/`dangerTextSafe`) match the web component's
 * `--ino-color-label*` roles per `form-label-tokens.md` §7 — the RN palette has no dedicated
 * `label*` fields by design, since those are pure web-side aliases of roles already ported.
 */
export function InoLabel({
  size = 'default',
  required = false,
  disabled = false,
  invalid = false,
  readOnly = false,
  children,
  style,
}: {
  size?: ControlSize;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  readOnly?: boolean;
  children?: React.ReactNode;
  style?: TextProps['style'];
}) {
  const { colors } = useTheme();
  const color = disabled
    ? colors.onSurfaceSubtle
    : invalid
      ? colors.dangerTextSafe
      : readOnly
        ? colors.onSurfaceMuted
        : colors.onSurface;

  return (
    <Text style={[SIZE_STYLE[size], { color }, style]}>
      {children}
      {/* Decorative only (SPEC.md §3) — accessibilityElementsHidden keeps it out of the
          accessible name; callers must set accessibilityState/aria-required on the field itself. */}
      {required ? (
        <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.dangerTextSafe }}>
          {' *'}
        </Text>
      ) : null}
    </Text>
  );
}
