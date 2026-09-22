import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';

export type InoTagSeverity = 'info' | 'low' | 'medium' | 'high';

const SEVERITY_LABEL: Record<InoTagSeverity, string> = {
  info: 'Info',
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

/**
 * `high -> danger`, `medium -> warning`, `low -> success`, `info -> info` — the mobile palettes
 * (theme/tokens.ts) have no risk-* roles, only success/warning/danger/info, so severity maps onto
 * the roles that are actually ported. Same mapping web's `ino-alert` status union already makes;
 * full reasoning in web/src/app/components/tag/SPEC.md §7.
 */
const SEVERITY_ROLE = {
  info: { fill: 'info', onFill: 'onInfo' },
  low: { fill: 'success', onFill: 'onSuccess' },
  medium: { fill: 'warning', onFill: 'onWarning' },
  high: { fill: 'danger', onFill: 'onDanger' },
} as const;

/**
 * `<InoTag>` — RN port of `<ino-tag>` (web/src/app/components/tag, INO-143 / INO-31 T-12).
 * Presentational only, matching the web component's non-interactive contract: no `onPress`, no
 * focus handling — a removable/tappable tag is a different, not-yet-built component.
 */
export function InoTag({
  severity = 'info',
  value,
  rounded = false,
  dot = false,
  disabled = false,
}: {
  severity?: InoTagSeverity;
  value?: string;
  rounded?: boolean;
  dot?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const role = SEVERITY_ROLE[severity];
  const fill = colors[role.fill];
  const onFill = colors[role.onFill];
  const label = value || SEVERITY_LABEL[severity];

  if (dot) {
    return (
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.dot, { backgroundColor: fill }]}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.tag,
        { backgroundColor: fill, borderRadius: rounded ? radius.pill : radius.sm },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: onFill }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  // --ino-type-eyebrow-size (11px) / weight (600) / tracking, mirroring the web chip's font role.
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: { opacity: 0.5 },
  // borderRadius exceeds half the box on purpose: RN clips to a perfect circle once the radius is
  // >= half the width, so this reads an on-scale token (radius.pill) instead of the off-scale
  // literal `3` a hand-computed half-width would need.
  dot: { width: 6, height: 6, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
