import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize } from '../theme/tokens';

export type InoRadioSize = ControlSize;

export interface InoRadioProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  invalid?: boolean;
  size?: InoRadioSize;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * `<InoRadio>` — RN port of `<ino-radio>` (web/src/app/components/radio-group,
 * INO-159 / INO-31 U-4). Mirrors `<InoCheckbox>`'s from-scratch `Pressable`-drawn approach (RN has
 * no native radio primitive either), swapping the checkmark/dash glyph for a filled inner dot and
 * `accessibilityRole="radio"` in place of `"checkbox"`. No `'mixed'` state exists for a radio, so
 * `accessibilityState.checked` only ever carries a plain boolean, unlike `<InoCheckbox>`'s
 * three-way value.
 *
 * `checked` is caller-managed, same as `<InoCheckbox>` — this component never toggles its own
 * `checked` prop; `<InoRadioGroup>` (or a caller wiring up several standalone `<InoRadio>`s) owns
 * which option is selected. RN has no native mutual-exclusion primitive to lean on (unlike web's
 * shared-`name` `<input type="radio">` grouping), so that owner is solely responsible for
 * unchecking siblings — see `<InoRadioGroup>`'s own doc comment.
 */
export function InoRadio({
  label,
  checked = false,
  disabled = false,
  readonly = false,
  loading = false,
  invalid = false,
  size = 'default',
  onCheckedChange,
}: InoRadioProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const dotSize = dims.iconSize;
  const isInteractive = !disabled && !readonly && !loading;

  const handlePress = () => {
    if (!isInteractive) return;
    onCheckedChange?.(true);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="radio"
      accessibilityState={{
        checked,
        disabled: disabled || loading,
        busy: loading,
      }}
      accessibilityLabel={label}
      style={[styles.row, { gap: dims.gap, minHeight: dims.height }]}
    >
      <View
        style={[
          styles.ring,
          {
            width: dotSize,
            height: dotSize,
            borderColor: invalid ? colors.danger : checked ? colors.accent : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {checked ? (
          <View
            style={[
              styles.dot,
              { width: dotSize * 0.5, height: dotSize * 0.5, backgroundColor: colors.accent },
            ]}
          />
        ) : null}
      </View>
      {loading ? (
        <View
          style={[
            styles.spinner,
            { width: dotSize / 2, height: dotSize / 2, borderColor: colors.onSurfaceMuted },
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
  ring: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 999 },
  dot: { borderRadius: 999 },
  // Static ring, not an animated spinner — same scope call `InoCheckbox`'s RN port already made.
  spinner: { borderRadius: 999, borderWidth: 2, borderTopColor: 'transparent' },
  label: { fontWeight: '400' },
});
