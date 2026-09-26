import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { InoRadio, InoRadioSize } from './InoRadio';

export interface InoRadioGroupOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoRadioGroupProps {
  legend?: string;
  options: InoRadioGroupOption[];
  value?: string;
  size?: InoRadioSize;
  disabled?: boolean;
  readonly?: boolean;
  onValueChange?: (value: string) => void;
}

/**
 * `<InoRadioGroup>` — RN port of `<ino-radio-group>` (web/src/app/components/radio-group,
 * INO-159 / INO-31 U-4). A plain `View` wrapper (RN has no `<fieldset>`/`<legend>` equivalent,
 * same call `<InoCheckboxGroup>` makes); `accessibilityRole="radiogroup"` on the wrapper is RN's
 * direct equivalent of web's implicit `<fieldset>` `group` role for a radio set specifically.
 *
 * Composes `<InoRadio>` per row and owns the single selected `value`, passing
 * `checked={value === option.value}` down — the mobile equivalent of web's shared-`name` native
 * grouping, since RN has no platform-level mutual-exclusion primitive to lean on.
 */
export function InoRadioGroup({
  legend,
  options,
  value = '',
  size = 'default',
  disabled = false,
  readonly = false,
  onValueChange,
}: InoRadioGroupProps) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {legend ? <Text style={[styles.legend, { color: colors.onSurface }]}>{legend}</Text> : null}
      {options.map((option) => (
        <InoRadio
          key={option.value}
          label={option.label}
          size={size}
          checked={value === option.value}
          disabled={disabled || !!option.disabled}
          readonly={readonly}
          onCheckedChange={(checked) => {
            if (checked) onValueChange?.(option.value);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'column', gap: space[2] },
  legend: { fontWeight: '600', marginBottom: space[1] },
});
