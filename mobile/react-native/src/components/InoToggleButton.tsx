import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius } from '../theme/tokens';

export type InoToggleButtonSize = ControlSize;

export interface InoToggleButtonProps {
  onLabel?: string;
  offLabel?: string;
  onIcon?: string;
  offIcon?: string;
  accessibilityLabel?: string;
  pressed?: boolean;
  disabled?: boolean;
  size?: InoToggleButtonSize;
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * `<InoToggleButton>` — RN port of `<ino-toggle-button>`
 * (web/src/app/components/toggle-button, INO-412 / INO-31 B1). WAI-ARIA "toggle button" pattern
 * — `accessibilityRole="togglebutton"` + `accessibilityState.selected` — distinct from
 * `InoToggle`'s `accessibilityRole="switch"`.
 *
 * Fill/text/border-by-state mirror `InoButton.tsx`'s functions: unpressed reads the same pair
 * `InoButton`'s `secondary` variant uses, pressed reads the same pair its `primary` variant
 * uses — reusing two already-themed pairs rather than inventing a third visual language for one
 * component.
 */
export function InoToggleButton({
  onLabel = 'Yes',
  offLabel = 'No',
  onIcon,
  offIcon,
  accessibilityLabel,
  pressed = false,
  disabled = false,
  size = 'default',
  onPressedChange,
}: InoToggleButtonProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const label = pressed ? onLabel : offLabel;
  const icon = pressed ? onIcon : offIcon;

  const fillFor = (down: boolean) => {
    if (pressed) return down ? colors.accentActive : colors.accent;
    return down ? colors.surfaceSunken : colors.surfaceRaised;
  };

  const textColorFor = () => (pressed ? colors.onAccent : colors.onSurface);

  const borderColorFor = (down: boolean) =>
    pressed ? 'transparent' : down ? colors.accentActive : colors.border;

  return (
    <Pressable
      onPress={disabled ? undefined : () => onPressedChange?.(!pressed)}
      disabled={disabled}
      accessibilityRole="togglebutton"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: pressed, disabled }}
      hitSlop={8}
      style={({ pressed: down }) => [
        styles.base,
        {
          minHeight: dims.height,
          paddingHorizontal: dims.paddingInlineRoomy,
          borderRadius: radius.md,
          gap: dims.gap,
          backgroundColor: fillFor(down),
          borderWidth: pressed ? 0 : 1,
          borderColor: borderColorFor(down),
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {icon ? <Text style={{ fontSize: dims.iconSize, color: textColorFor() }}>{icon}</Text> : null}
        <Text style={{ color: textColorFor(), fontSize: dims.fontSize, fontWeight: '600' }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
