import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ControlSize, space, type } from '../theme/tokens';

/**
 * `<InoIftaLabel>` — RN port of `<ino-ifta-label>`
 * (web/src/app/components/iftalabel, INO-142 / INO-31 T-20).
 *
 * Unlike `<InoFloatLabel>` (a real, stateful re-authoring driven by focus/value props, SPEC.md §1
 * of that component), this port is deliberately **static**: the web component has no rest/floated
 * toggle either (PrimeNG's `IftaLabel` ships one permanently-docked style, not an animated one —
 * `ino-iftalabel.component.ts`'s own doc comment) — so there is nothing here for an `Animated.Value`
 * to interpolate. The label always renders small, docked to the field's top edge.
 *
 * ```tsx
 * <InoIftaLabel label="Username">
 *   <TextInput />
 * </InoIftaLabel>
 * ```
 */
export function InoIftaLabel({
  label,
  size = 'default',
  disabled = false,
  invalid = false,
  readOnly = false,
  children,
  style,
}: {
  label: string;
  size?: ControlSize;
  disabled?: boolean;
  invalid?: boolean;
  readOnly?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  // readOnly has no distinct colour here (unlike <InoLabel>'s onSurface -> onSurfaceMuted
  // step): the docked label is already onSurfaceMuted at rest (ino-label.component.scss
  // `--ino-color-label-muted`), so readOnly is a no-op visually — accepted purely to keep the
  // prop surface 1:1 with the web component's `readonly` -> internal `<ino-label>` forward.
  void readOnly;
  const color = disabled ? colors.onSurfaceSubtle : invalid ? colors.dangerTextSafe : colors.onSurfaceMuted;

  return (
    <View style={[styles.wrap, style]}>
      {/* Permanently reserves the docked label's space — the RN equivalent of the web component's
          unconditional Renderer2 padding-block-start bump (ino-iftalabel.component.ts). */}
      <View style={{ height: space[3] }} />
      {children}
      <Text style={[styles.label, { top: space[2], fontSize: type.labelSm.fontSize, color, pointerEvents: 'none' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  // `start`, not `left` — RN resolves this against the ambient writing direction (same fix
  // `InoToggle`'s thumb inset uses), so the docked label mirrors to the trailing edge under RTL.
  label: { position: 'absolute', start: space[4] },
});
