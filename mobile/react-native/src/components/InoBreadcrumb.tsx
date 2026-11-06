import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, space } from '../theme/tokens';

export interface InoBreadcrumbItem {
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface InoBreadcrumbProps {
  items: InoBreadcrumbItem[];
  /** Collapses the middle of the trail behind a `…` once `items.length` exceeds this and a hard
   *  floor of 3 — same rule the web component's SPEC.md §3 documents. `0` (default) never
   *  collapses. */
  maxVisible?: number;
  /** Renders every non-current crumb as inert text; the current-page item is unaffected. */
  readonly?: boolean;
  onItemPress?: (item: InoBreadcrumbItem) => void;
}

/**
 * `<InoBreadcrumb>` — RN port of `<ino-breadcrumb>`
 * (`web/src/app/components/breadcrumb`, INO-429 / INO-31 B2).
 *
 * Scope (SPEC.md §10): icons, per-item `disabled`, the current-page item (always the last entry,
 * never pressable), and collapsed-middle overflow. Two deliberate reinterpretations:
 *
 * - **No popover.** Neither mobile toolkit treats an anchored popover as the idiomatic way to
 *   reveal a handful of hidden strings on a small screen. Pressing the `…` here expands the
 *   hidden items inline, in place of the ellipsis, instead of opening an overlay.
 * - **No Angular Router.** There is no `href`/`routerLink` equivalent — the host app owns
 *   navigation and is handed the raw item via `onItemPress`, the same plain-callback contract
 *   `InoSelectButton`'s port already uses in place of a specific navigation library.
 *
 * **ARIA.** Web uses `nav[aria-label]` + `ol`/`li` + `aria-current="page"`. RN has none of those
 * roles; each navigable crumb is `accessibilityRole="button"`, the current crumb a plain `Text`
 * with no role (matching the web rule that the current page is never interactive), and decorative
 * icons/separators are hidden from the accessibility tree via `accessibilityElementsHidden` +
 * `importantForAccessibility="no-hide-descendants"`, the same substitution `InoButton`'s spinner
 * and other decorative glyphs in this catalog use for `aria-hidden`.
 *
 * `readonly` and `loading` are web-only — see SPEC.md §10.
 */
export function InoBreadcrumb({ items, maxVisible = 0, readonly = false, onItemPress }: InoBreadcrumbProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const ctrl = control.default;

  const lastIndex = items.length - 1;
  const isCollapsed = !expanded && maxVisible > 0 && items.length > maxVisible && items.length > 3;

  const visible: Array<{ item: InoBreadcrumbItem; isCurrent: boolean; index: number }> = isCollapsed
    ? [
        { item: items[0], isCurrent: false, index: 0 },
        { item: items[lastIndex - 1], isCurrent: false, index: lastIndex - 1 },
        { item: items[lastIndex], isCurrent: true, index: lastIndex },
      ]
    : items.map((item, index) => ({ item, isCurrent: index === lastIndex, index }));

  function isNavigable(item: InoBreadcrumbItem, isCurrent: boolean) {
    return !isCurrent && !item.disabled && !readonly;
  }

  function handlePress(item: InoBreadcrumbItem, isCurrent: boolean) {
    if (!isNavigable(item, isCurrent)) return;
    onItemPress?.(item);
  }

  function renderCrumb(item: InoBreadcrumbItem, isCurrent: boolean, key: string) {
    const navigable = isNavigable(item, isCurrent);
    const textColor = isCurrent ? colors.onSurface : navigable ? colors.onSurfaceMuted : colors.onSurfaceSubtle;

    const content = (
      <View style={styles.crumb}>
        {!!item.icon && (
          <Text
            style={{ fontSize: ctrl.iconSize, color: textColor }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {item.icon}
          </Text>
        )}
        <Text
          style={[
            styles.label,
            { fontSize: ctrl.fontSize, color: textColor, fontWeight: isCurrent ? '600' : '400' },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>
    );

    if (!navigable) {
      return (
        <View key={key} accessibilityState={item.disabled ? { disabled: true } : undefined}>
          {content}
        </View>
      );
    }

    return (
      <Pressable
        key={key}
        onPress={() => handlePress(item, isCurrent)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  function renderSeparator(key: string) {
    return (
      <Text
        key={key}
        style={[styles.separator, { color: colors.onSurfaceMuted }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        /
      </Text>
    );
  }

  if (!items.length) {
    return null;
  }

  const nodes: React.ReactNode[] = [];
  visible.forEach(({ item, isCurrent, index }, position) => {
    if (position > 0) {
      nodes.push(renderSeparator(`sep-${index}`));
      if (isCollapsed && position === 1) {
        nodes.push(
          <Pressable
            key="ellipsis"
            onPress={() => setExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel="Show hidden breadcrumb items"
          >
            <Text style={[styles.label, { fontSize: ctrl.fontSize, color: colors.onSurfaceMuted }]}>…</Text>
          </Pressable>,
        );
        nodes.push(renderSeparator(`sep-ellipsis-${index}`));
      }
    }
    nodes.push(renderCrumb(item, isCurrent, `item-${index}`));
  });

  return <View style={styles.row}>{nodes}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  label: {
    maxWidth: 220,
  },
  separator: {
    marginHorizontal: space[1],
  },
  pressed: {
    opacity: 0.7,
  },
});
