import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { motion, space } from '../theme/tokens';

export type InoProgressBarMode = 'determinate' | 'indeterminate';
export type InoProgressBarSize = 'sm' | 'default' | 'lg';

const TRACK_THICKNESS: Record<InoProgressBarSize, number> = {
  sm: space[1],
  default: space[2],
  lg: space[3],
};

/**
 * `<InoProgressBar>` — RN port of `<ino-progress-bar>` (web/src/app/components/progress-bar,
 * INO-132 / INO-31 T-15). Mirrors the web ARIA contract via `accessibilityRole="progressbar"` +
 * `accessibilityValue`: determinate passes `{min: 0, max: 100, now, text}`, indeterminate omits
 * `now`/`min`/`max` and relies on `accessibilityState={{ busy: true }}` instead — same "no
 * numeric value to report" rule web/src/app/components/progress-bar/SPEC.md §2 records.
 */
export function InoProgressBar({
  mode = 'determinate',
  size = 'default',
  value = 0,
  showValue = true,
  unit = '%',
  disabled = false,
  invalid = false,
}: {
  mode?: InoProgressBarMode;
  size?: InoProgressBarSize;
  value?: number;
  showValue?: boolean;
  unit?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const { colors } = useTheme();
  const clampedValue = Math.min(100, Math.max(0, value));
  const valueText = `${clampedValue}${unit}`;
  const thickness = TRACK_THICKNESS[size];
  const fillColor = invalid ? colors.danger : colors.accent;

  const sweep = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (mode !== 'indeterminate' || reduceMotion) {
      sweep.setValue(0);
      return;
    }
    sweep.setValue(0);
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.durationSlow * 3,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, reduceMotion, sweep]);

  const sweepLeft = sweep.interpolate({ inputRange: [0, 1], outputRange: ['-40%', '100%'] });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ disabled, busy: mode === 'indeterminate' }}
      accessibilityValue={
        mode === 'determinate'
          ? { min: 0, max: 100, now: clampedValue, text: valueText }
          : undefined
      }
      style={[styles.container, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.track,
          { height: thickness, borderRadius: thickness / 2, borderColor: colors.border, backgroundColor: colors.surfaceSunken },
        ]}
      >
        {mode === 'determinate' ? (
          <View
            style={[
              styles.fill,
              { width: `${clampedValue}%`, height: thickness, borderRadius: thickness / 2, backgroundColor: fillColor },
            ]}
          />
        ) : reduceMotion ? (
          <View
            style={[
              styles.fill,
              { width: '40%', height: thickness, borderRadius: thickness / 2, backgroundColor: fillColor },
            ]}
          />
        ) : (
          <Animated.View
            style={[
              styles.sweep,
              { left: sweepLeft, height: thickness, borderRadius: thickness / 2, backgroundColor: fillColor },
            ]}
          />
        )}
      </View>
      {mode === 'determinate' && showValue ? (
        <Text style={[styles.valueLabel, { color: colors.onSurfaceMuted }]}>{valueText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  disabled: { opacity: 0.5 },
  track: { width: '100%', borderWidth: 1, overflow: 'hidden' },
  fill: {},
  sweep: { position: 'absolute', width: '40%' },
  valueLabel: { fontSize: 12.5, marginTop: 4 },
});
