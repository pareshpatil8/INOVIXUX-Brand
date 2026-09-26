import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, motion, radius } from '../theme/tokens';

export type InoSkeletonShape = 'rectangle' | 'circle' | 'text';

/**
 * `InoSkeleton` — React Native port of
 * `web/src/app/components/skeleton/ino-skeleton.component.ts` (INO-131 / INO-31 T-14). Re-authored,
 * not shared: RN has no CSS custom properties or `@keyframes`, so the shimmer is a looping
 * `Animated.Value` driving `translateX` on a gradient-less overlay strip instead — `useNativeDriver:
 * true` keeps it off the JS thread, matching the web version's "transform/position-only, no layout
 * thrash" shimmer.
 *
 * Full reasoning (shape defaults, size scale, reduced-motion gate, dropped `label` prop):
 * `web/src/app/components/skeleton/SPEC.md` §7.
 */
export function InoSkeleton({
  shape = 'rectangle',
  size = 'default',
  width,
  height,
  borderRadius,
  animate = true,
}: {
  shape?: InoSkeletonShape;
  size?: ControlSize;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  animate?: boolean;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const [reduceMotion, setReduceMotion] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (!animate || reduceMotion) {
      shimmer.stopAnimation();
      shimmer.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: motion.durationSlow * 3, // 1440ms — a readable sweep; a bare durationSlow (480ms)
        // per pass reads as flicker, not a shimmer, at this element's typical size.
        easing: Easing.bezier(...motion.easingStandard),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animate, reduceMotion, shimmer]);

  const defaultGeometry: ViewStyle =
    shape === 'circle'
      ? { width: c.height, height: c.height, borderRadius: c.height / 2 }
      : shape === 'text'
        ? { width: '100%', height: c.fontSize, borderRadius: radius.sm }
        : { width: '100%', height: c.height, borderRadius: radius.md };

  const style: ViewStyle = {
    ...defaultGeometry,
    ...(width !== undefined ? { width } : null),
    ...(height !== undefined ? { height } : null),
    ...(borderRadius !== undefined ? { borderRadius } : null),
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  };

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });

  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {animate && !reduceMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.border, opacity: 0.6, transform: [{ translateX }] },
          ]}
        />
      )}
    </View>
  );
}
