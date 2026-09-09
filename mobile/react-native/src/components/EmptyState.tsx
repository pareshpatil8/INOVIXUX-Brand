import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space, targetComfortable, type } from '../theme/tokens';

/**
 * Empty state / error-offline template — docs/brand/13-mobile-app-patterns.md §2 row "Empty
 * state" + docs/brand/15-mobile-screen-inventory.md rows 12 (empty) and 13 (error/offline, same
 * composition, different copy+icon). Icon set: docs/brand/14-icon-system.md (Lucide, 32px row,
 * `--ino-color-on-surface-muted` by default).
 */
export function EmptyState({
  icon: Icon,
  headline,
  body,
  ctaLabel,
  onPressCta,
}: {
  icon: LucideIcon;
  headline: string;
  body?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={32} color={colors.onSurfaceMuted} strokeWidth={2} />
      <Text style={[styles.headline, { color: colors.onSurface }]}>{headline}</Text>
      {body ? <Text style={[styles.body, { color: colors.onSurfaceMuted }]}>{body}</Text> : null}
      {ctaLabel && onPressCta ? (
        <TouchableOpacity
          onPress={onPressCta}
          style={[styles.cta, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaLabel, { color: colors.onAccent }]}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], paddingHorizontal: space[6] },
  headline: { ...type.h3, textAlign: 'center' },
  body: { ...type.body, textAlign: 'center' },
  cta: {
    minHeight: targetComfortable,
    paddingHorizontal: space[6],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[2],
  },
  ctaLabel: { ...type.body, fontWeight: '600' },
});
