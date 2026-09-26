import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

/**
 * `<InoInputOtp>` — RN port of `<ino-input-otp>` (web/src/app/components/input-otp, INO-146 /
 * INO-31 T-6). One `TextInput` per box with roving focus via refs, matching the web component's
 * DOM-input-per-box approach rather than one input plus visual segmentation — `textContentType`
 * `oneTimeCode` is what iOS spreads an SMS-autofilled code across a *sequence* of adjacent inputs,
 * the same role `autocomplete="one-time-code"` plays on web (see web SPEC.md §1); Android's SMS
 * Retriever/autofill also targets `textContentType="oneTimeCode"`.
 *
 * Uses `AccessibilityInfo.announceForAccessibility` for the per-cell announcement (RN has no
 * `aria-live` DOM primitive) — the same "Digit N of length entered" / "Code complete." contract
 * the web component's live region carries.
 */
export function InoInputOtp({
  label,
  hint,
  error,
  length = 6,
  mask = false,
  integerOnly = true,
  value = '',
  size = 'default',
  disabled = false,
  readOnly = false,
  loading = false,
  onValueChange,
  onComplete,
}: {
  label?: string;
  hint?: string;
  error?: string;
  length?: number;
  mask?: boolean;
  integerOnly?: boolean;
  value?: string;
  size?: ControlSize;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const sizeTokens = control[size];
  const invalid = !!error;
  const nonEditable = disabled || readOnly || loading;
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusCell = (index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputRefs.current[clamped]?.focus();
  };

  const commit = (chars: string[], announceIndex: number) => {
    const next = chars.join('').slice(0, length);
    onValueChange?.(next);
    const filledCount = chars.filter(Boolean).length;
    if (filledCount === length) {
      AccessibilityInfo.announceForAccessibility('Code complete.');
      onComplete?.(next);
    } else if (chars[announceIndex]) {
      AccessibilityInfo.announceForAccessibility(`Digit ${announceIndex + 1} of ${length} entered.`);
    } else {
      AccessibilityInfo.announceForAccessibility(`Digit ${announceIndex + 1} of ${length} cleared.`);
    }
  };

  const onChangeText = (index: number, text: string) => {
    const char = text.slice(-1);
    if (char && integerOnly && !/^\d$/.test(char)) return;
    const chars = cells.slice();
    chars[index] = char;
    commit(chars, index);
    if (char && index < length - 1) focusCell(index + 1);
  };

  const onKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (nonEditable) return;
    if (e.nativeEvent.key === 'Backspace' && !cells[index] && index > 0) {
      const chars = cells.slice();
      chars[index - 1] = '';
      commit(chars, index - 1);
      focusCell(index - 1);
    }
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text> : null}
      <View
        style={styles.cellsWrap}
        accessibilityRole="none"
        accessibilityLabel={label ?? 'One-time code'}
      >
        <View style={[styles.cells, { gap: space[3] }]}>
          {cells.map((char, i) => {
            const focused = focusedIndex === i;
            const borderColor = invalid ? colors.danger : focused ? colors.accent : colors.border;
            return (
              <TextInput
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                value={char}
                editable={!nonEditable}
                secureTextEntry={mask}
                keyboardType={integerOnly ? 'number-pad' : 'default'}
                textContentType="oneTimeCode"
                maxLength={1}
                accessibilityLabel={`Digit ${i + 1} of ${length}`}
                accessibilityState={{ disabled }}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex((prev) => (prev === i ? null : prev))}
                onChangeText={(text) => onChangeText(i, text)}
                onKeyPress={(e) => onKeyPress(i, e)}
                style={[
                  styles.cell,
                  {
                    width: sizeTokens.height,
                    height: sizeTokens.height,
                    fontSize: sizeTokens.fontSize,
                    color: colors.onSurface,
                    backgroundColor: colors.surfaceSunken,
                    borderColor,
                  },
                  disabled && styles.disabled,
                ]}
              />
            );
          })}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.onSurfaceMuted} style={styles.spinner} />
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
  cellsWrap: { flexDirection: 'row', alignItems: 'center' },
  cells: { flexDirection: 'row' },
  cell: { borderWidth: 1, borderRadius: radius.md, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  spinner: { marginLeft: space[3] },
  message: { fontSize: 12.5 },
});
