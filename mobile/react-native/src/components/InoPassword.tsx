import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

export interface InoPasswordPolicyRule {
  label: string;
  test: (value: string) => boolean;
}

/** Mirrors the web component's `INO_PASSWORD_DEFAULT_POLICY_RULES` — see that file's doc comment
 * for why this is a named export rather than an implicit default. */
export const INO_PASSWORD_DEFAULT_POLICY_RULES: InoPasswordPolicyRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Upper and lower case letters', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: 'At least one number', test: (v) => /\d/.test(v) },
  { label: 'At least one symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

function scorePassword(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (value.length >= 12) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

/**
 * `<InoPassword>` — RN port of `<ino-password>` (web/src/app/components/password, INO-406 /
 * INO-31 Phase B1). Carries the reveal toggle and strength meter, per SPEC.md §9: the Caps Lock
 * warning is web-only, since a touch keyboard has no reliable modifier-state signal to key it off.
 */
export function InoPassword({
  label,
  hint,
  error,
  size = 'default',
  disabled = false,
  showStrengthMeter = true,
  policyRules = [],
  value = '',
  style,
  ...inputProps
}: {
  label?: string;
  hint?: string;
  error?: string;
  size?: ControlSize;
  disabled?: boolean;
  showStrengthMeter?: boolean;
  policyRules?: InoPasswordPolicyRule[];
  value?: string;
} & Omit<TextInputProps, 'editable' | 'style' | 'secureTextEntry' | 'value'> & { style?: TextInputProps['style'] }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const sizeTokens = control[size];
  const invalid = !!error;

  const borderColor = invalid ? colors.danger : focused ? colors.accent : colors.border;
  const score = scorePassword(value);
  const meterColor = score <= 1 ? colors.danger : score <= 2 ? colors.warning : colors.success;

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text> : null}
      <View style={styles.controlWrap}>
        <TextInput
          accessibilityState={{ disabled }}
          editable={!disabled}
          secureTextEntry={!revealed}
          value={value}
          placeholderTextColor={colors.onSurfaceSubtle}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          style={[
            styles.control,
            {
              minHeight: sizeTokens.height,
              paddingHorizontal: sizeTokens.paddingInline,
              paddingRight: sizeTokens.paddingInline + 32,
              fontSize: sizeTokens.fontSize,
              color: colors.onSurface,
              backgroundColor: colors.surfaceSunken,
              borderColor,
              borderWidth: 1,
              borderRadius: radius.md,
            },
            disabled && styles.disabled,
            style,
          ]}
          {...inputProps}
        />
        <Pressable
          onPress={() => setRevealed((r) => !r)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled, selected: revealed }}
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          style={styles.reveal}
          hitSlop={8}
        >
          <Text style={{ color: colors.onSurfaceMuted, fontSize: 12.5 }}>{revealed ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>

      {showStrengthMeter ? (
        <View style={styles.meter} accessibilityLiveRegion="polite">
          <View style={styles.meterTrack}>
            {[0, 1, 2, 3].map((seg) => (
              <View
                key={seg}
                style={[
                  styles.meterSeg,
                  { backgroundColor: seg < score ? meterColor : colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.meterLabel, { color: colors.onSurfaceMuted }]}>
            {value ? STRENGTH_LABELS[score] : ''}
          </Text>
        </View>
      ) : null}

      {policyRules.length ? (
        <View
          style={[styles.policy, { backgroundColor: colors.surfaceRaised }]}
          accessibilityLabel="Password requirements"
        >
          {policyRules.map((rule) => {
            const met = rule.test(value);
            return (
              <Text
                key={rule.label}
                style={[styles.policyItem, { color: met ? colors.onSurface : colors.onSurfaceMuted }]}
              >
                {met ? '✓ ' : '○ '}
                {rule.label}
              </Text>
            );
          })}
        </View>
      ) : null}

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
  reveal: { position: 'absolute', right: space[2], paddingHorizontal: space[1] },
  meter: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  meterTrack: { flex: 1, flexDirection: 'row', gap: space[1] },
  meterSeg: { flex: 1, height: 4, borderRadius: 999 },
  meterLabel: { fontSize: 12.5, minWidth: 60 },
  policy: { gap: space[1], padding: space[3], borderRadius: radius.md },
  policyItem: { fontSize: 12.5 },
  message: { fontSize: 12.5 },
});
