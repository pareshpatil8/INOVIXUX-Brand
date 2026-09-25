import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, radius, space, type, ControlSize } from '../theme/tokens';

const PANEL_MAX_WIDTH: Record<ControlSize, number> = { sm: 360, default: 480, lg: 720 };

/**
 * `<InoModal>` — RN port of `<ino-modal>` (web/src/app/components/modal, INO-162 / INO-31 U-7).
 * Real port of the base dialog: `size` and backdrop/hardware-back dismissal. Does **not** carry
 * `maximizable` or `draggable` — both are desktop-idiom affordances with no mobile counterpart;
 * full reasoning in web/src/app/components/modal/SPEC.md §4. Distinct from `ConfirmActionSheet`
 * (a bottom sheet, a different pattern for the confirm/delete template) — this is the general
 * centered-dialog primitive that sheet is not.
 *
 * Focus/keyboard-trap containment: RN's `Modal` already renders in its own native layer on both
 * platforms, and `accessibilityViewIsModal` (iOS) scopes VoiceOver to it — the same platform-native
 * equivalent `focus-trap/SPEC.md` §5 already decided web's `[inoFocusTrap]` would not try to
 * replace on this track. `onRequestClose` (Android hardware back / iOS edge swipe) is this
 * platform's direct equivalent of the web component's `Escape` handling.
 */
export function InoModal({
  visible,
  heading,
  size = 'default',
  closeOnBackdrop = true,
  onRequestClose,
  children,
  footer,
}: {
  visible: boolean;
  heading?: string;
  size?: ControlSize;
  closeOnBackdrop?: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const dims = control[size];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.root} accessibilityViewIsModal importantForAccessibility="yes">
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}
          onPress={closeOnBackdrop ? onRequestClose : undefined}
          accessibilityLabel={heading ? `Close ${heading}` : 'Close dialog'}
        />

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, maxWidth: PANEL_MAX_WIDTH[size] },
          ]}
        >
          <View style={styles.header}>
            {heading ? (
              <Text
                style={[type.h3, styles.heading, { color: colors.onSurface }]}
                accessibilityRole="header"
              >
                {heading}
              </Text>
            ) : null}
            <Pressable
              onPress={onRequestClose}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              hitSlop={8}
              style={[styles.close, { width: dims.height, height: dims.height }]}
            >
              <Text style={{ color: colors.onSurfaceMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  scrim: { ...StyleSheet.absoluteFillObject },
  panel: { width: '100%', maxHeight: '85%', padding: space[6] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[4] },
  heading: { flexShrink: 1 },
  close: { alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', borderRadius: radius.md },
  body: { marginTop: space[4] },
  bodyContent: { flexGrow: 1 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[3], marginTop: space[5] },
});
