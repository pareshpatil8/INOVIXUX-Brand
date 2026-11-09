import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius } from '../theme/tokens';
import { InoLabel } from './InoLabel';

/**
 * `<InoSelectButton>` — RN port of `<ino-select-button>`
 * (`web/src/app/components/select-button`, INO-410 / INO-31 B1).
 *
 * Scope (SPEC.md §8): segmented button row with single and multiple selection, sm/md/lg sizing,
 * per-option disabled, optional group label, and equal-width mode. Icon-only is not ported (no
 * platform icon system yet).
 *
 * **ARIA.** Web uses `role="radiogroup"` (single) / `role="group"` (multi). RN has no radiogroup
 * or group role; each option is an `accessibilityRole="button"` carrying `accessibilityState.selected`
 * and `accessibilityState.disabled` — the same substitution `InoSelect` and `InoMultiSelect` use
 * for their rows. Hover and `:focus-visible` are pointer/keyboard concepts and are not ported, per
 * the pattern `InoButton`'s doc comment establishes.
 */

export type InoSelectButtonSize = ControlSize;

export interface InoSelectButtonOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoSelectButtonProps {
  options: InoSelectButtonOption[];
  groupLabel?: string;
  /** Single-select value. */
  value?: string;
  /** Multi-select values. */
  values?: string[];
  multiple?: boolean;
  disabled?: boolean;
  equalWidth?: boolean;
  size?: InoSelectButtonSize;
  onChangeValue?: (value: string) => void;
  onChangeValues?: (values: string[]) => void;
}

export function InoSelectButton({
  options,
  groupLabel,
  value = '',
  values = [],
  multiple = false,
  disabled = false,
  equalWidth = false,
  size = 'default',
  onChangeValue,
  onChangeValues,
}: InoSelectButtonProps) {
  const { colors } = useTheme();
  const ctrl = control[size];

  function isSelected(optionValue: string) {
    return multiple ? values.includes(optionValue) : value === optionValue;
  }

  function handlePress(option: InoSelectButtonOption) {
    if (disabled || option.disabled) return;
    if (multiple) {
      const next = values.includes(option.value)
        ? values.filter(v => v !== option.value)
        : [...values, option.value];
      onChangeValues?.(next);
    } else {
      onChangeValue?.(option.value);
    }
  }

  const group = (
    <View style={[s.row, equalWidth && s.rowFull]}>
      {options.map((option, i) => {
        const selected = isSelected(option.value);
        const isDisabled = disabled || !!option.disabled;
        const isFirst = i === 0;
        const isLast = i === options.length - 1;

        const bg = selected ? colors.accent : colors.surfaceRaised;
        const fg = selected ? colors.onAccent : colors.onSurface;
        const borderColor = selected ? colors.accent : colors.border;

        const tileStyle = [
          s.tile,
          {
            height: ctrl.height,
            paddingHorizontal: ctrl.paddingInline,
            backgroundColor: bg,
            borderTopLeftRadius: isFirst ? radius.md : 0,
            borderBottomLeftRadius: isFirst ? radius.md : 0,
            borderTopRightRadius: isLast ? radius.md : 0,
            borderBottomRightRadius: isLast ? radius.md : 0,
            borderColor,
            borderLeftWidth: isFirst ? 1 : 0.5,
            borderRightWidth: isLast ? 1 : 0.5,
            opacity: isDisabled ? 0.6 : 1,
          },
          equalWidth && s.tileFlex,
        ];

        return (
          <Pressable
            key={option.value}
            style={({ pressed }: { pressed: boolean }) => [
              ...tileStyle,
              pressed && !isDisabled && { opacity: 0.8 },
            ]}
            onPress={() => handlePress(option)}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: isDisabled }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                s.label,
                { fontSize: ctrl.fontSize, color: fg },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (groupLabel) {
    return (
      <View>
        <InoLabel>{groupLabel}</InoLabel>
        <View style={s.groupLabelGap} />
        {equalWidth ? group : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{group}</ScrollView>}
      </View>
    );
  }

  return equalWidth ? group : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {group}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowFull: {
    width: '100%',
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  tileFlex: {
    flex: 1,
  },
  label: {
    fontWeight: '500',
  },
  groupLabelGap: {
    height: 4,
  },
});
