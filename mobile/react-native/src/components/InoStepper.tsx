import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize } from '../theme/tokens';

export type InoStepperOrientation = 'horizontal' | 'vertical';

/**
 * One step's header metadata in an `InoStepper` rail. Mirrors web's `<ino-step>` `@Input`s minus
 * its projected panel content — the RN port renders the rail only (see `InoStepper` doc comment).
 * `completed` mirrors web's `<ino-step completed>` — a **consumer-owned** flag the caller sets once
 * that step's own validation passes (web's `<ino-stepper>` never derives it internally; see
 * `web/src/app/components/stepper/SPEC.md` §1). Since this port is controlled-only, the parent
 * (which already owns `activeIndex`) supplies it directly, same as on web.
 */
export type InoStepperItem = {
  label: string;
  disabled?: boolean;
  completed?: boolean;
};

/**
 * `InoStepper` — React Native port of `web/src/app/components/stepper/ino-stepper.component.ts` +
 * `ino-step.component.ts` (INO-136 / INO-31 T-27). Re-authored, not shared: RN has no CSS custom
 * properties, so every value below reads the same `control`/theme-role names the web component
 * reads, never a literal.
 *
 * Scope differences from web, all deliberate — same class of omission `InoTabs`' RN port documents
 * for the sibling container/leaf component:
 * - **Rail only.** This renders the step rail and reports the active index; the parent renders the
 *   panel content. Web uses content projection (`<ino-step>` as a real child component), which has
 *   no RN equivalent worth inventing.
 * - **Controlled only, index-based.** Matches web's `[(activeIndex)]` two-way binding exactly — an
 *   RN caller already has a state hook, so an internal fallback would be a second source of truth
 *   for the active step. `linear` only gates header taps here (`onActiveIndexChange` is never
 *   called for an unreachable step); the caller's own `next()`/`previous()` equivalent is just
 *   incrementing `activeIndex` after confirming the current step's `completed` flag is set, same
 *   as web's `next()` — which also goes through its own reachability gate rather than bypassing it.
 * - **No keyboard map / focus ring.** No arrow keys on a touch surface, and external-keyboard focus
 *   is an OS-level highlight.
 */
export function InoStepper({
  items,
  activeIndex,
  onActiveIndexChange,
  size = 'default',
  orientation = 'horizontal',
  linear = true,
}: {
  items: InoStepperItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  size?: ControlSize;
  orientation?: InoStepperOrientation;
  linear?: boolean;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const vertical = orientation === 'vertical';
  const clampedIndex = items.length ? Math.min(Math.max(0, activeIndex), items.length - 1) : 0;

  const isReachable = (index: number): boolean => {
    if (items[index]?.disabled) return false;
    if (!linear) return true;
    return index <= clampedIndex || !!items[index]?.completed;
  };

  const children: React.ReactNode[] = [];
  items.forEach((step, index) => {
    if (index > 0) {
      children.push(
        <View
          key={`connector-${index}`}
          style={
            vertical
              ? { width: 1, height: 24, marginLeft: c.iconSize / 2 - 0.5, backgroundColor: colors.border }
              : { flex: 1, height: 1, minWidth: 20, backgroundColor: colors.border, alignSelf: 'center' }
          }
        />
      );
    }

    const isActive = index === clampedIndex;
    const completed = !!step.completed;
    const reachable = isReachable(index);

    const badgeBackground = completed ? colors.accentSecondary : isActive ? colors.accent : 'transparent';
    const badgeBorder = completed ? colors.accentSecondary : isActive ? colors.accent : colors.border;
    const badgeText = completed || isActive ? colors.onAccent : colors.onSurfaceMuted;
    const labelColor = isActive || completed ? colors.onSurface : colors.onSurfaceMuted;

    children.push(
      <Pressable
        key={index}
        onPress={reachable && !isActive ? () => onActiveIndexChange(index) : undefined}
        disabled={!reachable}
        accessibilityRole="tab"
        accessibilityLabel={`${step.label}, step ${index + 1} of ${items.length}`}
        accessibilityState={{ selected: isActive, disabled: !!step.disabled }}
        style={{
          flex: vertical ? undefined : 1,
          opacity: step.disabled ? 0.5 : 1,
          padding: 8,
          flexDirection: vertical ? 'row' : 'column',
          alignItems: 'center',
          gap: c.gap,
        }}
      >
        <View
          style={{
            width: c.iconSize,
            height: c.iconSize,
            borderRadius: c.iconSize / 2,
            borderWidth: 1,
            borderColor: badgeBorder,
            backgroundColor: badgeBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: badgeText, fontSize: c.fontSize * 0.75, fontWeight: '600' }}>
            {completed && !isActive ? '✓' : index + 1}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: labelColor, fontSize: c.fontSize, fontWeight: '600' }}>
          {step.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View accessibilityRole="tablist" style={vertical ? { flexDirection: 'column', alignItems: 'flex-start' } : { flexDirection: 'row' }}>
      {children}
    </View>
  );
}
