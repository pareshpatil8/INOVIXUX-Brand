import React, { useCallback, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, motion, radius, rowMinHeight } from '../theme/tokens';

export type InoChipSize = ControlSize;

export interface InoChipProps {
  label: string;
  size?: InoChipSize;
  interactive?: boolean;
  removable?: boolean;
  pressable?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  onPress?: () => void;
  onPressedChange?: (pressed: boolean) => void;
  onRemove?: () => void;
}

/**
 * `<InoChip>` — RN port of `<ino-chip>` (web/src/app/components/chip, INO-462 / INO-31 Phase B4).
 * Parity benchmark: PrimeNG Chip. Contract: web/src/app/components/chip/SPEC.md.
 *
 * Mirrors the web button-in-group contract: when `interactive` and `removable` are both set, the
 * main `Pressable` and the remove `Pressable` are two independent accessible elements grouped
 * under one `View`, not one combined control (SPEC.md §1).
 *
 * `removing` fades the chip out before calling `onRemove` — self-contained, same as the web
 * port's local `removing` state rather than an external list-animation the caller has to wire up
 * (SPEC.md §2, §8). RN has no platform "reduce motion" query wired into this component yet (same
 * "flagged, not fetched" status several other ports in this tree already carry), so the fade
 * always plays at `motion.durationFast`.
 *
 * `size` reads the shared `control` scale (`paddingInline`/`fontSize`/`iconSize`/`gap` only — not
 * `height`), the same three-alias subset the web component's `.ino-tag`-derived chrome reads: a
 * chip is a label/action, not a full-height form control (SPEC.md §3).
 */
export function InoChip({
  label,
  size = 'default',
  interactive = false,
  removable = false,
  pressable = false,
  pressed = false,
  disabled = false,
  readOnly = false,
  icon,
  avatar,
  onPress,
  onPressedChange,
  onRemove,
}: InoChipProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const [removing, setRemoving] = useState(false);

  const blocked = disabled || readOnly || removing;
  const pressedActive = interactive && pressable && pressed;

  const fill = pressedActive ? colors.accent : colors.surfaceRaised;
  const border = pressedActive ? colors.accent : colors.border;
  const onFill = pressedActive ? colors.onAccent : colors.onSurface;

  const handlePress = useCallback(() => {
    if (blocked || !interactive) return;
    if (pressable) onPressedChange?.(!pressed);
    onPress?.();
  }, [blocked, interactive, pressable, pressed, onPressedChange, onPress]);

  const handleRemove = useCallback(() => {
    if (disabled || readOnly || removing || !removable) return;
    setRemoving(true);
    AccessibilityInfo.announceForAccessibility(`Removing ${label}`);
    setTimeout(() => onRemove?.(), motion.durationFast);
  }, [disabled, readOnly, removing, removable, label, onRemove]);

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={{ width: dims.iconSize, height: dims.iconSize }}>{icon}</View>
      ) : avatar ? (
        avatar
      ) : null}
      <Text numberOfLines={1} style={[styles.label, { color: onFill, fontSize: dims.fontSize }]}>
        {label}
      </Text>
    </View>
  );

  const body = interactive ? (
    <Pressable
      onPress={blocked ? undefined : handlePress}
      disabled={blocked}
      accessibilityRole={pressable ? 'togglebutton' : 'button'}
      accessibilityLabel={label}
      accessibilityState={pressable ? { selected: pressed, disabled: blocked } : { disabled: blocked }}
      hitSlop={8}
      style={styles.row}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible={!removable} accessibilityLabel={!removable ? label : undefined} style={styles.row}>
      {content}
    </View>
  );

  const removeBlocked = disabled || readOnly || removing;
  const removeButton = removable ? (
    <Pressable
      onPress={removeBlocked ? undefined : handleRemove}
      disabled={removeBlocked}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      hitSlop={8}
      style={styles.removeButton}
    >
      <Text style={[styles.removeGlyph, { color: onFill }]}>{'×'}</Text>
    </Pressable>
  ) : null;

  return (
    <View
      accessible={removable}
      style={[
        styles.chip,
        {
          minHeight: rowMinHeight,
          paddingHorizontal: dims.paddingInline,
          borderRadius: radius.pill,
          backgroundColor: fill,
          borderColor: border,
          opacity: disabled ? 0.5 : readOnly ? 0.75 : removing ? 0 : 1,
          gap: dims.gap,
        },
      ]}
    >
      {body}
      {removeButton}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    maxWidth: 160,
  },
  removeButton: {
    padding: 4,
  },
  removeGlyph: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '600',
  },
});
