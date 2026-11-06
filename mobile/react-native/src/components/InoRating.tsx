import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { borderWidth, radius, space } from '../theme/tokens';

export type InoRatingSize = 'sm' | 'md' | 'lg';

export interface InoRatingProps {
  label?: string;
  hint?: string;
  error?: string;
  size?: InoRatingSize;
  count?: number;
  iconFilled?: string;
  iconEmpty?: string;
  cancelable?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value: number;
  onValueChange?: (value: number) => void;
}

const STAR_SIZE: Record<InoRatingSize, number> = { sm: 20, md: 24, lg: 32 };

/**
 * `<InoRating>` — RN port of `<ino-rating>` (web/src/app/components/rating, INO-471 / INO-31
 * B5). Doc 26 §5 row disposition: "Port both".
 *
 * Each star is a `Pressable` with `accessibilityRole="radio"` — the closest RN equivalent to the
 * web component's `role="radio"` stars inside a `role="radiogroup"`; the group itself carries
 * `accessibilityRole="radiogroup"` via the wrapping `View`'s `accessible`/`accessibilityLabel`.
 * Tapping star *N* sets `value` to `N`; `cancelable` mirrors the web clear/cancel toggle (tapping
 * the already-selected star clears to `0`). Hover-preview is web-only (touch has no hover) — see
 * SPEC.md §9/the docs page's Mobile parity section.
 */
export function InoRating({
  label,
  hint,
  error,
  size = 'md',
  count = 5,
  iconFilled = '★',
  iconEmpty = '☆',
  cancelable = false,
  disabled = false,
  readonly = false,
  value,
  onValueChange,
}: InoRatingProps) {
  const { colors } = useTheme();
  const isInteractive = !disabled && !readonly;
  const starSize = STAR_SIZE[size];
  const invalid = !!error;

  const onStarPress = (star: number) => {
    if (!isInteractive) return;
    onValueChange?.(cancelable && star === value ? 0 : star);
  };

  return (
    <View
      style={styles.field}
      accessible
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive }}
    >
      {label ? (
        <Text style={[styles.label, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.group,
          { opacity: disabled ? 0.5 : 1 },
          invalid ? { borderColor: colors.danger, borderWidth: borderWidth.hairline, borderRadius: radius.sm, padding: space[1] } : null,
        ]}
        accessibilityRole="radiogroup"
      >
        {Array.from({ length: count }, (_, i) => i + 1).map((star) => {
          const filled = star <= value;
          return (
            <Pressable
              key={star}
              disabled={!isInteractive}
              onPress={() => onStarPress(star)}
              accessibilityRole="radio"
              accessibilityState={{ checked: star === value, disabled: !isInteractive }}
              accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={{ fontSize: starSize, color: filled ? colors.warning : colors.onSurfaceMuted }}>
                {filled ? iconFilled : iconEmpty}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {invalid ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.onSurfaceMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, alignItems: 'flex-start' },
  label: { fontSize: 15, fontWeight: '500' },
  group: { flexDirection: 'row', gap: 4 },
  hint: { fontSize: 12.5 },
  error: { fontSize: 12.5, fontWeight: '600' },
});
