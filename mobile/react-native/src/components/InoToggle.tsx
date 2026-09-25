import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, rowMinHeight } from '../theme/tokens';

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
 * U-5). RN's own `Switch` pulls its own OS-themed chrome that doesn't track this design system's
 * token set (the same reason `InoButton`'s RN port doesn't wrap a native control either), so this
 * is a from-scratch `Pressable`-drawn track + thumb instead of a wrap.
 *
 * The icon overlay is a `Text` glyph positioned inside the thumb, swapped by `checked`, rather
 * than an image asset — plain text, not an icon-font dependency, mirroring the web component's
 * own glyph choice (§2 of that component's SPEC.md). The thumb position uses RN's logical
 * `start`/`end` layout props (not `left`/`right`), which RN mirrors automatically under RTL —
 * the same fix the web component's `inset-inline-start` migration made (SPEC.md §7/§9). No
 * `Animated` wiring: the thumb re-renders at its new position on every `checked` change with no
 * transition — a scope reduction for this issue, not a hard technical constraint.
 *
 * `accessibilityRole="switch"` + `accessibilityState.checked` (a real boolean, never `'mixed'` —
 * a switch has no indeterminate state) carry the ARIA-equivalent contract.
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
      style={[styles.row, { gap: dims.gap, minHeight: rowMinHeight }]}
    >
      <View
        style={[
          styles.track,
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: radius.pill,
            backgroundColor: checked ? colors.accent : colors.surfaceSunken,
            // `invalid` always gets a visible border, checked or not — a border that only shows
            // up when unchecked (the old `checked ? 0 : 1`) makes the danger colour disappear on
            // exactly the state most likely to need it (an invalid control the user just turned
            // on). Un-invalid keeps the prior checked/unchecked border-width split.
            borderWidth: invalid ? 2 : checked ? 0 : 1,
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
              // Logical `start`, not `left` — RN mirrors `start`/`end` under RTL automatically,
              // the same fix the web component's `inset-inline-start` migration made.
              start: checked ? trackWidth - thumbSize - inset : inset,
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
