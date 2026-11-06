import React, { useMemo, useState, useEffect } from 'react';
import { Pressable, Text, View, AccessibilityRole } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { control, ControlSize, space } from '../theme/tokens';

export type InoCarouselOrientation = 'horizontal' | 'vertical';

/**
 * `InoCarousel` — React Native port of `web/src/app/components/carousel/ino-carousel.component.ts`
 * (INO-483 / INO-31 B5). Re-authored, not shared: RN has no CSS custom properties, so every value
 * below reads the same `control`/`space`/theme-role names the web component reads, never a literal.
 *
 * Scope differences from web, all deliberate:
 * - **Chrome only.** This renders prev/next/indicators/pause buttons and reports navigation; the
 *   parent renders the actual slides. Web uses content projection (`<ino-carousel-item>`), which has
 *   no RN equivalent worth inventing — an RN caller already renders slides.
 * - **Controlled only, index-based.** Matches web's `[activeIndex]` binding exactly — an RN caller
 *   always holds state, so an internal fallback would be a second source of truth.
 * - **Host-owned autoplay timer.** Component does not run a timer — the host app drives autoplay by
 *   calling `onNext()` at its own interval (SPEC.md §6). The component only shows/hides the
 *   pause button and tracks `playing` state for the pause-control glyph.
 * - **No keyboard map / focus ring.** No arrow keys on a touch surface; external-keyboard focus is
 *   an OS-level highlight. Same states `InoButton` drops.
 */
export function InoCarousel({
  itemCount,
  activeIndex,
  onActiveIndexChange,
  visibleCount = 1,
  step = 1,
  circular = false,
  orientation = 'horizontal',
  size = 'default',
  showNavigation = true,
  showIndicators = true,
  autoplay = false,
  playing = false,
  onPlayingChange,
}: {
  /** Total number of slides. */
  itemCount: number;
  /** Controlled: the parent owns which slide(s) are visible. */
  activeIndex: number;
  /** Fired when prev/next/indicator is pressed or the parent's autoplay timer calls onNext. */
  onActiveIndexChange: (index: number) => void;
  /** How many items are visible at once. */
  visibleCount?: number;
  /** How many items prev/next move by. */
  step?: number;
  /** When true, next past the end wraps to 0; prev before 0 wraps to maxStart. */
  circular?: boolean;
  /** Content direction. */
  orientation?: InoCarouselOrientation;
  /** Gap scale — drives item spacing. */
  size?: ControlSize;
  /** Show prev/next buttons. */
  showNavigation?: boolean;
  /** Show indicators. */
  showIndicators?: boolean;
  /** When true, a pause button is shown (optional; host drives the actual timer). */
  autoplay?: boolean;
  /** Current play state — toggles the pause button's glyph between ▶/⏸. */
  playing?: boolean;
  /** Fired when the user toggles the pause button. */
  onPlayingChange?: (playing: boolean) => void;
}) {
  const { colors } = useTheme();
  const c = control[size];
  const isVertical = orientation === 'vertical';

  const maxStart = Math.max(0, itemCount - visibleCount);
  const clampedIndex = itemCount ? Math.min(Math.max(0, activeIndex), maxStart) : 0;
  const isAtStart = clampedIndex <= 0;
  const isAtEnd = clampedIndex >= maxStart;

  // Compute reachable stops: every step-sized stop from 0 to maxStart, always including maxStart.
  const stops = useMemo(() => {
    if (!itemCount) return [];
    const s: number[] = [];
    for (let i = 0; i <= maxStart; i += step) {
      s.push(i);
    }
    if (s[s.length - 1] !== maxStart) {
      s.push(maxStart);
    }
    return s;
  }, [itemCount, maxStart, step]);

  const currentStopIndex = stops.indexOf(clampedIndex);
  const rangeLabel = useMemo(() => {
    if (!itemCount) return '';
    const first = clampedIndex + 1;
    const last = Math.min(clampedIndex + visibleCount, itemCount);
    return first === last ? `Slide ${first} of ${itemCount}` : `Slides ${first}-${last} of ${itemCount}`;
  }, [clampedIndex, visibleCount, itemCount]);

  const goTo = (index: number) => {
    const clamped = Math.min(Math.max(0, index), maxStart);
    if (clamped !== clampedIndex) {
      onActiveIndexChange(clamped);
    }
  };

  const onNext = () => {
    const next = clampedIndex + step;
    if (next > maxStart) {
      if (circular) {
        goTo(0);
      } else {
        goTo(maxStart);
      }
      return;
    }
    goTo(next);
  };

  const onPrev = () => {
    const prev = clampedIndex - step;
    if (prev < 0) {
      goTo(circular ? maxStart : 0);
      return;
    }
    goTo(prev);
  };

  const togglePlaying = () => {
    onPlayingChange?.(!playing);
  };

  return (
    <View
      style={{
        gap: space[2],
      }}
      accessible={false}
    >
      {/* Viewport container with nav and pause buttons */}
      {/* No accessibilityRole: RN's AccessibilityRole has no `region` — that is web-only
          ARIA (SPEC.md §99). Passing it was a runtime no-op, so dropping it is behaviour
          preserving and lets tsc pass. */}
      <View
        style={{
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: 'center',
          gap: space[2],
        }}
        accessibilityLabel="Carousel"
      >
        {showNavigation && (
          <Pressable
            onPress={onPrev}
            disabled={!circular && isAtStart}
            accessibilityRole="button"
            accessibilityLabel={orientation === 'horizontal' ? 'Previous slide' : 'Previous slide (up)'}
            accessibilityState={{ disabled: !circular && isAtStart }}
            style={{
              width: c.height,
              height: c.height,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              opacity: !circular && isAtStart ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.onSurface, fontSize: 18 }}>‹</Text>
          </Pressable>
        )}

        <View style={{ flex: 1 }} />

        {showNavigation && (
          <Pressable
            onPress={onNext}
            disabled={!circular && isAtEnd}
            accessibilityRole="button"
            accessibilityLabel={orientation === 'horizontal' ? 'Next slide' : 'Next slide (down)'}
            accessibilityState={{ disabled: !circular && isAtEnd }}
            style={{
              width: c.height,
              height: c.height,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              opacity: !circular && isAtEnd ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.onSurface, fontSize: 18 }}>›</Text>
          </Pressable>
        )}

        {autoplay && (
          <Pressable
            onPress={togglePlaying}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause autoplay' : 'Play autoplay'}
            accessibilityState={{ selected: playing }}
            style={{
              width: c.height,
              height: c.height,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: playing ? colors.accent : colors.onSurface, fontSize: 16 }}>
              {playing ? '⏸' : '▶'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Indicators strip */}
      {showIndicators && stops.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: space[2],
            marginTop: space[3],
          }}
          accessible={true}
          accessibilityLabel="Choose slide"
        >
          {stops.map((stop, i) => {
            const isActive = i === currentStopIndex;
            return (
              <Pressable
                key={i}
                onPress={() => goTo(stop)}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${stop + 1} of ${itemCount}`}
                accessibilityState={{ selected: isActive }}
                style={{
                  width: space[2],
                  height: space[2],
                  borderRadius: 4,
                  backgroundColor: isActive ? colors.accent : colors.border,
                }}
              />
            );
          })}
        </View>
      )}

      {/* Screen-reader range announcement */}
      <Text
        style={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
        accessibilityLiveRegion="polite"
        importantForAccessibility="no"
      >
        {rangeLabel}
      </Text>
    </View>
  );
}
