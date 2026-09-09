import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';

/**
 * Detail template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 7. Header
 * (back handled by the stack navigator) → sunken-variant sections for read-only/reference data,
 * e.g. a submitted document's extracted fields.
 */
type Props = NativeStackScreenProps<HomeStackParamList, 'Detail'>;

export function DetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const { title } = route.params;

  const fields = [
    { label: 'Status', value: 'Active' },
    { label: 'Created', value: '2026-09-01' },
    { label: 'Reference', value: `REF-${route.params.id.padStart(4, '0')}` },
  ];

  return (
    <ScreenTemplate title={title}>
      <View style={[styles.section, { backgroundColor: colors.surfaceSunken }]}>
        {fields.map((f) => (
          <View key={f.label} style={styles.fieldRow}>
            <Text style={[type.bodySm, { color: colors.onSurfaceMuted }]}>{f.label}</Text>
            <Text style={[type.body, { color: colors.onSurface }]}>{f.value}</Text>
          </View>
        ))}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.lg, padding: space[4], gap: space[3] },
  fieldRow: { gap: 2 },
});
