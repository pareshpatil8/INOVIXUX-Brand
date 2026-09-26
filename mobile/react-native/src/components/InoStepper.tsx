import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

export interface InoStepperStep {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
  completed?: boolean;
}

/**
 * `InoStepper` — React Native port of `web/src/app/components/stepper/ino-stepper.component.ts`
 * (INO-136). Re-authored, not shared: RN has no CSS custom properties, so every value below reads
 * the same `control`/`radius`/theme-role names the web component reads, never a literal.
 *
 * Rail only, controlled only (there is no uncontrolled mode on mobile, same rule `InoTag`'s RN
 * port documents for other web-only affordances): the parent owns `activeId` and each step's
 * `completed` flag, and renders per-step content with the platform's own idiom (a `switch`, an
 * `IndexedStack`-equivalent, a navigator) — content projection has no RN analog worth
 * re-implementing (full reasoning: SPEC.md §9).
 *
 * Dropped web states with no touch-platform meaning: `hover`, `:focus-visible` (external-keyboard
 * focus is an OS-level highlight), and the full keyboard map. `:active` (pressed) and
 * `loading`/`disabled`/`invalid` carry over.
 */
export function InoStepper({
  steps,
  activeId,
  onActiveIdChange,
  size = 'default',
  orientation = 'horizontal',
  linear = true,
  readonly = false,
}: {
  steps: InoStepperStep[];
  activeId: string;
  onActiveIdChange: (id: string) => void;
  size?: ControlSize;
  orientation?: 'horizontal' | 'vertical';
  linear?: boolean;
  readonly?: boolean;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const vertical = orientation === 'vertical';

  const isReachable = (index: number): boolean => {
    if (!linear) return true;
    for (let i = 0; i < index; i++) {
      if (!steps[i]?.completed) return false;
    }
    return true;
  };

  return (
    <View
      accessibilityRole={vertical ? 'none' : 'tablist'}
      style={vertical ? styles.trackVertical : styles.trackHorizontal}
    >
      {steps.map((step, index) => {
        const active = step.id === activeId;
        const reachable = isReachable(index);
        const locked = !reachable || readonly;
        const isDisabled = !!step.disabled || (locked && !active);

        const indicatorFill = step.completed ? colors.accent : 'transparent';
        const indicatorBorder = step.invalid
          ? colors.dangerTextSafe
          : active || step.completed
            ? colors.accent
            : step.disabled
              ? colors.onSurfaceSubtle
              : colors.border;
        const indicatorText = step.completed
          ? colors.onAccent
          : step.invalid
            ? colors.dangerTextSafe
            : active
              ? colors.accent
              : step.disabled
                ? colors.onSurfaceSubtle
                : colors.onSurfaceMuted;
        const labelColor = active
          ? colors.onSurface
          : step.invalid
            ? colors.dangerTextSafe
            : step.disabled
              ? colors.onSurfaceSubtle
              : colors.onSurfaceMuted;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <View
                style={[
                  vertical ? styles.connectorVertical : styles.connectorHorizontal,
                  { backgroundColor: steps[index - 1]?.completed ? colors.accent : colors.border },
                ]}
              />
            )}
            <Pressable
              disabled={isDisabled}
              onPress={() => !isDisabled && !active && onActiveIdChange(step.id)}
              accessibilityRole="tab"
              accessibilityLabel={`${step.label}, step ${index + 1} of ${steps.length}`}
              accessibilityState={{ disabled: isDisabled, selected: active, busy: step.loading }}
              hitSlop={8}
              style={vertical ? styles.stepVertical : styles.stepHorizontal}
            >
              <View
                style={[
                  styles.indicator,
                  {
                    width: c.iconSize,
                    height: c.iconSize,
                    borderRadius: radius.pill,
                    borderColor: indicatorBorder,
                    backgroundColor: indicatorFill,
                  },
                ]}
              >
                {step.loading ? (
                  <ActivityIndicator size="small" color={indicatorText} />
                ) : (
                  <Text style={{ color: indicatorText, fontSize: c.fontSize * 0.7, fontWeight: '600' }}>
                    {step.completed ? '✓' : index + 1}
                  </Text>
                )}
              </View>
              <View style={vertical ? styles.textVertical : styles.textHorizontal}>
                <Text style={{ color: labelColor, fontSize: c.fontSize, fontWeight: '600' }} numberOfLines={1}>
                  {step.label}
                </Text>
                {!!step.description && (
                  <Text style={{ color: colors.onSurfaceMuted, fontSize: c.fontSize * 0.8 }} numberOfLines={1}>
                    {step.description}
                  </Text>
                )}
              </View>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trackHorizontal: { flexDirection: 'row', alignItems: 'flex-start' },
  trackVertical: { flexDirection: 'column', alignItems: 'stretch' },
  stepHorizontal: { flexDirection: 'column', alignItems: 'center', flex: 0, gap: space[2] },
  stepVertical: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  indicator: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
  textHorizontal: { alignItems: 'center' },
  textVertical: { flexDirection: 'column', flexShrink: 1 },
  connectorHorizontal: { flex: 1, height: 2, alignSelf: 'center', marginTop: 0 },
  connectorVertical: { width: 2, minHeight: space[7], alignSelf: 'flex-start', marginLeft: space[2] },
});
