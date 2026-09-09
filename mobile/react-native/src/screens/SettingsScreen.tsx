import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Moon, Sun, SunMoon } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, rowMinHeight, space, type } from '../theme/tokens';

/**
 * Settings / account template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row
 * 10. Grouped sections, list-row pattern inside each group (reuses the List template's row).
 * Real theme override control — the one bit of live state this scaffold actually wires up, since
 * it's the mobile equivalent of web's ThemeService toggle (13-…patterns.md §3).
 */
export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();

  const themeOptions: { key: typeof mode; label: string; icon: typeof Sun }[] = [
    { key: 'system', label: 'System', icon: SunMoon },
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <ScreenTemplate title="Settings">
      <Text style={[styles.groupLabel, { color: colors.onSurfaceMuted }]}>APPEARANCE</Text>
      <View style={[styles.group, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
        {themeOptions.map(({ key, label, icon: Icon }, i) => (
          <TouchableOpacity
            key={key}
            accessibilityRole="button"
            onPress={() => setMode(key)}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}
          >
            <View style={styles.rowLeft}>
              <Icon size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
              <Text style={[type.body, { color: colors.onSurface }]}>{label}</Text>
            </View>
            {mode === key ? (
              <ChevronRight size={18} color={colors.accent} strokeWidth={2.5} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  groupLabel: { ...type.label, marginTop: space[4], marginBottom: space[2] },
  group: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: {
    minHeight: rowMinHeight,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
