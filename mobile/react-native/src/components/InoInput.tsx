import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

export type InoInputVariant = 'outline' | 'filled';

/**
 * `<InoInput>` — RN port of `<ino-input>` (web/src/app/components/input, INO-157 / INO-31 U-2).
 * Carries the same uplift scope as the web component: `size`, `variant` (outline/filled), and
 * explicit `disabled`/`readOnly`/`loading` states. No icon-slot prop — matching the web
 * component's scope (SPEC.md §1); T-16/T-17 (`ino-icon-field`/`ino-input-group`) are
 * Capacitor-only per the porting rule, so there is no RN wrapper to compose with yet.
 *
 * `readOnly` uses RN's own `editable={false}` (TextInput has no native "readonly" concept the way
 * HTML does) while keeping `accessibilityState.disabled` false, so the field is still
 * focusable/selectable to AT — the same focusable-but-not-editable distinction the web component's
 * SPEC.md §2 draws between `readonly` and `disabled`.
 */
export function InoInput({
  label,
  hint,
  error,
  size = 'default',
  variant = 'outline',
  disabled = false,
  readOnly = false,
  loading = false,
  style,
  ...inputProps
}: {
  label?: string;
  hint?: string;
  error?: string;
  size?: ControlSize;
  variant?: InoInputVariant;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
} & Omit<TextInputProps, 'editable' | 'style'> & { style?: TextInputProps['style'] }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const sizeTokens = control[size];
  const invalid = !!error;
  const nonEditable = disabled || readOnly || loading;

  const borderColor = invalid
    ? colors.danger
    : focused
      ? colors.accent
      : variant === 'filled'
        ? colors.border
        : colors.border;

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      ) : null}
      <View style={styles.controlWrap}>
        <TextInput
          accessibilityState={{ disabled }}
          editable={!nonEditable}
          placeholderTextColor={colors.onSurfaceSubtle}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          style={[
            styles.control,
            {
              minHeight: sizeTokens.height,
              paddingHorizontal: sizeTokens.paddingInline,
              fontSize: sizeTokens.fontSize,
              color: colors.onSurface,
              backgroundColor: variant === 'filled' ? colors.surfaceRaised : colors.surfaceSunken,
              borderColor,
              borderBottomWidth: variant === 'filled' ? 2 : 1,
              borderRadius: variant === 'filled' ? 0 : 8,
            },
            disabled && styles.disabled,
            loading && { paddingRight: sizeTokens.paddingInline + 24 },
            style,
          ]}
          {...inputProps}
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.onSurfaceMuted}
            style={styles.spinner}
          />
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  label: { fontSize: 14.5, fontWeight: '600' },
  controlWrap: { position: 'relative', justifyContent: 'center' },
  control: { width: '100%' },
  disabled: { opacity: 0.5 },
  spinner: { position: 'absolute', right: space[4] },
  message: { fontSize: 12.5 },
});
