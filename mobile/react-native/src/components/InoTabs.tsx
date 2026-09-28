import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

export type InoTabsOrientation = 'horizontal' | 'vertical';

/**
 * One tab's label metadata in an `InoTabs` strip. Mirrors web's `<ino-tab-panel>` `@Input`s minus its
 * projected panel content: the RN port renders the strip only (see `InoTabs` doc comment) — the
 * panel body is markup an RN caller already owns via a `switch`/navigator.
 */
export type InoTabItem = {
  label: string;
  disabled?: boolean;
};

/**
 * `InoTabs` — React Native port of `web/src/app/components/tabs/ino-tabs.component.ts` +
 * `ino-tab-panel.component.ts` (INO-135 / INO-31 T-26). Re-authored, not shared: RN has no CSS custom
 * properties, so every value below reads the same `control`/`space`/theme-role names the web
 * component reads, never a literal.
 *
 * Scope differences from web, all deliberate:
 * - **Strip only.** This renders the tab strip and reports the active index; the parent renders
 *   the content. Web uses content projection (`<ino-tab-panel>` as a real child component), which has no
 *   RN equivalent worth inventing — an RN caller already renders content via a `switch`/navigator.
 * - **Controlled only, index-based.** Matches web's `[(activeIndex)]` two-way binding exactly — an
 *   RN caller always has a state hook already, so an internal fallback would be a second source of
 *   truth for the active tab.
 * - **No keyboard map / focus ring.** No arrow keys on a touch surface, and external-keyboard focus
 *   is an OS-level highlight — the same states `InoButton` drops, for the same reason. `hover`
 *   goes with them.
 */
export function InoTabs({
  items,
  activeIndex,
  onActiveIndexChange,
  size = 'default',
  orientation = 'horizontal',
}: {
  items: InoTabItem[];
  /** Controlled: the parent always owns which tab is active. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  size?: ControlSize;
  orientation?: InoTabsOrientation;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const isVertical = orientation === 'vertical';
  const clampedIndex = items.length ? Math.min(Math.max(0, activeIndex), items.length - 1) : 0;

  const select = (index: number, tab: InoTabItem) => {
    if (tab.disabled || index === clampedIndex) return;
    onActiveIndexChange(index);
  };

  const strip = items.map((tab, index) => {
    const isActive = index === clampedIndex;
    const labelColor = isActive ? colors.onSurface : colors.onSurfaceMuted;
    const indicatorColor = isActive ? colors.accent : 'transparent';

    return (
      <Pressable
        key={index}
        onPress={() => select(index, tab)}
        disabled={tab.disabled}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive, disabled: !!tab.disabled }}
        style={{
          minHeight: c.height,
          justifyContent: isVertical ? 'center' : 'center',
          alignItems: isVertical ? 'flex-start' : 'center',
          paddingHorizontal: c.paddingInline,
          opacity: tab.disabled ? 0.5 : 1,
          ...(isVertical
            ? { borderRightWidth: 2, borderRightColor: indicatorColor }
            : { borderBottomWidth: 2, borderBottomColor: indicatorColor }),
        }}
      >
        <Text numberOfLines={1} style={{ color: labelColor, fontSize: c.fontSize, fontWeight: '600' }}>
          {tab.label}
        </Text>
      </Pressable>
    );
  });

  const border = isVertical
    ? { borderRightWidth: 1, borderRightColor: colors.border, paddingRight: space[2] }
    : { borderBottomWidth: 1, borderBottomColor: colors.border };

  return (
    <View
      accessibilityRole={isVertical ? undefined : 'tablist'}
      style={
        isVertical
          ? { flexDirection: 'row', alignItems: 'flex-start' }
          : { flexDirection: 'row', flexWrap: 'wrap', ...border }
      }
    >
      <View style={isVertical ? [{ flexDirection: 'column' }, border] : undefined}>{strip}</View>
    </View>
  );
}
