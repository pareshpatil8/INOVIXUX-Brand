import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, targetComfortable, type } from '../theme/tokens';

/**
 * Modal / bottom-sheet template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row
 * 11 (confirm/delete, quick-create). `variant="overlay"`, `--ino-color-overlay-scrim` backdrop.
 * Controlled component (`visible` + callbacks) rather than an imperative `Modal.confirm()`-style
 * API — RN has no `Future`-returning sheet primitive the way Flutter's `showModalBottomSheet`
 * does. Not a nav destination — dismissed back to whatever screen presented it, never pushed.
 */
export function ConfirmActionSheet({
  visible,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.overlayScrim }]}
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
      />
      <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderSoft }]} />
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        {body ? <Text style={[styles.body, { color: colors.onSurfaceMuted }]}>{body}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          style={[styles.confirm, { backgroundColor: destructive ? colors.danger : colors.accent }]}
        >
          <Text style={[styles.confirmLabel, { color: destructive ? colors.onDanger : colors.onAccent }]}>
            {confirmLabel}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={[type.body, { color: colors.onSurface }]}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[7],
  },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space[4] },
  title: { ...type.h3 },
  body: { ...type.body, marginTop: space[2] },
  confirm: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[5],
  },
  confirmLabel: { ...type.body, fontWeight: '600' },
  cancel: { minHeight: targetComfortable, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
});
