import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

export type InoInputNumberMode = 'decimal' | 'currency' | 'percent';
export type InoInputNumberVariant = 'outline' | 'filled';

/**
 * `<InoInputNumber>` — RN port of `<ino-inputnumber>` (web/src/app/components/inputnumber, INO-402 / INO-31 B1).
 *
 * Promotes from `<InoInput keyboardType="numeric">` with:
 * - Spinner buttons (increment/decrement) — hideable via `showButtons={false}`
 * - Currency/percent/decimal modes with locale-aware formatting
 * - Prefix/suffix support
 * - Locale digit grouping (Intl.NumberFormat polyfill via react-native-localize assumed)
 * - Min/max constraints with at-min/at-max visual states
 *
 * Keyboard contract: native numeric keyboard; spinner buttons provide increment/decrement.
 * WCAG: proper label, error announcement, button accessibility labels.
 *
 * Mobile-specific notes:
 * - `showButtons` defaults to `false` on mobile (native pickers preferred)
 * - iOS numeric keyboard: use `keyboardType="numbers-and-punctuation"` when `min` allows negatives
 * - Android: decimal separator varies by locale and OEM
 */
export function InoInputNumber({
  label,
  hint,
  error,
  value,
  onValueChange,
  size = 'default',
  variant = 'outline',
  mode = 'decimal',
  prefix,
  suffix,
  locale = 'en-US',
  currency = 'USD',
  min,
  max,
  step = 1,
  minFractionDigits = 0,
  maxFractionDigits = 3,
  useGrouping = true,
  showButtons = false,
  disabled = false,
  readOnly = false,
  loading = false,
  style,
  ...inputProps
}: {
  label?: string;
  hint?: string;
  error?: string;
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  size?: ControlSize;
  variant?: InoInputNumberVariant;
  mode?: InoInputNumberMode;
  prefix?: string;
  suffix?: string;
  locale?: string;
  currency?: string;
  min?: number;
  max?: number;
  step?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  useGrouping?: boolean;
  showButtons?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
} & Omit<TextInputProps, 'editable' | 'style' | 'keyboardType' | 'value' | 'onChangeText'> & { style?: TextInputProps['style'] }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [inputText, setInputText] = useState(value?.toString() ?? '');
  const sizeTokens = control[size];
  const invalid = !!error;
  const nonEditable = disabled || readOnly || loading;

  const isAtMin = value !== null && value !== undefined && min !== null && min !== undefined && value <= min;
  const isAtMax = value !== null && value !== undefined && max !== null && max !== undefined && value >= max;

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';

    try {
      const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits,
        useGrouping,
      };

      if (mode === 'currency') {
        options.style = 'currency';
        options.currency = currency;
      } else if (mode === 'percent') {
        options.style = 'percent';
      }

      return new Intl.NumberFormat(locale, options).format(val);
    } catch {
      return String(val);
    }
  };

  const updateValue = (newValue: number) => {
    let clampedValue = newValue;

    if (min !== null && min !== undefined && clampedValue < min) {
      clampedValue = min;
    }
    if (max !== null && max !== undefined && clampedValue > max) {
      clampedValue = max;
    }

    setInputText(clampedValue.toString());
    onValueChange?.(clampedValue);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (text === '' || text === '-') {
      onValueChange?.(null);
      return;
    }

    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      updateValue(parsed);
    }
  };

  const increment = () => {
    if (nonEditable) return;
    const currentValue = value ?? 0;
    const newValue = currentValue + step;
    updateValue(newValue);
  };

  const decrement = () => {
    if (nonEditable) return;
    const currentValue = value ?? 0;
    const newValue = currentValue - step;
    updateValue(newValue);
  };

  const borderColor = invalid
    ? colors.danger
    : focused
      ? colors.accent
      : variant === 'filled'
        ? colors.border
        : colors.border;

  const displayValue = focused ? inputText : formatValue(value);

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      ) : null}

      <View style={styles.container}>
        {prefix ? (
          <Text style={[styles.affix, { color: colors.onSurfaceMuted }]}>{prefix}</Text>
        ) : null}

        <View style={[styles.controlWrap, { flex: 1 }]}>
          <TextInput
            accessibilityState={{ disabled }}
            accessibilityRole="spinbutton"
            accessibilityValue={{
              now: value ?? undefined,
              min,
              max,
            }}
            editable={!nonEditable}
            keyboardType={min !== null && min < 0 ? 'numbers-and-punctuation' : 'numeric'}
            placeholderTextColor={colors.onSurfaceSubtle}
            value={displayValue}
            onChangeText={handleTextChange}
            onFocus={(e) => { setFocused(true); setInputText(value?.toString() ?? ''); inputProps.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
            style={[
              styles.control,
              {
                minHeight: sizeTokens.height,
                paddingHorizontal: sizeTokens.paddingInline,
                paddingRight: showButtons ? sizeTokens.paddingInline + 60 : sizeTokens.paddingInline,
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

          {showButtons && !loading ? (
            <View style={styles.buttons}>
              <TouchableOpacity
                accessibilityLabel="Increment value"
                accessibilityRole="button"
                disabled={nonEditable || isAtMax}
                onPress={increment}
                style={[
                  styles.button,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  (nonEditable || isAtMax) && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.buttonIcon, { color: colors.onSurface }]}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Decrement value"
                accessibilityRole="button"
                disabled={nonEditable || isAtMin}
                onPress={decrement}
                style={[
                  styles.button,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  (nonEditable || isAtMin) && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.buttonIcon, { color: colors.onSurface }]}>−</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.onSurfaceMuted}
              style={styles.spinner}
            />
          ) : null}
        </View>

        {suffix ? (
          <Text style={[styles.affix, { color: colors.onSurfaceMuted }]}>{suffix}</Text>
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
  container: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  affix: { fontSize: 14.5 },
  controlWrap: { position: 'relative', justifyContent: 'center' },
  control: { width: '100%' },
  disabled: { opacity: 0.5 },
  buttons: {
    position: 'absolute',
    right: space[2],
    flexDirection: 'column',
    gap: 2,
  },
  button: {
    width: 24,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonIcon: { fontSize: 14, fontWeight: '600' },
  spinner: { position: 'absolute', right: space[4] },
  message: { fontSize: 12.5 },
});
