import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import type { BadgeState } from './NotificationCenter';

/**
 * Tab-bar badge — docs/brand/13-mobile-app-patterns.md §6.2 row 2, INO-112.
 *
 * Dot when the count is unknown, numeral when known, `99+` above 99. Fill `--ino-color-danger`,
 * label `--ino-color-on-danger` (both audited in all three themes), `--ino-radius-pill`,
 * `--ino-type-label-size` (11px) **without** the label token's uppercase tracking — tracking on a
 * 2-character numeral just decentres it.
 *
 * Painted as an absolutely-positioned overlay on the tab icon, so it sits *inside* the 44px
 * `--ino-target-comfortable` tab target: it never enlarges the target or displaces the icon+label
 * pair §1 requires. That is the whole reason this wraps the icon rather than sitting beside it.
 *
 * Not React Navigation's built-in `tabBarBadge`: that option renders a numeral only, with its own
 * Material styling, and has no dot form — so it can express "3 unread" but not §6.2's "unread,
 * count unknown", which is the state this app is actually in until §6.7 item 4 lands.
 */
export function TabBadge({ icon, state }: { icon: React.ReactNode; state: BadgeState }) {
  const { colors } = useTheme();
  if (!state.visible) return <>{icon}</>;

  const isDot = state.count == null;

  return (
    <View style={styles.wrapper}>
      {icon}
      <View
        accessible
        // A colour-and-shape-only badge is invisible to a screen reader, so it gets words. The
        // dot-vs-numeral distinction is preserved in the label, not flattened away.
        accessibilityLabel={isDot ? 'Unread notifications' : `${state.label} unread notifications`}
        style={[
          styles.badge,
          isDot ? styles.dot : styles.pill,
          { backgroundColor: colors.danger },
        ]}
      >
        {isDot ? null : (
          <Text style={[styles.label, { color: colors.onDanger }]}>{state.label}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8 },
  pill: { minWidth: 16, height: 16, paddingHorizontal: 4 },
  // --ino-type-label-size (11px), deliberately without the label token's letterSpacing.
  label: { fontSize: 11, fontWeight: '600', lineHeight: 13 },
});
