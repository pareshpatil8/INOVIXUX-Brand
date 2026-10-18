import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { borderWidth, space } from '../theme/tokens';

export type InoDividerOrientation = 'horizontal' | 'vertical';
export type InoDividerThickness = 'hairline' | 'thick';

export interface InoDividerProps {
  orientation?: InoDividerOrientation;
  thickness?: InoDividerThickness;
  label?: string;
}

/**
 * `<InoDivider>` — RN port of `<ino-divider>`
 * (web/src/app/components/divider, INO-441 / INO-31 B2). A line that groups or separates
 * content; no interactive state (doc 26 §5 row: `St: n/a`).
 *
 * `label` only renders in the `horizontal` orientation — same contract the web component's
 * SPEC.md §1 documents; passing one with `orientation="vertical"` is silently ignored.
 *
 * `thickness` reads `borderWidth.{hairline,thick}` (tokens.css §6b), not a density-repointed
 * value — a divider's line weight is a deliberate visual choice (web SPEC.md §3).
 *
 * The bare line is `accessible={false}` (RN has no `separator` role; a purely decorative rule is
 * correctly hidden from the accessibility tree, mirroring `aria-hidden` on decorative icons
 * elsewhere in the catalog). The label `Text`, when present, stays in the tree as real content.
 */
export function InoDivider({
  orientation = 'horizontal',
  thickness = 'hairline',
  label,
}: InoDividerProps) {
  const { colors } = useTheme();
  const isVertical = orientation === 'vertical';
  const showLabel = !isVertical && !!label;
  const lineThickness = thickness === 'thick' ? borderWidth.thick : borderWidth.hairline;

  const line = (
    <View
      accessible={false}
      style={
        isVertical
          ? [styles.verticalLine, { width: lineThickness, backgroundColor: colors.border }]
          : [styles.horizontalLine, { height: lineThickness, backgroundColor: colors.border }]
      }
    />
  );

  if (showLabel) {
    return (
      <View style={styles.labelledRow}>
        <View style={styles.flexLine}>{line}</View>
        <Text style={[styles.label, { color: colors.onSurfaceMuted }]}>{label}</Text>
        <View style={styles.flexLine}>{line}</View>
      </View>
    );
  }

  return isVertical ? <View style={styles.verticalContainer}>{line}</View> : line;
}

const styles = StyleSheet.create({
  horizontalLine: {
    width: '100%',
  },
  verticalLine: {
    height: '100%',
  },
  verticalContainer: {
    height: '100%',
  },
  labelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  flexLine: {
    flex: 1,
  },
  label: {
    marginHorizontal: space[3],
    fontSize: 12.5,
  },
});
