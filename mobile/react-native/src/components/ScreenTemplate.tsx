import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space, type } from '../theme/tokens';

/**
 * Shared screen shell — every screen in src/screens/ renders inside this, so the safe-area /
 * fluid-density / surface-color contract only has to be gotten right once.
 * Maps to docs/brand/13-mobile-app-patterns.md §2 "structural, token-mapped" screen templates —
 * `title` + `scroll` cover Auth/List/Detail/Settings; Modal/Empty-state screens skip the header.
 */
export function ScreenTemplate({
  title,
  children,
  scroll = true,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      {title ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        </View>
      ) : null}
      <Body
        style={[styles.body, style]}
        contentContainerStyle={scroll ? styles.scrollContent : undefined}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[3] },
  title: { fontSize: type.h2.fontSize, fontWeight: type.h2.fontWeight, letterSpacing: -0.02 * type.h2.fontSize },
  body: { flex: 1, paddingHorizontal: space[5] },
  scrollContent: { paddingBottom: space[9] },
});
