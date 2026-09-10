import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, LayoutGrid, LogIn, Moon, Sun, SunMoon, WifiOff } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, rowMinHeight, space, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/RootNavigator';

/**
 * Settings / account template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row
 * 10. Grouped sections, list-row pattern inside each group (reuses the List template's row).
 * Real theme override control — the one bit of live state this scaffold actually wires up, since
 * it's the mobile equivalent of web's ThemeService toggle (13-…patterns.md §3).
 *
 * A second "Preview" section links to the templates that don't have a natural in-app entry point
 * yet (auth/onboarding lives pre-tab-bar, behind a signed-out state this scaffold doesn't model) —
 * kept reachable so every screen in the inventory is a real, running screen, not just a file on
 * disk.
 */
type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, mode, setMode } = useTheme();

  const themeOptions: { key: typeof mode; label: string; icon: typeof Sun }[] = [
    { key: 'system', label: 'System', icon: SunMoon },
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'high-contrast', label: 'High contrast', icon: SunMoon },
  ];

  const previewLinks: { label: string; icon: typeof Sun; onPress: () => void }[] = [
    { label: 'Onboarding', icon: LayoutGrid, onPress: () => navigation.navigate('Onboarding') },
    { label: 'Sign in', icon: LogIn, onPress: () => navigation.navigate('SignIn') },
    { label: 'Error / offline state', icon: WifiOff, onPress: () => navigation.navigate('ErrorOffline') },
  ];

  return (
    <ScreenTemplate title="Settings">
      <Text style={[styles.groupLabel, { color: colors.onSurfaceMuted }]}>APPEARANCE</Text>
      <View style={[styles.group, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
        {themeOptions.map(({ key, label, icon: Icon }, i) => (
          <TouchableOpacity
            key={key}
            accessibilityState={{ selected: mode === key }}
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

      <Text style={[styles.groupLabel, { color: colors.onSurfaceMuted }]}>PREVIEW</Text>
      <View style={[styles.group, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
        {previewLinks.map(({ label, icon: Icon, onPress }, i) => (
          <TouchableOpacity
            key={label}
            accessibilityRole="button"
            onPress={onPress}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}
          >
            <View style={styles.rowLeft}>
              <Icon size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
              <Text style={[type.body, { color: colors.onSurface }]}>{label}</Text>
            </View>
            <ChevronRight size={18} color={colors.onSurfaceMuted} strokeWidth={2} />
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
