import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space, targetComfortable } from '../theme/tokens';

/**
 * `InoTabs` — React Native port of `<ino-tabs>` (web/src/app/components/tabs, INO-135 / INO-31
 * T-26). Re-authored, not shared: RN has no CSS custom properties, so every value below reads the
 * same `control`/`radius`/`space`/theme-role names the web component reads, never a literal.
 *
 * Scope differences from web, all deliberate and all recorded in that component's SPEC.md §9:
 * - **Strip only.** This renders the tab strip and reports which tab is active; the parent renders
 *   the content. Web uses content projection (`<ino-tab-panel>`); RN's idiom for the same thing is
 *   a parent `switch` or a navigator, and re-implementing `<ng-content>` here would be a worse
 *   version of the platform's own answer.
 * - **Controlled only.** Web has an uncontrolled mode because an Angular template can declare tabs
 *   with no backing state. An RN caller always has a state hook already, so an internal fallback
 *   would just be a second source of truth for the active tab.
 * - **No keyboard map / focus ring.** No arrow keys on a touch surface, and external-keyboard focus
 *   is an OS-level highlight — the same states `InoButton` drops, for the same reason. `hover` goes
 *   with them.
 * - **No scroll buttons under `scrollable`.** A touch surface scrolls by dragging; web needs ‹/›
 *   only because a mouse does not.
 * The ✕ *is* a real control here, unlike web (where a control nested inside the tab `<button>`
 * would be invalid HTML) — RN has no such restriction, so it gets its own 44px hit area instead of
 * web's Delete-key fallback.
 */

export type InoTabItem = {
  id: string;
  label: string;
  disabled?: boolean;
  closable?: boolean;
  invalid?: boolean;
  loading?: boolean;
};

export function InoTabs({
  tabs,
  activeId,
  onActiveIdChange,
  size = 'default',
  scrollable = false,
  readonly = false,
  onTabClose,
}: {
  tabs: InoTabItem[];
  /** Controlled: the parent always owns which tab is active. */
  activeId: string;
  onActiveIdChange: (id: string) => void;
  size?: ControlSize;
  scrollable?: boolean;
  /** Focusable/visible but inert: selection and close are both refused. Same contract as web. */
  readonly?: boolean;
  onTabClose?: (id: string) => void;
}) {
  const { colors } = useTheme();
  const c = control[size];

  const select = (tab: InoTabItem) => {
    if (tab.disabled || readonly || tab.id === activeId) return;
    onActiveIdChange(tab.id);
  };

  const strip = tabs.map(tab => {
    const isActive = tab.id === activeId;
    const label = tab.disabled
      ? colors.onSurfaceSubtle
      : tab.invalid
        ? colors.dangerTextSafe
        : isActive
          ? colors.onSurface
          : colors.onSurfaceMuted;

    return (
      <Pressable
        key={tab.id}
        onPress={() => select(tab)}
        disabled={tab.disabled || readonly}
        accessibilityRole="tab"
        accessibilityLabel={tab.closable && !readonly ? `${tab.label}, closable` : tab.label}
        accessibilityState={{ selected: isActive, disabled: !!tab.disabled, busy: !!tab.loading }}
        style={({ pressed }) => [
          styles.tab,
          {
            minHeight: c.height,
            paddingHorizontal: c.paddingInlineRoomy,
            gap: c.gap,
            // The selected-tab indicator is a bottom border, same as web — borderBottomWidth is
            // RN's only border primitive here, and `borderBottomColor` is the sole physical name
            // in this file (RN has no logical border properties; `I18nManager` mirrors the row).
            borderBottomWidth: 2,
            borderBottomColor: isActive
              ? tab.invalid
                ? colors.dangerTextSafe
                : colors.accent
              : 'transparent',
            opacity: tab.disabled ? 0.5 : 1,
          },
          pressed && !tab.disabled && !readonly && { backgroundColor: colors.surfaceRaised },
        ]}
      >
        {({ pressed }) => (
          <View style={styles.row}>
            {tab.loading && (
              <ActivityIndicator
                size="small"
                color={label}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            )}
            {tab.invalid && !tab.loading && (
              <View style={[styles.invalidDot, { backgroundColor: colors.dangerTextSafe }]} />
            )}
            <Text
              numberOfLines={1}
              style={{
                color: pressed && !tab.disabled && !readonly ? colors.accentActive : label,
                fontSize: c.fontSize,
                fontWeight: '600',
              }}
            >
              {tab.label}
            </Text>
            {tab.closable && !readonly && (
              <Pressable
                onPress={() => onTabClose?.(tab.id)}
                accessibilityRole="button"
                accessibilityLabel={`Close ${tab.label}`}
                // Floor the tappable area at the comfortable target even though the glyph is
                // icon-sized — same fix the web stylesheet makes with max(icon-size, target-min).
                hitSlop={Math.max(0, (targetComfortable - c.iconSize) / 2)}
                style={{
                  width: c.iconSize,
                  height: c.iconSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.sm,
                }}
              >
                <Text style={{ color: colors.onSurfaceMuted, fontSize: 11, lineHeight: 11 }}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    );
  });

  const border = { borderBottomWidth: 1, borderBottomColor: colors.border };

  return scrollable ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={border}
      contentContainerStyle={styles.strip}
    >
      {strip}
    </ScrollView>
  ) : (
    <View accessibilityRole="tablist" style={[styles.strip, styles.wrap, border]}>
      {strip}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  // Non-scrollable mirrors web's default: wrap rather than clip, so a caller who did not opt into
  // `scrollable` never silently loses a tab off-screen.
  wrap: { flexWrap: 'wrap' },
  tab: { justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  invalidDot: { width: 6, height: 6, borderRadius: radius.pill },
});
