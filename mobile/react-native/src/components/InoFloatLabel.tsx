import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, motion, space, type } from '../theme/tokens';

export type InoFloatLabelVariant = 'over' | 'in' | 'on';

/**
 * `<InoFloatLabel>` — RN port of `<ino-float-label>`
 * (web/src/app/components/floatlabel, INO-141 / INO-31 T-18).
 *
 * The web component derives "floated" purely from CSS (`:focus` / `:not(:placeholder-shown)`) —
 * RN has neither, so this port is a real, stateful re-authoring (plan rev 9 §5's "React Native and
 * Flutter are real ports" rule), not a 1:1 CSS translation: the caller controls its own
 * `TextInput`/`focused`/`value` and this component only owns the label's position/scale
 * `Animated.Value` and interpolation, driven by those two props.
 *
 * Usage — wrap the field, forward `onFocus`/`onBlur` back into the field so both the caller and
 * this component observe the same focus transitions:
 *
 * ```tsx
 * <InoFloatLabel label="Username" variant="over" value={value} focused={focused}>
 *   <TextInput
 *     value={value}
 *     onChangeText={setValue}
 *     onFocus={() => setFocused(true)}
 *     onBlur={() => setFocused(false)}
 *   />
 * </InoFloatLabel>
 * ```
 */
export function InoFloatLabel({
  label,
  variant = 'over',
  size = 'default',
  value,
  focused = false,
  disabled = false,
  invalid = false,
  children,
  style,
}: {
  label: string;
  variant?: InoFloatLabelVariant;
  size?: ControlSize;
  /** Non-empty value floats the label, mirroring web's `:not(:placeholder-shown)`. */
  value?: string;
  /** Mirrors web's `:focus` — pass the wrapped field's own focus state. */
  focused?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const sizeTokens = control[size];
  const floated = focused || !!value;
  const progress = useRef(new Animated.Value(floated ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: floated ? 1 : 0,
      duration: motion.durationFast,
      easing: Easing.bezier(...motion.easingStandard),
      useNativeDriver: false, // fontSize/top are not native-driver-eligible
    }).start();
  }, [floated, progress]);

  const restTop = variant === 'over' ? sizeTokens.height / 2 : sizeTokens.height / 2 + space[2];
  const floatedTop = variant === 'over' ? -space[2] - type.labelSm.lineHeight : space[2];

  const top = progress.interpolate({ inputRange: [0, 1], outputRange: [restTop, floatedTop] });
  const fontSize = progress.interpolate({ inputRange: [0, 1], outputRange: [type.body.fontSize, type.labelSm.fontSize] });

  const color = disabled ? colors.onSurfaceSubtle : invalid ? colors.dangerTextSafe : colors.onSurfaceMuted;

  return (
    <View style={[styles.wrap, style]}>
      {(variant === 'in' || variant === 'on') && (
        // "in"/"on" permanently reserve the docked label's space, same as the web component's
        // padding-block-start bump on the wrapped control — done here via extra height on the
        // field rather than on `children` directly, since RN can't reach into an arbitrary child's
        // own style the way `::ng-deep` does on web.
        <View style={{ height: space[3] }} />
      )}
      {children}
      <Animated.Text
        pointerEvents="none"
        style={[
          styles.label,
          {
            top,
            fontSize,
            color,
            paddingHorizontal: variant === 'on' ? space[1] : 0,
            backgroundColor: variant === 'on' ? colors.surface : 'transparent',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  label: { position: 'absolute', left: space[4] },
});
