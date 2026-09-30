import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

/**
 * `<InoInputMask>` — RN port of `<ino-inputmask>` (web/src/app/components/inputmask, INO-404 /
 * INO-31 B1).
 *
 * Mask grammar and India-stack presets are duplicated here rather than shared (same "each port
 * carries its own platform-native copy" convention `ino-password`'s SPEC.md §9 documents) —
 * `9`/`a`/`A`/`*` editable tokens, `\` literal-escape, everything else a literal separator. See
 * `web/src/app/components/inputmask/mask-tokens.ts` for the canonical grammar doc.
 *
 * Mobile has no reliable per-keystroke `keydown` interception the way a web `<input>` does, so
 * this port re-derives the full slot set from `onChangeText`'s raw string every change (the same
 * "thread raw characters through in order" approach the web component's `applyStream`/
 * `resyncFromRaw` uses as its IME/paste fallback) instead of the caret-managed `keydown` path —
 * simpler, and the only approach that works uniformly across RN's software keyboards.
 */
export type InoInputMaskPreset = 'pan' | 'gstin' | 'ifsc' | 'phone' | 'date';

interface PresetDef {
  mask: string;
  placeholderChar?: string;
}

export const INO_INPUTMASK_PRESETS: Record<InoInputMaskPreset, PresetDef> = {
  pan: { mask: 'AAAAA9999A' },
  gstin: { mask: '99AAAAA9999A9Z*' },
  ifsc: { mask: 'AAAA0******' },
  phone: { mask: '+\\91 99999 99999' },
  date: { mask: '99/99/9999' },
};

type MaskToken = { kind: 'digit' | 'alpha' | 'alnum' | 'literal'; char: string; optional: boolean; upper?: boolean };

function parseMask(mask: string): MaskToken[] {
  const tokens: MaskToken[] = [];
  let optional = false;
  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i];
    if (ch === '\\') {
      i++;
      if (i < mask.length) tokens.push({ kind: 'literal', char: mask[i], optional });
      continue;
    }
    if (ch === '?') {
      optional = true;
      continue;
    }
    switch (ch) {
      case '9':
        tokens.push({ kind: 'digit', char: ch, optional });
        break;
      case 'a':
        tokens.push({ kind: 'alpha', char: ch, optional });
        break;
      case 'A':
        tokens.push({ kind: 'alpha', char: ch, optional, upper: true });
        break;
      case '*':
        tokens.push({ kind: 'alnum', char: ch, optional });
        break;
      default:
        tokens.push({ kind: 'literal', char: ch, optional });
    }
  }
  return tokens;
}

function testChar(token: MaskToken, ch: string): boolean {
  switch (token.kind) {
    case 'digit':
      return /^[0-9]$/.test(ch);
    case 'alpha':
      return /^[a-zA-Z]$/.test(ch);
    case 'alnum':
      return /^[a-zA-Z0-9]$/.test(ch);
    default:
      return false;
  }
}

const KIND_WORDS: Record<'digit' | 'alpha' | 'alnum', [string, string]> = {
  digit: ['digit', 'digits'],
  alpha: ['letter', 'letters'],
  alnum: ['letter or digit', 'letters or digits'],
};

function describeMask(tokens: MaskToken[]): string {
  const runs: { kind: 'digit' | 'alpha' | 'alnum'; count: number }[] = [];
  for (const t of tokens) {
    if (t.kind === 'literal') continue;
    const last = runs[runs.length - 1];
    if (last && last.kind === t.kind) last.count++;
    else runs.push({ kind: t.kind, count: 1 });
  }
  return runs.map((r) => `${r.count} ${KIND_WORDS[r.kind][r.count === 1 ? 0 : 1]}`).join(', ');
}

/** Threads raw characters through the mask from the start — mirrors the web component's
 *  `applyStream(0, raw)`. Returns the filled slots (`null` = unfilled editable slot). */
function applyStream(tokens: MaskToken[], raw: string): (string | null)[] {
  const slots: (string | null)[] = tokens.map(() => null);
  let ti = 0;
  let ri = 0;
  while (ti < tokens.length && ri < raw.length) {
    const token = tokens[ti];
    if (token.kind === 'literal') {
      if (raw[ri] === token.char) ri++;
      ti++;
      continue;
    }
    while (ri < raw.length && !testChar(token, raw[ri])) ri++;
    if (ri >= raw.length) break;
    slots[ti] = token.upper ? raw[ri].toUpperCase() : raw[ri];
    ri++;
    ti++;
  }
  return slots;
}

function isComplete(tokens: MaskToken[], slots: (string | null)[]): boolean {
  return tokens.every((t, i) => t.kind === 'literal' || t.optional || slots[i] != null);
}

function display(tokens: MaskToken[], slots: (string | null)[], placeholderChar: string): string {
  return tokens.map((t, i) => (t.kind === 'literal' ? t.char : (slots[i] ?? placeholderChar))).join('');
}

function compact(tokens: MaskToken[], slots: (string | null)[]): string {
  return tokens.map((t, i) => (t.kind === 'literal' ? '' : (slots[i] ?? ''))).join('');
}

export function InoInputMask({
  label,
  hint,
  error,
  value,
  onValueChange,
  onMaskComplete,
  mask = '',
  preset,
  placeholderChar = '_',
  size = 'default',
  required = false,
  disabled = false,
  readOnly = false,
  style,
  ...inputProps
}: {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onMaskComplete?: (value: string) => void;
  mask?: string;
  preset?: InoInputMaskPreset;
  placeholderChar?: string;
  size?: ControlSize;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
} & Omit<TextInputProps, 'editable' | 'style' | 'value' | 'onChangeText'> & { style?: TextInputProps['style'] }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const sizeTokens = control[size];
  const invalid = !!error;
  const nonEditable = disabled || readOnly;

  const resolvedMask = preset ? INO_INPUTMASK_PRESETS[preset].mask : mask;
  const resolvedPlaceholderChar = preset ? (INO_INPUTMASK_PRESETS[preset].placeholderChar ?? placeholderChar) : placeholderChar;
  const tokens = parseMask(resolvedMask);
  const slots = applyStream(tokens, value ?? '');
  const displayValue = display(tokens, slots, resolvedPlaceholderChar);
  const anyFilled = slots.some((v) => v != null);
  const incomplete = anyFilled && !isComplete(tokens, slots);

  const handleChangeText = (raw: string) => {
    const nextSlots = applyStream(tokens, raw);
    const nextValue = compact(tokens, nextSlots);
    onValueChange?.(nextValue);
    const complete = isComplete(tokens, nextSlots);
    if (complete && !hasCompleted) {
      setHasCompleted(true);
      onMaskComplete?.(nextValue);
    } else if (!complete) {
      setHasCompleted(false);
    }
  };

  const borderColor = invalid ? colors.danger : focused ? colors.accent : incomplete ? colors.warning : colors.border;

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: colors.onSurface }]}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}

      <TextInput
        accessibilityLabel={label}
        accessibilityHint={`Format: ${describeMask(tokens)}. Empty characters shown as "${resolvedPlaceholderChar}".`}
        accessibilityState={{ disabled }}
        editable={!nonEditable}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.onSurfaceSubtle}
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.control,
          {
            minHeight: sizeTokens.height,
            paddingHorizontal: sizeTokens.paddingInline,
            fontSize: sizeTokens.fontSize,
            color: colors.onSurface,
            backgroundColor: colors.surfaceSunken,
            borderColor,
          },
          disabled && styles.disabled,
          style,
        ]}
        {...inputProps}
      />

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
  control: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    fontVariant: ['tabular-nums'],
  },
  disabled: { opacity: 0.5 },
  message: { fontSize: 12.5 },
});
