import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { motion, radius, space, targetComfortable, type } from '../theme/tokens';

export type InoDrawerPosition = 'start' | 'end' | 'top' | 'bottom';
export type InoDrawerSize = 'sm' | 'default' | 'lg';

const PANEL_EXTENT: Record<InoDrawerPosition, Record<InoDrawerSize, number>> = {
  start: { sm: 320, default: 400, lg: 480 },
  end: { sm: 320, default: 400, lg: 480 },
  top: { sm: 240, default: 360, lg: 480 },
  bottom: { sm: 240, default: 360, lg: 480 },
};

const AXIS: Record<InoDrawerPosition, 'x' | 'y'> = { start: 'x', end: 'x', top: 'y', bottom: 'y' };
// Sign of the off-screen resting translation for each edge (start/top begin negative, end/bottom positive).
const OFFSCREEN_SIGN: Record<InoDrawerPosition, 1 | -1> = { start: -1, end: 1, top: -1, bottom: 1 };
const SWIPE_DISMISS_RATIO = 0.35;

/**
 * `<ino-drawer>` port (INO-260, follow-up to INO-151). Edge-anchored sliding panel — extends
 * ConfirmActionSheet's scrim/dismiss pattern (single-position, bottom-only) to all four
 * `position`s the web component supports, with a real swipe-to-dismiss gesture rather than a
 * thin `Modal` wrapper (web/src/app/components/drawer/SPEC.md §9 point 2).
 *
 * `modal={false}` renders without RN's `<Modal>` wrapper (so the rest of the screen stays
 * interactive, matching web's no-scrim/no-focus-trap non-modal mode) instead of a backdrop-less
 * `<Modal>`, which would still block touches outside itself.
 */
export function InoDrawer({
  visible,
  position = 'end',
  size = 'default',
  heading,
  modal = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  loading = false,
  onClose,
  header,
  footer,
  children,
}: {
  visible: boolean;
  position?: InoDrawerPosition;
  size?: InoDrawerSize;
  heading?: string;
  modal?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  loading?: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const axis = AXIS[position];
  const extent = PANEL_EXTENT[position][size];
  const offscreen = OFFSCREEN_SIGN[position] * extent;

  const translate = useRef(new Animated.Value(offscreen)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translate.setValue(offscreen);
      Animated.parallel([
        Animated.timing(translate, { toValue: 0, duration: motion.durationBase, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: motion.durationBase, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Hardware back button (Android) is this platform's `Escape` — same dismissal contract as web's
  // `closeOnEscape`, gated the same way.
  useEffect(() => {
    if (!visible || !modal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (closeOnEscape) {
        requestClose();
        return true;
      }
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, modal, closeOnEscape]);

  useEffect(() => {
    if (visible && heading) AccessibilityInfo.announceForAccessibility(heading);
  }, [visible, heading]);

  function requestClose() {
    Animated.parallel([
      Animated.timing(translate, { toValue: offscreen, duration: motion.durationBase, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: motion.durationBase, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        axis === 'x' ? Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) : Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        const delta = axis === 'x' ? gesture.dx : gesture.dy;
        // Only allow dragging toward this panel's own off-screen direction — pulling the other
        // way should feel like it hits a wall, not overshoot past the resting position.
        const towardOffscreen = OFFSCREEN_SIGN[position] > 0 ? Math.max(0, delta) : Math.min(0, delta);
        translate.setValue(towardOffscreen);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const delta = axis === 'x' ? gesture.dx : gesture.dy;
        const dragged = Math.abs(delta);
        if (dragged > extent * SWIPE_DISMISS_RATIO) {
          requestClose();
        } else {
          Animated.timing(translate, { toValue: 0, duration: motion.durationFast, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  const screen = Dimensions.get('window');
  const panelStyle = [
    styles.panel,
    { backgroundColor: colors.surfaceRaised },
    axis === 'x'
      ? { top: 0, bottom: 0, width: Math.min(extent, screen.width), [position === 'start' ? 'left' : 'right']: 0 }
      : { left: 0, right: 0, height: Math.min(extent, screen.height), [position === 'top' ? 'top' : 'bottom']: 0 },
    { transform: [axis === 'x' ? { translateX: translate } : { translateY: translate }] },
    position === 'start' && { borderTopRightRadius: radius.xl, borderBottomRightRadius: radius.xl },
    position === 'end' && { borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl },
    position === 'top' && { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
    position === 'bottom' && { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
    loading && styles.loading,
  ];

  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents={modal ? 'box-none' : 'box-none'}>
      {modal && (
        <Animated.View pointerEvents={closeOnBackdrop ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { opacity: scrimOpacity }]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlayScrim }]}
            onPress={closeOnBackdrop ? requestClose : undefined}
            accessibilityLabel="Close drawer"
          />
        </Animated.View>
      )}

      <Animated.View
        style={panelStyle}
        accessibilityRole="none"
        accessibilityViewIsModal={modal}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: loading }}
        {...panResponder.panHandlers}
      >
        {(heading || header) && (
          <View style={[styles.header, { borderBottomColor: colors.borderSoft }]}>
            {heading ? <Text style={[type.h3, { color: colors.onSurface, flexShrink: 1 }]}>{heading}</Text> : null}
            {header}
            <Pressable
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Close drawer"
              style={styles.close}
              hitSlop={space[2]}
            >
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.body}>{children}</View>

        {footer ? <View style={[styles.footer, { borderTopColor: colors.borderSoft }]}>{footer}</View> : null}
      </Animated.View>
    </View>
  );

  if (!modal) {
    // Non-modal: no RN <Modal> wrapper, so the rest of the screen stays interactive underneath,
    // matching web's non-modal mode (no scrim, no focus trap, no scroll lock).
    return content;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeOnEscape ? requestClose : () => {}}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // No shadow/elevation styling — theme/tokens.ts ports no elevation tokens yet, same reason
  // InoCard.tsx renders none rather than hardcoding a shadow color check-ds-adherence would flag.
  panel: {
    position: 'absolute',
    padding: space[6],
  },
  loading: { opacity: 0.75 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    marginHorizontal: -space[6],
    marginTop: -space[6],
    marginBottom: space[4],
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    borderBottomWidth: 1,
  },
  close: {
    width: targetComfortable,
    height: targetComfortable,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  body: { flex: 1 },
  footer: {
    marginHorizontal: -space[6],
    marginBottom: -space[6],
    marginTop: space[4],
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    borderTopWidth: 1,
  },
});
