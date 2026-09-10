import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Search } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { HeaderIconButton } from '../components/HeaderIconButton';
import { useTheme } from '../theme/ThemeProvider';
import { radius, rowMinHeight, space, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';

/**
 * List template (docs/brand/13-mobile-app-patterns.md §2) — covers screen inventory row 5
 * (Home/dashboard) and, with the same component, row 6 (generic list). Vertically stacked
 * `ino-card`-equivalent rows, `interactive`. Placeholder rows only — no real product data; the
 * mobile app's core product surface (tab slot 2) is still an open product question per
 * docs/brand/15-mobile-screen-inventory.md §2, not a branding decision.
 */
const PLACEHOLDER_ROWS = [
  { id: '1', title: 'Sample item one', meta: 'Updated today' },
  { id: '2', title: 'Sample item two', meta: 'Updated yesterday' },
  { id: '3', title: 'Sample item three', meta: 'Updated 3 days ago' },
];

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();

  return (
    <ScreenTemplate
      title="Home"
      scroll={false}
      actions={<HeaderIconButton icon={Search} label="Search" onPress={() => navigation.navigate('Search')} />}
    >
      <FlatList
        data={PLACEHOLDER_ROWS}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Detail', { id: item.id, title: item.title })}
            style={[
              styles.row,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[type.body, { color: colors.onSurface }]}>{item.title}</Text>
              <Text style={[type.bodySm, { color: colors.onSurfaceMuted }]}>{item.meta}</Text>
            </View>
            <ChevronRight size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      />
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: rowMinHeight,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { gap: 2 },
});
