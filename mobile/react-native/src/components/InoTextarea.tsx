import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

export type InoTextareaVariant = 'outline' | 'filled';

/**
 * `<InoTextarea>` — RN port of `<ino-textarea>` (web/src/app/components/textarea, INO-147 /
 * INO-31 T-7). Carries the same scope as the web component: `size`, `variant`
 * (outline/filled), `disabled`/`readOnly`/`loading` states, fixed-rows sizing, auto-resize, and
 * the character counter.
 *
 * Fixed-rows mode sets `numberOfLines` (RN's own equivalent of the native `rows` attribute).
 * Auto-resize has no `scrollHeight` primitive on `TextInput` the way the web `<textarea>` does —
 * this uses RN's own built-in `onContentSizeChange` instead, clamping the measured content height
 * between `minRows`/`maxRows` (converted via each size rung's line height), the same clamp
 * strategy `ino-textarea.component.ts`'s `resize()` uses on web (SPEC.md §1/§8).
 *
 * `readOnly` uses RN's own `editable={false}` (no native "readonly" concept), keeping
 * `accessibilityState.disabled` false so the field stays focusable/selectable to AT — same
 * distinction `InoInput.tsx` draws.
 */
export function InoTextarea({
  label,
  hint,
  error,
  size = 'default',
  variant = 'outline',
  rows = 3,
  autoResize = false,
  minRows = 2,
  maxRows = 10,
  maxLength,
  showCount = false,
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
  variant?: InoTextareaVariant;
  rows?: number;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  showCount?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
} & Omit<TextInputProps, 'editable' | 'style' | 'multiline' | 'numberOfLines'> & { style?: TextInputProps['style'] }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [autoHeight, setAutoHeight] = useState<number | undefined>(undefined);
  const sizeTokens = control[size];
  const invalid = !!error;
  const nonEditable = disabled || readOnly || loading;
  const value = typeof inputProps.value === 'string' ? inputProps.value : '';
  const lineHeight = sizeTokens.fontSize * 1.4;
  const minHeight = lineHeight * minRows;
  const maxHeight = lineHeight * maxRows;

  const borderColor = invalid ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      ) : null}
      <View style={styles.controlWrap}>
        <TextInput
          multiline
          numberOfLines={rows}
          accessibilityState={{ disabled }}
          editable={!nonEditable}
          placeholderTextColor={colors.onSurfaceSubtle}
          maxLength={maxLength}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          onContentSizeChange={(e) => {
            if (!autoResize) {
              return;
            }
            const next = Math.min(Math.max(e.nativeEvent.contentSize.height, minHeight), maxHeight);
            setAutoHeight(next);
          }}
          style={[
            styles.control,
            {
              minHeight: autoResize ? Math.min(minHeight, maxHeight) : lineHeight * rows,
              height: autoResize ? autoHeight : undefined,
              maxHeight: autoResize ? maxHeight : undefined,
              paddingHorizontal: sizeTokens.paddingInline,
              paddingVertical: space[3],
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
      <View style={styles.meta}>
        {error ? (
          <Text style={[styles.message, { color: colors.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : hint ? (
          <Text style={[styles.message, { color: colors.onSurfaceMuted }]}>{hint}</Text>
        ) : <View />}
        {showCount && maxLength ? (
          <Text
            style={[
              styles.counter,
              { color: value.length >= maxLength ? colors.danger : colors.onSurfaceMuted },
            ]}
          >
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  label: { fontSize: 14.5, fontWeight: '600' },
  controlWrap: { position: 'relative', justifyContent: 'center' },
  control: { width: '100%', textAlignVertical: 'top' },
  disabled: { opacity: 0.5 },
  spinner: { position: 'absolute', right: space[4], top: space[3] },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  message: { fontSize: 12.5 },
  counter: { fontSize: 12.5, marginLeft: 'auto' },
});
