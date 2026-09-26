import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize } from '../theme/tokens';

export type InoProgressSpinnerMode = 'indeterminate' | 'determinate';

const TICK_COUNT = 12;
const SPIN_DURATION_MS = 480; // --ino-motion-duration-slow

/**
 * RN port of `<ino-progress-spinner>` (web/src/app/components/progress-spinner,
 * INO-133 / INO-31 T-21). No SVG library and no masking library (`@react-native-masked-view/*`)
 * is a dependency in this app, so neither a stroke-dasharray ring nor a disc-plus-punched-hole
 * ring (which would need to know its parent's exact background colour to fake transparency, a
 * real correctness bug on any non-solid-colour background) is safe to build here. Full reasoning:
 * SPEC.md §8.
 *
 * - **Indeterminate** — a single bordered ring with one edge transparent, spun with `Animated` —
 *   the same idiom `ino-button`/`ino-tag`'s inline mobile spinners already use.
 * - **Determinate** — a 12-tick radial dial (like clock-face minute marks): ticks up to the
 *   rounded `percentage / (100/12)` count render in the fill colour, the rest in the track colour.
 *   Fully artifact-free on any background (each tick is an independent small rounded rect, no
 *   clipping/masking involved) at the cost of 12-step granularity instead of a continuous sweep.
 */
export function InoProgressSpinner({
  size = 'default',
  mode = 'indeterminate',
  value = 0,
  disabled = false,
  invalid = false,
  label,
}: {
  size?: ControlSize;
  mode?: InoProgressSpinnerMode;
  value?: number;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
}) {
  const { colors } = useTheme();
  const diameter = control[size].height;
  const strokeWidth = diameter / 5.5;
  const ringColor = invalid ? colors.danger : colors.accent;
  const clamped = Math.min(100, Math.max(0, value));

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mode !== 'indeterminate') {
      return undefined;
    }
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accessibleLabel =
    label ?? (mode === 'determinate' ? `${Math.round(clamped)}% complete` : 'Loading');

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={invalid ? `${accessibleLabel} (error)` : accessibleLabel}
      accessibilityState={{ disabled, busy: mode === 'indeterminate' }}
      accessibilityValue={
        mode === 'determinate' ? { min: 0, max: 100, now: Math.round(clamped) } : undefined
      }
      style={{ width: diameter, height: diameter, opacity: disabled ? 0.5 : 1 }}
    >
      {mode === 'indeterminate' ? (
        <Animated.View
          style={{
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            borderWidth: strokeWidth,
            borderColor: ringColor,
            borderTopColor: 'transparent',
            transform: [{ rotate }],
          }}
        />
      ) : (
        <DeterminateDial
          diameter={diameter}
          trackColor={colors.borderSoft}
          fillColor={ringColor}
          percentage={clamped}
        />
      )}
    </View>
  );
}

function DeterminateDial({
  diameter,
  trackColor,
  fillColor,
  percentage,
}: {
  diameter: number;
  trackColor: string;
  fillColor: string;
  percentage: number;
}) {
  const filledTicks = Math.round((percentage / 100) * TICK_COUNT);
  const tickThickness = Math.max(2, diameter / 10);
  const tickLength = diameter * 0.22;

  return (
    <View style={{ width: diameter, height: diameter }}>
      {Array.from({ length: TICK_COUNT }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: diameter / 2 - tickThickness / 2,
            width: tickThickness,
            height: diameter / 2,
            // Anchors rotation at the bottom-center of this spoke, which coincides with the
            // dial's true center — sweeps the tick around the circumference at `angle` degrees.
            transformOrigin: `50% ${diameter / 2}px`,
            transform: [{ rotate: `${(360 / TICK_COUNT) * i}deg` }],
          }}
        >
          <View
            style={{
              width: tickThickness,
              height: tickLength,
              borderRadius: tickThickness / 2,
              backgroundColor: i < filledTicks ? fillColor : trackColor,
            }}
          />
        </View>
      ))}
    </View>
  );
}
