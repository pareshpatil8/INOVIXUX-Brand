import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Search, SearchX, X } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { EmptyState } from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { radius, rowMinHeight, space, targetComfortable, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';

/**
 * List template + a form-control header — screen inventory row 8 (Search/filter). Per
 * docs/brand/15-mobile-screen-inventory.md row 8, this is deliberately not a new template: a
 * search input on top of the same list-row composition `HomeScreen` uses. Pushed, usually from a
 * List's header action — here, from `HomeScreen`'s search `HeaderIconButton`.
 */
const ALL_ROWS = [
  { id: '1', title: 'Sample item one', meta: 'Updated today' },
  { id: '2', title: 'Sample item two', meta: 'Updated yesterday' },
  { id: '3', title: 'Sample item three', meta: 'Updated 3 days ago' },
];

type Props = NativeStackScreenProps<HomeStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const results = ALL_ROWS.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <ScreenTemplate scroll={false}>
      <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
        <Search size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder="Search"
          placeholderTextColor={colors.onSurfaceSubtle}
          style={[styles.input, { color: colors.onSurface }]}
        />
        {query ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
            <X size={18} color={colors.onSurfaceMuted} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {results.length === 0 ? (
        <EmptyState icon={SearchX} headline="No results" body="Try a different search." />
      ) : (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('Detail', { id: item.id, title: item.title })}
              style={[styles.row, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}
            >
              <View style={styles.rowText}>
                <Text style={[type.body, { color: colors.onSurface }]}>{item.title}</Text>
                <Text style={[type.bodySm, { color: colors.onSurfaceMuted }]}>{item.meta}</Text>
              </View>
              <ChevronRight size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: targetComfortable,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[4],
    marginTop: space[2],
    marginBottom: space[4],
  },
  input: { flex: 1, fontSize: type.body.fontSize, paddingVertical: space[2] },
  list: { flex: 1 },
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
