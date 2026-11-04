import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { User } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

export type InoAvatarShape = 'circle' | 'square';
export type InoAvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';

/** Diameter per tier — web/src/app/components/avatar/SPEC.md §2 five-step scale, not the shared
 *  control-size scale (an avatar's size is a content decision, not a control-height one). */
export const AVATAR_SIZE_PX: Record<InoAvatarSize, number> = {
  xs: 24,
  sm: 32,
  default: 40,
  lg: 48,
  xl: 64,
};

// Matches tokens.css's --ino-type-caption/label-sm/body/h3/body-lg-size, same tier mapping web's
// SCSS uses — see SPEC.md §2.
const FONT_SIZE: Record<InoAvatarSize, number> = {
  xs: 12,
  sm: 12,
  default: 15,
  lg: 16,
  xl: 17,
};

/** Shared by `InoAvatar` and `InoAvatarGroup`'s ring wrapper, so the group's border radius always
 *  matches the shape/size it is wrapping — see `InoAvatarGroup.tsx`. */
export function avatarRadius(shape: InoAvatarShape, size: InoAvatarSize): number {
  return shape === 'circle' ? AVATAR_SIZE_PX[size] / 2 : radius.md;
}

/**
 * `<InoAvatar>` — RN port of `<ino-avatar>` (web/src/app/components/avatar, INO-458 / INO-31
 * Phase B4). Same content-form priority (image until it errors > initials > projected icon >
 * built-in fallback glyph) and decorative/informative accessibility contract as the web
 * component — full reasoning: web/src/app/components/avatar/SPEC.md. Presentational only, same
 * precedent as `InoTag` — no `onPress`.
 */
export function InoAvatar({
  image,
  initials,
  alt,
  ariaLabel,
  shape = 'circle',
  size = 'default',
  decorative = false,
  icon,
}: {
  image?: string;
  initials?: string;
  alt?: string;
  ariaLabel?: string;
  shape?: InoAvatarShape;
  size?: InoAvatarSize;
  decorative?: boolean;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  // Mirrors the web component's `ngOnChanges` reset — swapping to a new `image` URL always gets
  // a fresh load attempt instead of staying stuck on a previous failure.
  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const dimension = AVATAR_SIZE_PX[size];
  const showImage = !!image && !imageFailed;
  const showInitials = !showImage && !!initials;
  const label = ariaLabel || alt || 'Avatar';

  return (
    <View
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityLabel={!decorative && !showImage ? label : undefined}
      style={[
        styles.host,
        {
          width: dimension,
          height: dimension,
          borderRadius: avatarRadius(shape, size),
          backgroundColor: colors.surfaceSunken,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: image }}
          accessible={!decorative}
          accessibilityLabel={decorative ? undefined : alt}
          onError={() => setImageFailed(true)}
          style={{ width: dimension, height: dimension, borderRadius: avatarRadius(shape, size) }}
        />
      ) : showInitials ? (
        <Text style={{ color: colors.onSurface, fontSize: FONT_SIZE[size], fontWeight: '500' }}>
          {initials!.toUpperCase()}
        </Text>
      ) : icon ? (
        icon
      ) : (
        <User size={dimension * 0.55} color={colors.onSurfaceMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
