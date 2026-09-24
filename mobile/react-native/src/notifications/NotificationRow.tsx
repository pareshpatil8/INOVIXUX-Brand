import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, rowMinHeight, space, type } from '../theme/tokens';
import { categoryGlyph, categoryTint } from './categories';
import type { InoNotification } from './NotificationCenter';

/**
 * Notifications list row — docs/brand/13-mobile-app-patterns.md §6.2 row 3 (in-row unread marker)
 * + §6.4 (category glyph), INO-112.
 *
 * The unread signal is an 8px (`--ino-space-2`) `--ino-color-accent` dot in the row's leading slot
 * **plus** the title at body weight rather than muted. Colour is never the only signal — the same
 * rule `14-icon-system.md` §3's RAG-dot note sets.
 */
export function NotificationRow({
  notification,
  unread,
  onPress,
}: {
  notification: InoNotification;
  unread: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const Glyph = categoryGlyph[notification.category];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}`}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}
    >
      {/* Leading slot: the unread dot, or a same-width spacer so read and unread rows keep their
          text on the same left edge. */}
      <View style={styles.markerSlot}>
        {unread ? <View style={[styles.marker, { backgroundColor: colors.accent }]} /> : null}
      </View>
      <Glyph size={20} color={categoryTint(notification.category, colors)} strokeWidth={2} />
      <View style={styles.text}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              // Second, non-colour unread signal: body weight vs muted.
              color: unread ? colors.onSurface : colors.onSurfaceMuted,
              fontWeight: unread ? '600' : '400',
            },
          ]}
        >
          {notification.title}
        </Text>
        {notification.body ? (
          <Text numberOfLines={2} style={[styles.body, { color: colors.onSurfaceMuted }]}>
            {notification.body}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    minHeight: rowMinHeight,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  markerSlot: { width: space[2], paddingTop: space[1] + 2, alignItems: 'center' },
  marker: { width: space[2], height: space[2], borderRadius: space[1] },
  text: { flex: 1 },
  title: { ...type.body },
  body: { ...type.bodySm },
});
