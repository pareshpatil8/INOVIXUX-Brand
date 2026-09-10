import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { ConfirmActionSheet } from '../components/ConfirmActionSheet';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, targetComfortable, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';

/**
 * Detail template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 7. Header
 * (back handled by the stack navigator) → sunken-variant section for read-only/reference data,
 * e.g. a submitted document's extracted fields. Delete action below proves the Modal-action
 * template (screen inventory row 11) from a real call site rather than only in isolation.
 */
type Props = NativeStackScreenProps<HomeStackParamList, 'Detail'>;

export function DetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { title } = route.params;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => setConfirmingDelete(true)}
        style={[styles.deleteButton, { borderColor: colors.danger }]}
      >
        <Text style={[type.body, { color: colors.danger, fontWeight: '600' }]}>Delete</Text>
      </TouchableOpacity>

      <ConfirmActionSheet
        visible={confirmingDelete}
        title={`Delete "${title}"?`}
        body="This can't be undone."
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          navigation.goBack();
        }}
      />
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.lg, padding: space[4], gap: space[3] },
  fieldRow: { gap: 2 },
  deleteButton: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[5],
  },
});
