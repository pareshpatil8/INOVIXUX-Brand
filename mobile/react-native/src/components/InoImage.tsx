import React, { useEffect, useState } from 'react';
import { Image, ImageResizeMode, StyleSheet, Text, View } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { InoSkeleton } from './InoSkeleton';

export type InoImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/** Maps the web `object-fit` keyword set to RN's `resizeMode` — web/src/app/components/image/
 *  SPEC.md §3. RN has no `none`/`scale-down` equivalent: `none` (never resize, clip at natural
 *  size) is approximated with `center` (RN's closest "don't stretch" mode), and `scale-down`
 *  (shrink-to-fit, never enlarge) is approximated with `contain` — both are documented
 *  approximations, not exact parity, same caveat class as other RN ports' platform notes. */
const RESIZE_MODE: Record<InoImageFit, ImageResizeMode> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  none: 'center',
  'scale-down': 'contain',
};

/** RN has no intrinsic-sizing layout for a remote image (no natural-size measurement without an
 *  async `Image.getSize` call) — unlike web's default intrinsic mode, a dimension is always
 *  required here. This is the fallback box when neither `width` nor `height` is supplied.
 *  Platform caveat: web/src/app/components/image/SPEC.md §8. */
const DEFAULT_DIMENSION = 200;

/**
 * `<InoImage>` — RN port of `<ino-image>` (web/src/app/components/image, INO-487 / INO-31 Phase
 * B5). Base render only: loading placeholder, error-fallback, caption, intrinsic/fit sizing —
 * no lightbox. The preview-on-click lightbox is web-only (no focus-trap primitive exists on this
 * platform in this codebase); full reasoning: `SPEC.md` §8.
 */
export function InoImage({
  src,
  alt,
  fit = 'cover',
  width,
  height,
  caption,
  fallback,
}: {
  src?: string;
  alt: string;
  fit?: InoImageFit;
  width?: number;
  height?: number;
  caption?: string;
  fallback?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Mirrors the web component's `ngOnChanges` reset — swapping to a new `src` always gets a
  // fresh load attempt instead of staying stuck on a previous outcome.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const boxWidth = width ?? DEFAULT_DIMENSION;
  const boxHeight = height ?? DEFAULT_DIMENSION;
  const showImage = !!src && !failed;
  const showFallback = !src || failed;

  return (
    <View>
      <View
        style={[
          styles.frame,
          { width: boxWidth, height: boxHeight, backgroundColor: colors.surfaceSunken },
        ]}
      >
        {showImage && !loaded && (
          <View style={StyleSheet.absoluteFill}>
            <InoSkeleton shape="rectangle" width={boxWidth} height={boxHeight} borderRadius={radius.md} />
          </View>
        )}

        {showImage && (
          <Image
            source={{ uri: src }}
            accessible
            accessibilityLabel={alt}
            accessibilityRole="image"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            resizeMode={RESIZE_MODE[fit]}
            style={[styles.image, loaded ? null : styles.imageHidden]}
          />
        )}

        {showFallback && (
          <View
            style={styles.fallback}
            accessible
            accessibilityLabel={alt || 'Image unavailable'}
            accessibilityRole="image"
          >
            {fallback ?? <ImageOff color={colors.onSurfaceMuted} size={Math.min(boxWidth, boxHeight) * 0.3} />}
          </View>
        )}
      </View>

      {!!caption && <Text style={[styles.caption, { color: colors.onSurfaceMuted }]}>{caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  imageHidden: {
    opacity: 0,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    marginTop: 4,
    fontSize: 11.5,
  },
});
