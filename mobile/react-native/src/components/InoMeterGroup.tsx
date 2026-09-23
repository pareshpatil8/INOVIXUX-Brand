import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

export type InoMeterColor = 'accent' | 'accentSecondary' | 'success' | 'warning' | 'danger' | 'info';
export type InoMeterOrientation = 'horizontal' | 'vertical';

export interface InoMeterItem {
  label: string;
  value: number;
  color?: InoMeterColor;
}

const DEFAULT_COLOR_ORDER: readonly InoMeterColor[] = [
  'accent',
  'accentSecondary',
  'success',
  'warning',
  'danger',
  'info',
];

/**
 * RN port of `<ino-meter-group>` (web/src/app/components/meter-group, INO-144 / INO-31 T-13).
 * Presentational only, matching the web component's non-interactive contract. Track thickness
 * reads `control[size].iconSize` — same "reuse the smallest control-size rung instead of a new
 * local value" choice the web component's SPEC.md §3 makes.
 */
export function InoMeterGroup({
  items,
  min = 0,
  max = 100,
  orientation = 'horizontal',
  size = 'default',
  label,
  showLegend = true,
  disabled = false,
  invalid = false,
  loading = false,
}: {
  items: InoMeterItem[];
  min?: number;
  max?: number;
  orientation?: InoMeterOrientation;
  size?: ControlSize;
  label?: string;
  showLegend?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const thickness = control[size].iconSize;
  const range = Math.max(max - min, 0.0001);

  let used = 0;
  const segments = items.map((item, index) => {
    const value = Math.max(item.value, 0);
    const available = Math.max(range - used, 0);
    const rendered = Math.min(value, available);
    used += rendered;
    return {
      ...item,
      color: item.color ?? DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length],
      percent: (rendered / range) * 100,
    };
  });

  const accessibleLabel =
    label || (items.length ? items.map((i) => `${i.label} ${i.value}`).join(', ') : 'Meter group');

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={invalid ? `${accessibleLabel} (data may be inaccurate)` : accessibleLabel}
      accessibilityState={{ disabled, busy: loading }}
      style={[styles.host, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.track,
          orientation === 'horizontal'
            ? { height: thickness, flexDirection: 'row' }
            : { width: thickness, flexDirection: 'column-reverse' },
          { backgroundColor: colors.surfaceSunken },
          invalid && { borderWidth: 2, borderColor: colors.danger },
        ]}
      >
        {!loading &&
          segments.map((seg, i) => (
            <View
              key={i}
              style={
                orientation === 'horizontal'
                  ? { width: `${seg.percent}%`, height: '100%', backgroundColor: colors[seg.color] }
                  : { height: `${seg.percent}%`, width: '100%', backgroundColor: colors[seg.color] }
              }
            />
          ))}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {segments.map((seg, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[seg.color] }]} />
              <Text style={[styles.legendLabel, { color: colors.onSurface }]}>{seg.label}</Text>
              <Text style={[styles.legendValue, { color: colors.onSurfaceMuted }]}>{seg.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { gap: space[3] },
  disabled: { opacity: 0.5 },
  track: { borderRadius: radius.pill, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDot: { width: space[2], height: space[2], borderRadius: radius.pill },
  legendLabel: { fontSize: 15 },
  legendValue: { fontSize: 15 },
});
