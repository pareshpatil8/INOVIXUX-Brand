import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius } from '../theme/tokens';

/**
 * `InoButton` — React Native port of `web/src/app/components/button/ino-button.component.ts`
 * (INO-156). Re-authored, not shared: RN has no CSS custom properties, so every value below reads
 * the same `control`/`radius`/theme-role names the web component reads, rather than a literal.
 *
 * Web-only states that have no RN equivalent are dropped rather than faked:
 * - `hover` — no pointer on touch hardware.
 * - `:focus-visible` ring — RN has no keyboard-vs-touch focus distinction; external-keyboard
 *   focus is an OS-level highlight this component does not need to draw itself.
 * `:active` (pressed) and `loading`/`disabled` are the two states that DO carry over and both are
 * implemented below, same as web.
 */

export type InoButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';

export function InoButton({
  variant = 'primary',
  size = 'default',
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: {
  variant?: InoButtonVariant;
  size?: ControlSize;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Required when variant === 'icon' and there is no visible `label` — same contract as web. */
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const isDisabled = disabled || loading;

  const fillFor = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return pressed ? colors.accentActive : colors.accent;
      case 'danger':
        return colors.danger;
      case 'secondary':
        return pressed ? colors.surfaceSunken : colors.surfaceRaised;
      case 'ghost':
      case 'icon':
        return pressed ? colors.surfaceSunken : 'transparent';
    }
  };

  const textColorFor = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.onAccent;
      case 'secondary':
        return colors.onSurface;
      case 'ghost':
      case 'icon':
        return pressed ? colors.accentActive : colors.onSurfaceMuted;
    }
  };

  const borderColorFor = (pressed: boolean) =>
    variant === 'secondary' ? (pressed ? colors.accentActive : colors.border) : 'transparent';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // -comfortable minimum hit area even on `sm`, so the tappable region never drops below
      // tokens.css §7's 44px guidance regardless of the visual size chosen.
      hitSlop={variant === 'icon' ? undefined : 8}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: c.height,
          minWidth: variant === 'icon' ? c.height : undefined,
          paddingHorizontal: variant === 'icon' ? 0 : c.paddingInlineRoomy,
          borderRadius: radius.md,
          gap: c.gap,
          backgroundColor: fillFor(pressed),
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: borderColorFor(pressed),
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {({ pressed }) => (
        <View style={styles.row}>
          {loading && (
            <ActivityIndicator
              size="small"
              color={textColorFor(pressed)}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          )}
          {label !== undefined && (
            <Text
              style={{
                color: textColorFor(pressed),
                fontSize: c.fontSize,
                fontWeight: '600',
                opacity: loading ? 0.6 : 1,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
