import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, radius, space } from '../theme/tokens';

export type InoCardVariant = 'default' | 'sunken' | 'overlay';
export type InoCardPadding = 'sm' | 'md' | 'lg';
export type InoCardSize = ControlSize;

const BODY_PADDING: Record<InoCardPadding, number> = { sm: space[4], md: space[6], lg: space[8] };

export interface InoCardProps {
  variant?: InoCardVariant;
  /** Body content padding — independent of `size` below. Mirrors web's `padding` @Input;
   *  see web/src/app/components/card/SPEC.md §3 for why the two stay separate. */
  padding?: InoCardPadding;
  /** Sizes the header/footer bars only (control-size scale). */
  size?: InoCardSize;
  /** Full-bleed slot above the header, clipped to the card's own corner radius. */
  media?: ReactNode;
  /** Title/eyebrow bar. */
  header?: ReactNode;
  /** Actions bar. */
  footer?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * `<InoCard>` — RN port of `<ino-card>` (web/src/app/components/card, INO-161 / INO-31 U-6).
 *
 * Deviation from the web component's "caller owns the interactive element" contract: RN has no
 * equivalent of wrapping a styled shell in a caller-supplied `<a>`/`<button>`, so when `onPress`
 * is supplied this component itself becomes the `Pressable` and owns `accessibilityRole="button"`
 * — unlike web, where `interactive` only ever supplies the visual state.
 *
 * No shadow/elevation is rendered — `theme/tokens.ts` ports no elevation tokens (see that file's
 * own note on the gap), so `variant="overlay"` only differentiates by not being `sunken`; it does
 * not gain a heavier shadow the way the web `--ino-elevation-2` does.
 */
export function InoCard({
  variant = 'default',
  padding = 'md',
  size = 'default',
  media,
  header,
  footer,
  children,
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
  style,
}: InoCardProps) {
  const { colors } = useTheme();
  const dims = control[size];
  const interactive = !!onPress;
  const isInteractive = interactive && !disabled && !loading;

  const background =
    variant === 'sunken' ? colors.surfaceSunken : colors.surfaceRaised;

  const content = (
    <>
      {media ? <View style={styles.media}>{media}</View> : null}
      {header ? (
        <View
          style={[
            styles.bar,
            {
              paddingHorizontal: dims.paddingInlineRoomy,
              paddingVertical: dims.paddingInlineRoomy,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSoft,
            },
          ]}
        >
          {header}
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={{ padding: BODY_PADDING[padding], opacity: loading ? 0.5 : 1 }}>
          {children}
        </View>
        {loading ? (
          <View style={styles.spinnerWrap} pointerEvents="none">
            <View
              style={[
                styles.spinner,
                { width: dims.iconSize, height: dims.iconSize, borderColor: colors.onSurfaceMuted },
              ]}
            />
          </View>
        ) : null}
      </View>
      {footer ? (
        <View
          style={[
            styles.bar,
            {
              paddingHorizontal: dims.paddingInlineRoomy,
              paddingVertical: dims.paddingInlineRoomy,
              borderTopWidth: 1,
              borderTopColor: colors.borderSoft,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  const shellStyle = [
    styles.card,
    {
      backgroundColor: background,
      borderColor: colors.border,
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  if (interactive) {
    return (
      <Pressable
        onPress={isInteractive ? onPress : undefined}
        disabled={!isInteractive}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
        style={({ pressed }) => [
          ...shellStyle,
          pressed && isInteractive ? { borderColor: colors.accentActive } : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading }}
      style={shellStyle}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  media: { width: '100%' },
  bar: {},
  body: { position: 'relative' },
  spinnerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Static ring, not an animated spinner — same scope call InoRadio/InoTag's RN ports already made.
  spinner: { borderRadius: 999, borderWidth: 2, borderTopColor: 'transparent' },
});
