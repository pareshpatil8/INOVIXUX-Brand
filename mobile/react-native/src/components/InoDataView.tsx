import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, type } from '../theme/tokens';
import { InoLabel } from './InoLabel';

/**
 * `<InoDataView>` — RN port of `<ino-dataview>`
 * (`web/src/app/components/dataview`, INO-454 / INO-31 Phase B3).
 *
 * **List mode only** — doc 26 §5's Notes column reads "Port both (list mode)". No grid layout,
 * no layout switch, no ported paginator: the web component's `<ino-select-button>` layout switch
 * has nothing to switch between here, and the web `<ino-paginator>` integration is deliberately
 * not ported either, for the same desktop-idiom reasoning `ino-paginator`'s own `SPEC.md` §1
 * already recorded — a phone screen answers "get more data" with `FlatList`'s native
 * `onEndReached` infinite scroll, not a row of page-number buttons. See
 * `web/src/app/components/dataview/SPEC.md` §7.
 *
 * A thin, generic `FlatList` wrapper — `renderItem`/`keyExtractor` are plain RN conventions
 * rather than a ported template-directive system (there is no Angular `ng-template` equivalent
 * on this platform, and `InoListbox`'s own port documents the same "no shared build graph"
 * reasoning for leaving its web-only `optionTemplate` slot unported).
 */

export interface InoDataViewProps<T> {
  data: readonly T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  /** Visible caption above the list — the "list label" doc 26 §5 calls out. */
  label?: string;
  loading?: boolean;
  /** Placeholder rows drawn while `loading` is true. 0 falls back to `6`. */
  skeletonItemCount?: number;
  emptyMessage?: string;
  renderEmpty?: () => React.ReactNode;
  /** Native infinite-scroll "get more data" — the mobile-idiom replacement for the web
   *  component's `<ino-paginator>` integration (SPEC.md §7). */
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  style?: StyleProp<ViewStyle>;
}

export function InoDataView<T>({
  data,
  renderItem,
  keyExtractor,
  label,
  loading = false,
  skeletonItemCount = 0,
  emptyMessage = 'No records found.',
  renderEmpty,
  onEndReached,
  onEndReachedThreshold = 0.5,
  style,
}: InoDataViewProps<T>) {
  const { colors } = useTheme();
  const isEmpty = !loading && data.length === 0;

  return (
    <View style={style} accessibilityLabel={label} accessible={!!label}>
      {label ? <InoLabel style={styles.label}>{label}</InoLabel> : null}

      {isEmpty ? (
        renderEmpty ? (
          renderEmpty()
        ) : (
          <Text style={[styles.empty, { color: colors.onSurfaceMuted }]}>{emptyMessage}</Text>
        )
      ) : loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading">
          {Array.from({ length: skeletonItemCount > 0 ? skeletonItemCount : 6 }, (_, i) => (
            <View
              key={i}
              style={[styles.skeletonRow, { backgroundColor: colors.borderSoft }]}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={data as T[]}
          keyExtractor={(item, index) => (keyExtractor ? keyExtractor(item, index) : String(index))}
          renderItem={({ item, index }: ListRenderItemInfo<T>) => <>{renderItem(item, index)}</>}
          onEndReached={onEndReached}
          onEndReachedThreshold={onEndReachedThreshold}
          ListFooterComponent={
            loading ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: space[3],
  },
  empty: {
    textAlign: 'center',
    paddingVertical: space[7],
    ...type.body,
  },
  skeletonRow: {
    height: 44,
    borderRadius: radius.md,
    marginBottom: space[3],
  },
});
