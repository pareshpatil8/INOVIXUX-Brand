import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLinkTo } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { motion, radius, space, targetComfortable, type } from '../theme/tokens';
import { pathFromLink } from '../navigation/linking';
import { categoryGlyph, categoryTint, titleWithCategoryWord } from './categories';
import { useNotifications, type InoNotification } from './NotificationCenter';

/**
 * In-app push banner — docs/brand/13-mobile-app-patterns.md §6.3.1, INO-112.
 *
 * Reuses the shipped toast pattern rather than inventing a second transient surface; the web
 * `ino-toast-container` is the reference implementation and this is the same contract in React
 * Native's idiom. The one deliberate divergence from toasts: **banners anchor top**
 * (`--ino-safe-area-top` + `--ino-space-4`), so an incoming notification never covers the bottom
 * sheet or the tab bar the user is mid-interaction with.
 *
 * Mount once, inside `<NavigationContainer>` — `useLinkTo` needs the navigation context, and
 * tapping a banner has to resolve its link through the same §6.5 grammar a cold deep link does.
 */
export function PushBannerHost() {
  const { banner, sheet } = useNotifications();

  return (
    <>
      {banner ? <PushBanner notification={banner} /> : null}
      {sheet ? <BlockingSheet notification={sheet} /> : null}
    </>
  );
}

function PushBanner({ notification }: { notification: InoNotification }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const linkTo = useLinkTo();
  const { dismissBanner, pauseDwell, resumeDwell } = useNotifications();

  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // §4: respect the platform's reduced-motion setting the same way the web components do —
    // disable transform/slide animations, keep opacity/state changes.
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) reduceMotion.current = enabled;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.durationBase,
      // --ino-motion-easing-decelerate on the way in (§6.3.1, same split §4 mandates for sheets).
      easing: Easing.bezier(...motion.easingDecelerate),
      useNativeDriver: true,
    }).start();
    // Re-runs per notification id: a second arrival REPLACES the first (§6.3.1 stacking), so the
    // enter animation plays again for the replacement rather than the card silently swapping.
  }, [notification.id, progress]);

  const Glyph = categoryGlyph[notification.category];

  const open = () => {
    dismissBanner(notification.id);
    if (notification.link) linkTo(pathFromLink(notification.link));
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          // §6.3.1 anchoring: top edge, offset by --ino-safe-area-top + --ino-space-4.
          top: insets.top + space[4],
          opacity: progress,
          transform: reduceMotion.current
            ? []
            : [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-space[6], 0],
                  }),
                },
              ],
        },
      ]}
    >
      <Pressable
        onPress={open}
        // §6.3.1: announced `polite` — `assertive` would interrupt whatever the user is reading,
        // and a push is by definition not a response to their current action. RN's `polite`
        // liveRegion is the direct equivalent of the toast container's aria-live.
        accessibilityLiveRegion="polite"
        accessibilityRole="button"
        // "dwell pauses while the banner is focused by an assistive technology" (§6.3.1).
        onAccessibilityTap={open}
        onFocus={pauseDwell}
        onBlur={resumeDwell}
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            // --ino-elevation-2 (tokens.css): surfaces above the overlay scrim. Expressed here
            // rather than added to theme/tokens.ts — that file is a colour/space/radius/motion
            // port guarded byte-for-byte by scripts/check-theme-parity.mjs, and elevation has no
            // entry there on any mobile track yet. Porting the elevation scale is its own change.
            shadowColor: '#000',
            shadowOpacity: 0.72,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 24 },
            elevation: 12,
          },
        ]}
      >
        {/* 20px Lucide category glyph — tinted; the surface is not (§6.4). */}
        <Glyph size={20} color={categoryTint(notification.category, colors)} strokeWidth={2} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
            {titleWithCategoryWord(notification.category, notification.title)}
          </Text>
          {notification.body ? (
            <Text style={[styles.body, { color: colors.onSurfaceMuted }]} numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
        </View>
        {/* Optional SINGLE inline action. Never two competing actions in a banner; a second
            action means it should have been a sheet (§6.3.1). */}
        {notification.actionLabel ? (
          <TouchableOpacity onPress={open} style={styles.action} accessibilityRole="button">
            <Text style={[styles.actionLabel, { color: colors.accentTextSafe }]}>
              {notification.actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * §6.3 last row: a message that blocks the user gets a bottom sheet (`variant="overlay"`,
 * §2 row 4) in **any** app state. "A blocking message must not auto-dismiss. Banners auto-dismiss,
 * so a banner is the wrong vessel regardless of app state."
 */
function BlockingSheet({ notification }: { notification: InoNotification }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const linkTo = useLinkTo();
  const { dismissSheet } = useNotifications();

  const Glyph = categoryGlyph[notification.category];

  return (
    <Modal transparent animationType="slide" visible onRequestClose={dismissSheet}>
      {/* The scrim belongs to the sheet case, not the banner case (§6.3.1). */}
      <View style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceRaised,
              paddingBottom: insets.bottom + space[5],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Glyph size={20} color={categoryTint(notification.category, colors)} strokeWidth={2} />
            <Text style={[styles.title, { color: colors.onSurface, flex: 1 }]}>
              {titleWithCategoryWord(notification.category, notification.title)}
            </Text>
          </View>
          {notification.body ? (
            <Text style={[styles.body, { color: colors.onSurfaceMuted }]}>{notification.body}</Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              dismissSheet();
              if (notification.link) linkTo(pathFromLink(notification.link));
            }}
            style={[styles.sheetCta, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.actionLabel, { color: colors.onAccent }]}>
              {notification.actionLabel ?? 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: space[4], right: space[4], zIndex: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    // Tap target spans the full banner and is ≥ --ino-target-comfortable (§6.3.1).
    minHeight: targetComfortable,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  title: { ...type.h3 },
  body: { ...type.bodySm },
  action: { minHeight: targetComfortable, justifyContent: 'center', paddingHorizontal: space[2] },
  actionLabel: { ...type.body, fontWeight: '600' },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: space[5],
    paddingTop: space[5],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space[3],
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sheetCta: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[2],
  },
});
