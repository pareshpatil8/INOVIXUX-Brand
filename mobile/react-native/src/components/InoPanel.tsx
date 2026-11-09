import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, radius, space } from '../theme/tokens';

export type InoPanelSize = 'sm' | 'md' | 'lg';

const PADDING: Record<InoPanelSize, number> = {
  sm: control.sm.paddingInlineRoomy,
  md: control.default.paddingInlineRoomy,
  lg: control.lg.paddingInlineRoomy,
};

export interface InoPanelProps {
  header?: string;
  size?: InoPanelSize;
  /** Adds a disclosure toggle across the header bar. Most panels are static grouping (default
   *  `false`) — see web/src/app/components/panel/SPEC.md §4. */
  collapsible?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
  /** Locks the collapse toggle only — behavior-only, no accessibility role exists on RN for a
   *  readonly region (mirrors web's "no aria-readonly on `region`" call, SPEC.md §2). */
  readonly?: boolean;
  loading?: boolean;
  /** Actions bar, same idiom as `<InoCard>`'s `footer` prop — RN has no content-projection
   *  equivalent of web's `[ino-panel-footer]`. */
  footer?: ReactNode;
  children?: ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
  style?: ViewStyle;
}

/**
 * `<InoPanel>` — RN port of `<ino-panel>` (web/src/app/components/panel, INO-437 / INO-31 B2).
 * Combines `<InoFieldset>`'s collapsible-toggle logic (`Pressable` + `accessibilityState={{
 * expanded, disabled: readonly }}`) with `<InoCard>`'s explicit `footer` prop. `accessibilityRole
 * ="none"` on the shell — RN has no `region` landmark role equivalent to web's `role="region"` —
 * with `accessibilityLabel={header}` carrying the same labelled-landmark intent (SPEC.md §3) as
 * best RN allows.
 */
export function InoPanel({
  header,
  size = 'md',
  collapsible = false,
  collapsed = false,
  disabled = false,
  readonly = false,
  loading = false,
  footer,
  children,
  onCollapsedChange,
  style,
}: InoPanelProps) {
  const { colors } = useTheme();
  const expanded = !collapsed;
  const showBody = !collapsible || expanded;
  const padding = PADDING[size];

  const toggle = () => {
    if (disabled || readonly) return;
    onCollapsedChange?.(!collapsed);
  };

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={header}
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: colors.surfaceRaised, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {header ? (
        collapsible ? (
          <Pressable
            onPress={toggle}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ expanded, disabled: readonly || disabled }}
            style={[styles.headerBar, { paddingHorizontal: padding, paddingVertical: padding, borderBottomColor: colors.borderSoft }]}
          >
            <Text style={[styles.chevron, { color: colors.onSurface }, expanded ? styles.chevronExpanded : null]}>
              {'▸'}
            </Text>
            <Text style={[styles.headerText, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>
              {header}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.headerBar, { paddingHorizontal: padding, paddingVertical: padding, borderBottomColor: colors.borderSoft }]}>
            <Text style={[styles.headerText, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>
              {header}
            </Text>
          </View>
        )
      ) : null}

      {showBody ? (
        <View style={[styles.body, { paddingHorizontal: padding, paddingVertical: padding, opacity: loading ? 0.5 : 1 }]}>
          {children}
        </View>
      ) : null}

      {footer ? (
        <View style={[styles.footerBar, { paddingHorizontal: padding, paddingVertical: padding, borderTopColor: colors.borderSoft }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: space[1], borderBottomWidth: 1 },
  chevron: { fontSize: 11, transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  headerText: { fontWeight: '600' },
  body: {},
  footerBar: { borderTopWidth: 1 },
});
