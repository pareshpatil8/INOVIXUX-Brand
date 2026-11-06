import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { avatarRadius, InoAvatar, InoAvatarShape, InoAvatarSize } from './InoAvatar';

/** One avatar's content, as plain data — same data-driven shape as web's `InoAvatarGroupItem`;
 *  see web/src/app/components/avatar/SPEC.md §5 for why the group renders from an array rather
 *  than accepting projected/child avatars. */
export interface InoAvatarGroupItem {
  image?: string;
  initials?: string;
  alt?: string;
}

// Overlap per tier, same mapping as web's ino-avatar-group.component.scss.
const OVERLAP: Record<InoAvatarSize, number> = {
  xs: space[2],
  sm: space[2],
  default: space[3],
  lg: space[3],
  xl: space[4],
};

/**
 * `<InoAvatarGroup>` — RN port of `<ino-avatar-group>` (web/src/app/components/avatar-group,
 * INO-458 / INO-31 Phase B4). Overlapping avatars with an optional "+N" surplus avatar when
 * `avatars.length` exceeds `max` — full reasoning: `../../avatar/SPEC.md` §5.
 */
export function InoAvatarGroup({
  avatars,
  max = null,
  shape = 'circle',
  size = 'default',
  ariaLabel,
}: {
  avatars: InoAvatarGroupItem[];
  max?: number | null;
  shape?: InoAvatarShape;
  size?: InoAvatarSize;
  ariaLabel?: string;
}) {
  const { colors } = useTheme();
  const visible = max != null ? avatars.slice(0, max) : avatars;
  const surplus = max != null ? Math.max(0, avatars.length - max) : 0;
  const count = avatars.length;
  const label = ariaLabel || (count === 1 ? '1 avatar' : `${count} avatars`);
  const overlap = OVERLAP[size];
  const radius = avatarRadius(shape, size);

  return (
    <View accessible accessibilityLabel={label} style={styles.host}>
      {visible.map((item, index) => (
        <View
          key={index}
          style={[
            styles.item,
            {
              borderRadius: radius,
              borderColor: colors.surfaceRaised,
              marginLeft: index === 0 ? 0 : -overlap,
            },
          ]}
        >
          {/* Each item is individually decorative unless the caller supplied its own `alt` — a
           *  group of named people still announces each name on request, while an unnamed
           *  cluster relies on the group's own one-line count instead of N redundant
           *  announcements. See SPEC.md §4. */}
          <InoAvatar
            image={item.image}
            initials={item.initials}
            alt={item.alt}
            decorative={!item.alt}
            shape={shape}
            size={size}
          />
        </View>
      ))}
      {surplus > 0 && (
        <View
          style={[
            styles.item,
            { borderRadius: radius, borderColor: colors.surfaceRaised, marginLeft: -overlap },
          ]}
        >
          <InoAvatar
            initials={`+${surplus}`}
            ariaLabel={`${surplus} more`}
            shape={shape}
            size={size}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flexDirection: 'row', alignItems: 'center' },
  // Ring in the ambient surface color so overlapping circles read as distinct items — same
  // reasoning as web's `.ino-avatar-group__item { border: 2px solid ... }`.
  item: { borderWidth: 2 },
});
