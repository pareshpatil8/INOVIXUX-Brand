import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, motion, radius, space } from '../theme/tokens';

export type InoProgressBarMode = 'determinate' | 'indeterminate';

/**
 * `InoProgressBar` — React Native port of
 * `web/src/app/components/progress-bar/ino-progress-bar.component.ts` (INO-132 / INO-31 T-15).
 * Re-authored, not shared: RN has no CSS custom properties or `@keyframes`, so both the
 * determinate fill and the indeterminate sweep are driven by `Animated.Value`s instead. The
 * determinate fill animates `width` (`useNativeDriver: false` — width is a layout property, the
 * same constraint the shimmer gate pattern below otherwise avoids); the indeterminate sweep
 * animates `translateX` (`useNativeDriver: true`), gated behind
 * `AccessibilityInfo.isReduceMotionEnabled()` exactly like `InoSkeleton`'s own shimmer gate
 * (pending INO-131) — under reduced motion the sweep freezes to the same static 40%-wide resting
 * bar the web CSS falls back to.
 *
 * Full reasoning (track thickness, colour roles, dropped `label` string prop): `SPEC.md` §9.
 */
export function InoProgressBar({
  mode = 'determinate',
  value = 0,
  size = 'default',
  showValue = false,
  accessibilityLabel,
}: {
  mode?: InoProgressBarMode;
  value?: number;
  size?: ControlSize;
  showValue?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  const [reduceMotion, setReduceMotion] = useState(false);
  const fillWidth = useRef(new Animated.Value(clamped)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => mounted && setReduceMotion(enabled));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Determinate — Pattern A (state feedback): the value change must still happen under reduced
  // motion, only the easing/duration animation is skipped (jump straight to the new value).
  useEffect(() => {
    if (mode !== 'determinate') return;
    if (reduceMotion) {
      fillWidth.setValue(clamped);
      return;
    }
    Animated.timing(fillWidth, {
      toValue: clamped,
      duration: motion.durationBase,
      easing: Easing.bezier(...motion.easingStandard),
      useNativeDriver: false,
    }).start();
  }, [mode, clamped, reduceMotion, fillWidth]);

  // Indeterminate — Pattern B (decorative, opt-in under no-preference): the resting state is the
  // static 40%-wide bar; the loop only starts when motion is not reduced.
  useEffect(() => {
    if (mode !== 'indeterminate' || reduceMotion) {
      sweep.stopAnimation();
      sweep.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.durationSlow * 3, // 1440ms — same "three durationSlow beats reads as a
        // sweep" reasoning InoSkeleton's shimmer uses (pending INO-131).
        easing: Easing.bezier(...motion.easingStandard),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [mode, reduceMotion, sweep]);

  // Track thickness scale mirrors the web SCSS's own component-private
  // `--ino-progress-bar-track-size` alias (`--ino-space-2` / `-3` / `-4`) — a status bar's track
  // has no reason to stretch to the full control height. See SPEC.md §3.
  const trackThickness = size === 'sm' ? space[2] : size === 'lg' ? space[4] : space[3];

  const trackStyle: ViewStyle = {
    position: 'relative',
    flex: 1,
    height: trackThickness,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  };

  // Percentage-string transforms (not pixel offsets) so the sweep travels the same -40% → 100%
  // path as the web `@keyframes` regardless of the track's actual rendered width.
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: ['-100%', '250%'] });

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: c.gap, width: '100%' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        mode === 'determinate'
          ? { min: 0, max: 100, now: clamped, text: `${clamped}%` }
          : undefined
      }
      accessibilityState={mode === 'indeterminate' ? { busy: true } : undefined}
    >
      <View style={trackStyle}>
        {mode === 'determinate' ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                width: fillWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        ) : (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                width: '40%',
                transform: reduceMotion ? [] : [{ translateX }],
              },
            ]}
          />
        )}
      </View>
      {showValue && mode === 'determinate' ? (
        <View importantForAccessibility="no-hide-descendants">
          <Animated.Text style={{ color: colors.onSurfaceMuted, fontSize: c.fontSize }}>
            {clamped}%
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}
