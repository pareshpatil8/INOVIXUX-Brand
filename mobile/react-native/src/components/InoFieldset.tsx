import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, space } from '../theme/tokens';

export type InoFieldsetSize = 'sm' | 'md' | 'lg';

const PADDING: Record<InoFieldsetSize, number> = {
  sm: control.sm.paddingInlineRoomy,
  md: control.default.paddingInlineRoomy,
  lg: control.lg.paddingInlineRoomy,
};

export interface InoFieldsetProps {
  legend?: string;
  size?: InoFieldsetSize;
  /** Adds a disclosure toggle on the legend row. Most fieldsets are pure grouping (default
   *  `false`) — see web/src/app/components/fieldset/SPEC.md §1. */
  collapsible?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
  /** Locks the collapse toggle only — behavior-only, no accessibility role exists on RN for a
   *  readonly group (mirrors web's "no aria-readonly on `group`" call, SPEC.md §3). Does not
   *  cascade to children; RN has no native fieldset-disabled cascade either, so `disabled` is
   *  also applied to each child wrapper's opacity only, not to the children themselves. */
  readonly?: boolean;
  loading?: boolean;
  error?: string;
  children?: ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
  style?: ViewStyle;
}

/**
 * `<InoFieldset>` — RN port of `<ino-fieldset>` (web/src/app/components/fieldset, INO-439 /
 * INO-31 B2). Plain `View` wrapper, `accessibilityRole="none"` (RN has no `<fieldset>`/`group`
 * role equivalent — same call `<InoCheckboxGroup>`/`<InoRadioGroup>` already make for their own
 * wrappers). When `collapsible`, the legend row is a `Pressable` with
 * `accessibilityRole="button"` and `accessibilityState={{ expanded, disabled: readonly }}`,
 * mirroring the web disclosure pattern's `aria-expanded`/toggle-only-readonly shape.
 *
 * Unlike web's native `<fieldset disabled>`, RN has no cascade: `disabled` only dims this
 * component's own chrome. Each projected child owns its own `disabled` prop, same limitation
 * `<InoCheckboxGroup>`/`<InoRadioGroup>` already document for their own `disabled`.
 */
export function InoFieldset({
  legend,
  size = 'md',
  collapsible = false,
  collapsed = false,
  disabled = false,
  readonly = false,
  loading = false,
  error,
  children,
  onCollapsedChange,
  style,
}: InoFieldsetProps) {
  const { colors } = useTheme();
  const expanded = !collapsed;
  const showContent = !collapsible || expanded;

  const toggle = () => {
    if (disabled || readonly) return;
    onCollapsedChange?.(!collapsed);
  };

  return (
    <View
      accessibilityRole="none"
      style={[
        styles.fieldset,
        {
          padding: PADDING[size],
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surfaceRaised,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {legend ? (
        collapsible ? (
          <Pressable
            onPress={toggle}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ expanded, disabled: readonly || disabled }}
            style={styles.toggleRow}
          >
            <Text style={[styles.chevron, { color: colors.onSurface }, expanded ? styles.chevronExpanded : null]}>
              {'▸'}
            </Text>
            <Text style={[styles.legend, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>
              {legend}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.legend, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>
            {legend}
          </Text>
        )
      ) : null}

      {showContent ? (
        <View style={[styles.content, { opacity: loading ? 0.5 : 1 }]}>{children}</View>
      ) : null}

      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldset: { borderWidth: 1, borderRadius: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  chevron: { fontSize: 11, transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  legend: { fontWeight: '600' },
  content: { marginTop: space[2], gap: space[3] },
  error: { marginTop: space[2], fontWeight: '600' },
});
