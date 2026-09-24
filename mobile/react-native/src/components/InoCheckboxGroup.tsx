import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { InoCheckbox, InoCheckboxSize } from './InoCheckbox';

export interface InoCheckboxGroupOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface InoCheckboxGroupProps {
  legend?: string;
  options: InoCheckboxGroupOption[];
  value?: string[];
  size?: InoCheckboxSize;
  disabled?: boolean;
  readonly?: boolean;
  onValueChange?: (value: string[]) => void;
}

/**
 * `<InoCheckboxGroup>` — RN port of `<ino-checkbox-group>` (web/src/app/components/checkbox,
 * INO-158 / INO-31 U-3). A plain `View` wrapper (RN has no `<fieldset>`/`<legend>` equivalent);
 * `accessibilityRole="none"` on the wrapper avoids implying a native grouping semantic RN doesn't
 * actually provide — each `InoCheckbox` still carries its own `accessibilityRole="checkbox"` and
 * accessible label, which is what VoiceOver/TalkBack actually key off per-item.
 */
export function InoCheckboxGroup({
  legend,
  options,
  value = [],
  size = 'default',
  disabled = false,
  readonly = false,
  onValueChange,
}: InoCheckboxGroupProps) {
  const { colors } = useTheme();

  const toggle = (optionValue: string, checked: boolean) => {
    const next = checked ? [...value, optionValue] : value.filter((v) => v !== optionValue);
    onValueChange?.(next);
  };

  return (
    <View accessibilityRole="none" style={styles.group}>
      {legend ? <Text style={[styles.legend, { color: colors.onSurface }]}>{legend}</Text> : null}
      {options.map((option) => (
        <InoCheckbox
          key={option.value}
          label={option.label}
          size={size}
          checked={value.includes(option.value)}
          disabled={disabled || !!option.disabled}
          readonly={readonly}
          onCheckedChange={(checked) => toggle(option.value, checked)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'column', gap: space[2] },
  legend: { fontWeight: '600', marginBottom: space[1] },
});
