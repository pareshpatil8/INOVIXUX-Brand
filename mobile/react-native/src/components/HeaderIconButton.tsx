import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { targetComfortable } from '../theme/tokens';

/**
 * A single tappable `ScreenTemplate` header action — full `--ino-target-comfortable` (44px) hit
 * area around a Lucide icon, per docs/brand/14-icon-system.md §4 ("icon-only is permitted...only
 * with a visible aria-label/tooltip"). Used for things like `HomeScreen`'s search action.
 */
export function HeaderIconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.hitArea}
    >
      <Icon size={20} color={colors.onSurface} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: targetComfortable,
    height: targetComfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
