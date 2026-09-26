import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius } from '../theme/tokens';

export type InoCheckboxSize = ControlSize;

export interface InoCheckboxProps {
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  invalid?: boolean;
  size?: InoCheckboxSize;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * `<InoCheckbox>` — RN port of `<ino-checkbox>` (web/src/app/components/checkbox,
 * INO-158 / INO-31 U-3). Unlike `<InoTag>` (which only restyles a native-feeling `View`), RN has no
 * native checkbox primitive at all, so this is a from-scratch `Pressable` + drawn box — the web
 * component's "restyle a real `<input>`" approach has no RN equivalent to lean on.
 *
 * `indeterminate` draws an explicit dash rather than delegating to a platform control (there is
 * none to delegate to); `accessibilityState.checked` accepts `true | false | 'mixed'` directly —
 * the same three-way value `aria-checked` carries on web — so the mixed state reaches assistive
 * tech the same way.
 *
 * `readonly` and `loading` both fall out of the same `isInteractive` gate rather than separate
 * disabled-style dimming: readonly keeps full opacity (content must stay legible), loading also
 * keeps full opacity and adds a static busy ring (no animation wiring exists elsewhere in this app
 * for spinners yet — same scope call `InoTag`'s RN port already made by shipping no `loading`
 * prop at all).
 */
export function InoCheckbox({
  label,
  checked = false,
  indeterminate = false,
  disabled = false,
  readonly = false,
  loading = false,
  invalid = false,
  size = 'default',
  onCheckedChange,
}: InoCheckboxProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const boxSize = dims.iconSize;
  const isInteractive = !disabled && !readonly && !loading;
  const filled = checked || indeterminate;

  const handlePress = () => {
    if (!isInteractive) return;
    onCheckedChange?.(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: indeterminate ? 'mixed' : checked,
        disabled: disabled || loading,
        busy: loading,
      }}
      accessibilityLabel={label}
      style={[styles.row, { gap: dims.gap, minHeight: dims.height }]}
    >
      <View
        style={[
          styles.box,
          {
            width: boxSize,
            height: boxSize,
            borderRadius: radius.sm,
            borderColor: invalid ? colors.danger : filled ? colors.accent : colors.border,
            backgroundColor: filled ? colors.accent : 'transparent',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {checked && !indeterminate ? (
          <Text style={[styles.glyph, { color: colors.onAccent, fontSize: boxSize * 0.7 }]}>
            {'✓'}
          </Text>
        ) : null}
        {indeterminate ? (
          <View style={[styles.dash, { backgroundColor: colors.onAccent, width: boxSize * 0.5 }]} />
        ) : null}
      </View>
      {loading ? (
        <View
          style={[
            styles.spinner,
            { width: boxSize / 2, height: boxSize / 2, borderColor: colors.onSurfaceMuted },
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
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  glyph: { fontWeight: '700' },
  dash: { height: 2 },
  // Static ring, not an animated spinner — see the "loading" note in the component doc comment.
  spinner: { borderRadius: 999, borderWidth: 2, borderTopColor: 'transparent' },
  label: { fontWeight: '400' },
});
