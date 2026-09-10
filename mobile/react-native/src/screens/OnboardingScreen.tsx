import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ShieldCheck, LayoutGrid, Moon } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, targetComfortable, type } from '../theme/tokens';

/**
 * Auth / onboarding template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 2
 * ("1–3 steps"). Same template family as `SignInScreen`/`ForgotPasswordScreen`: single-column
 * shell, `--ino-type-display-size-sm` headline, `--ino-target-comfortable` (44px) controls.
 * Pre-tab-bar, own stack — not part of `RootNavigator`'s bottom tabs (reached today from
 * Settings → Preview, since this scaffold doesn't model a signed-out gate).
 */
const STEPS = [
  {
    icon: ShieldCheck,
    headline: 'Verified by design',
    body: 'Every action carries the same verified-node mark you see across INOVIXUX.',
  },
  {
    icon: LayoutGrid,
    headline: 'One system, everywhere',
    body: 'The same tokens and components you know from web, native on mobile.',
  },
  {
    icon: Moon,
    headline: 'Dark by default',
    body: 'Follows your system appearance, with a manual override anytime in Settings.',
  },
];

export function OnboardingScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const isLast = page === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      navigation.goBack();
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <ScreenTemplate
      scroll={false}
      actions={
        !isLast ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}>
            <Text style={[type.body, { color: colors.onSurfaceMuted }]}>Skip</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
      >
        {STEPS.map((step, i) => (
          <View key={i} style={[styles.step, { width }]}>
            <step.icon size={32} color={colors.accent} strokeWidth={2} />
            <Text style={[styles.headline, { color: colors.onSurface }]}>{step.headline}</Text>
            <Text style={[styles.body, { color: colors.onSurfaceMuted }]}>{step.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? colors.accent : colors.borderSoft, width: i === page ? 20 : 8 },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity accessibilityRole="button" onPress={next} style={[styles.cta, { backgroundColor: colors.accent }]}>
        <Text style={[styles.ctaLabel, { color: colors.onAccent }]}>{isLast ? 'Get started' : 'Next'}</Text>
      </TouchableOpacity>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1, marginHorizontal: -space[5] },
  step: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], paddingHorizontal: space[6] },
  headline: { ...type.displaySm, textAlign: 'center', marginTop: space[3] },
  body: { ...type.body, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[1] },
  dot: { height: 8, borderRadius: radius.pill },
  cta: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[5],
    marginBottom: space[4],
  },
  ctaLabel: { ...type.body, fontWeight: '600' },
});
