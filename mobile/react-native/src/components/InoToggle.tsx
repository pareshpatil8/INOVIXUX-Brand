import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius } from '../theme/tokens';

export type InoToggleSize = ControlSize;

export interface InoToggleProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  invalid?: boolean;
  size?: InoToggleSize;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * `<InoToggle>` — RN port of `<ino-toggle>` (web/src/app/components/toggle, INO-160 / INO-31
 * U-5). RN's own `Switch` pulls its own OS-themed chrome (like `Checkbox`'s reasoning for
 * `InoCheckbox`), so this is a from-scratch `Pressable`-drawn track + thumb instead of a wrap.
 *
 * The icon overlay is drawn the same way `InoCheckbox`'s indeterminate dash is — a `Text` glyph
 * positioned inside the thumb, swapped by `checked` — rather than an image asset. No `Animated`
 * wiring: the thumb re-renders at its new `left` on every `checked` change with no transition,
 * the same "no shared spin/animation primitive exists yet" scope call `InoCheckbox`'s spinner
 * already made.
 *
 * `accessibilityRole="switch"` + `accessibilityState.checked` (a real boolean, never `'mixed'` —
 * unlike `InoCheckbox`, a switch has no indeterminate state) carry the ARIA-equivalent contract.
 */
export function InoToggle({
  label,
  checked = false,
  disabled = false,
  readonly = false,
  loading = false,
  invalid = false,
  size = 'default',
  onCheckedChange,
}: InoToggleProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const thumbSize = dims.iconSize;
  const inset = 2;
  const trackWidth = thumbSize * 2 + inset * 2;
  const trackHeight = thumbSize + inset * 2;
  const isInteractive = !disabled && !readonly && !loading;

  const handlePress = () => {
    if (!isInteractive) return;
    onCheckedChange?.(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled: disabled || loading, busy: loading }}
      accessibilityLabel={label}
      style={[styles.row, { gap: dims.gap, minHeight: dims.height }]}
    >
      <View
        style={[
          styles.track,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: radius.pill,
            backgroundColor: checked ? colors.accent : colors.surfaceSunken,
            borderWidth: checked ? 0 : 1,
            borderColor: invalid ? colors.danger : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              top: inset,
              left: checked ? trackWidth - thumbSize - inset : inset,
              backgroundColor: checked ? colors.onAccent : colors.onSurfaceMuted,
            },
          ]}
        >
          <Text
            style={{
              fontSize: thumbSize * 0.6,
              fontWeight: '700',
              color: checked ? colors.accent : colors.surface,
            }}
          >
            {checked ? '✓' : '✕'}
          </Text>
        </View>
      </View>
      {loading ? (
        <View
          style={[
            styles.spinner,
            { width: thumbSize / 2, height: thumbSize / 2, borderColor: colors.onSurfaceMuted },
          ]}
        />
      ) : null}
      {label ? (
        <Text
          style={[
            styles.label,
            { color: disabled ? colors.onSurfaceMuted : colors.onSurface, fontSize: dims.fontSize },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  track: { justifyContent: 'center' },
  thumb: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // Static ring, not an animated spinner — see the "loading" note in the component doc comment.
  spinner: { borderRadius: 999, borderWidth: 2, borderTopColor: 'transparent' },
  label: { fontWeight: '400' },
});
