import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

export type InoSliderTrackSize = 'sm' | 'md';
export type InoSliderThumb = 'lower' | 'upper';
export type InoSliderValue = number | [number, number];

export interface InoSliderProps {
  label?: string;
  hint?: string;
  error?: string;
  trackSize?: InoSliderTrackSize;
  min?: number;
  max?: number;
  step?: number;
  range?: boolean;
  vertical?: boolean;
  showMarks?: boolean;
  showTooltip?: boolean;
  showMinMaxLabels?: boolean;
  showValueLabel?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value: InoSliderValue;
  onValueChange?: (value: InoSliderValue) => void;
}

const TRACK_THICKNESS: Record<InoSliderTrackSize, number> = { sm: 4, md: 6 };
const THUMB_SIZE: Record<InoSliderTrackSize, number> = { sm: 20, md: 24 };
// RN has no `:focus-visible`/`setPointerCapture` thumb-drag primitive — `PanResponder`,
// measuring the track once per gesture via `measureInWindow`, is the RN-native equivalent of the
// web component's `pointerdown` + `setPointerCapture` capture, per SPEC.md §11.
const TOUCH_SLOP = 12;

/**
 * `<InoSlider>` — RN port of `<ino-slider>` (web/src/app/components/slider, INO-408 / INO-31 B1).
 * `range` switches `value` from `number` to `[number, number]`, same mode-flag convention as
 * `InoAutocomplete`'s `multiple`. Each thumb owns its own `PanResponder`; drag math mirrors the
 * web component's `valueFromPointerEvent` (fraction of track extent → clamped to `step`).
 *
 * RN has no native `role="slider"`; the ARIA-equivalent contract is `accessibilityRole="adjustable"`
 * with `accessibilityActions`/`onAccessibilityAction` for increment/decrement (VoiceOver/TalkBack
 * swipe up/down) and `accessibilityValue={{min,max,now}}` for the numeric announcement — the
 * substitution this component's SPEC.md §11 documents.
 */
export function InoSlider({
  label,
  hint,
  error,
  trackSize = 'md',
  min = 0,
  max = 100,
  step = 1,
  range = false,
  vertical = false,
  showMarks = false,
  showTooltip = false,
  showMinMaxLabels = false,
  showValueLabel = false,
  disabled = false,
  readonly = false,
  value,
  onValueChange,
}: InoSliderProps) {
  const { colors } = useTheme();
  const trackThickness = TRACK_THICKNESS[trackSize];
  const thumbSize = THUMB_SIZE[trackSize];
  const isInteractive = !disabled && !readonly;

  const trackLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const trackRef = useRef<View>(null);
  const [activeThumb, setActiveThumb] = useState<InoSliderThumb | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lowerValue = range ? (value as [number, number])[0] : (value as number);
  const upperValue = range ? (value as [number, number])[1] : null;

  const percentFor = (val: number) => (max === min ? 0 : ((val - min) / (max - min)) * 100);

  const clampToStep = (raw: number) => {
    const stepped = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, stepped));
  };

  const commit = (thumb: InoSliderThumb, rawValue: number) => {
    const clamped = clampToStep(rawValue);
    if (!range) {
      onValueChange?.(clamped);
      return;
    }
    const [lower, upper] = value as [number, number];
    if (thumb === 'lower') {
      onValueChange?.([Math.min(clamped, upper), upper]);
    } else {
      onValueChange?.([lower, Math.max(clamped, lower)]);
    }
  };

  const onTrackLayout = (event: LayoutChangeEvent) => {
    trackRef.current?.measureInWindow((x, y, width, height) => {
      trackLayoutRef.current = { x, y, width, height };
    });
  };

  const valueFromGesture = (screenX: number, screenY: number) => {
    const { x, y, width, height } = trackLayoutRef.current;
    const fraction = vertical ? (y + height - screenY) / height : (screenX - x) / width;
    const clampedFraction = Math.min(1, Math.max(0, fraction));
    return min + clampedFraction * (max - min);
  };

  const makePanResponder = (thumb: InoSliderThumb) =>
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => isInteractive,
          onMoveShouldSetPanResponder: () => isInteractive,
          onPanResponderGrant: (event) => {
            trackRef.current?.measureInWindow((x, y, width, height) => {
              trackLayoutRef.current = { x, y, width, height };
            });
            setIsDragging(true);
            setActiveThumb(thumb);
            commit(thumb, valueFromGesture(event.nativeEvent.pageX, event.nativeEvent.pageY));
          },
          onPanResponderMove: (event) => {
            commit(thumb, valueFromGesture(event.nativeEvent.pageX, event.nativeEvent.pageY));
          },
          onPanResponderRelease: () => {
            setIsDragging(false);
            setActiveThumb(null);
          },
          onPanResponderTerminate: () => {
            setIsDragging(false);
            setActiveThumb(null);
          },
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [thumb, isInteractive, range, min, max, step, value],
    );

  const lowerPanResponder = makePanResponder('lower');
  const upperPanResponder = makePanResponder('upper');

  const marks = useMemo(() => {
    if (!showMarks || step <= 0) return [];
    const count = Math.min(Math.round((max - min) / step), 100);
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) ticks.push(min + i * step);
    return ticks;
  }, [showMarks, step, min, max]);

  const ariaLabelFor = (thumb: InoSliderThumb) => {
    if (!range) return label || 'Value';
    const suffix = thumb === 'lower' ? 'minimum' : 'maximum';
    return label ? `${label} (${suffix})` : `${suffix === 'minimum' ? 'Minimum' : 'Maximum'} value`;
  };

  const onAccessibilityAction = (thumb: InoSliderThumb) => (event: { nativeEvent: { actionName: string } }) => {
    if (!isInteractive) return;
    const current = thumb === 'lower' ? lowerValue : (upperValue as number);
    if (event.nativeEvent.actionName === 'increment') commit(thumb, current + step);
    else if (event.nativeEvent.actionName === 'decrement') commit(thumb, current - step);
  };

  const fillStartPercent = range ? percentFor(lowerValue) : 0;
  const fillEndPercent = range ? percentFor(upperValue as number) : percentFor(lowerValue);

  const renderThumb = (thumb: InoSliderThumb, thumbValue: number, panResponder: ReturnType<typeof PanResponder.create>) => {
    const atBound = thumbValue <= min || thumbValue >= max;
    const percent = percentFor(thumbValue);
    const offsetStyle = vertical
      ? { bottom: `${percent}%` as const, marginBottom: -thumbSize / 2 }
      : { left: `${percent}%` as const, marginLeft: -thumbSize / 2 };

    return (
      <View
        key={thumb}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={ariaLabelFor(thumb)}
        accessibilityValue={{ min, max, now: thumbValue }}
        accessibilityState={{ disabled: !isInteractive }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction(thumb)}
        style={[
          styles.thumb,
          offsetStyle,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: colors.surfaceRaised,
            borderColor: isDragging && activeThumb === thumb ? colors.accentActive : atBound ? colors.accentActive : colors.accent,
            borderWidth: 2,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        hitSlop={{ top: TOUCH_SLOP, bottom: TOUCH_SLOP, left: TOUCH_SLOP, right: TOUCH_SLOP }}
      >
        {showTooltip && activeThumb === thumb ? (
          <View style={[styles.tooltip, { backgroundColor: colors.onSurface }]}>
            <Text style={[styles.tooltipText, { color: colors.surface }]}>{thumbValue}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const displayValueLabel = range ? `${lowerValue} – ${upperValue}` : `${lowerValue}`;

  return (
    <View style={vertical ? styles.columnField : styles.field}>
      {label ? (
        <Text style={[styles.label, { color: disabled ? colors.onSurfaceMuted : colors.onSurface }]}>{label}</Text>
      ) : null}

      <View style={vertical ? styles.verticalBody : styles.horizontalBody}>
        {showMinMaxLabels ? (
          <Text style={[styles.boundLabel, { color: colors.onSurfaceMuted }]}>{min}</Text>
        ) : null}

        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          style={[
            vertical ? styles.verticalTrack : styles.horizontalTrack,
            vertical ? { width: trackThickness } : { height: trackThickness },
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill },
          ]}
        >
          <View
            style={[
              vertical ? styles.verticalFill : styles.horizontalFill,
              vertical
                ? { bottom: `${fillStartPercent}%` as const, height: `${fillEndPercent - fillStartPercent}%` as const }
                : { left: `${fillStartPercent}%` as const, right: `${100 - fillEndPercent}%` as const },
              { backgroundColor: isDragging ? colors.accentActive : colors.accent, borderRadius: radius.pill },
            ]}
          />

          {marks.map((mark) => (
            <View
              key={mark}
              pointerEvents="none"
              style={[
                styles.mark,
                vertical
                  ? { bottom: `${percentFor(mark)}%` as const }
                  : { left: `${percentFor(mark)}%` as const },
                { backgroundColor: colors.borderSoft },
              ]}
            />
          ))}

          {renderThumb('lower', lowerValue, lowerPanResponder)}
          {range ? renderThumb('upper', upperValue as number, upperPanResponder) : null}
        </View>

        {showMinMaxLabels ? (
          <Text style={[styles.boundLabel, { color: colors.onSurfaceMuted }]}>{max}</Text>
        ) : null}
      </View>

      {showValueLabel ? (
        <Text style={[styles.valueLabel, { color: colors.onSurfaceMuted }]}>{displayValueLabel}</Text>
      ) : null}

      {hint && !error ? <Text style={[styles.hint, { color: colors.onSurfaceMuted }]}>{hint}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  columnField: { gap: 8, alignItems: 'flex-start' },
  label: { fontSize: 15, fontWeight: '500' },
  horizontalBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verticalBody: { flexDirection: 'column', alignItems: 'center', gap: 8, height: 200 },
  horizontalTrack: { flex: 1, justifyContent: 'center', position: 'relative' },
  verticalTrack: { flex: 1, justifyContent: 'center', position: 'relative' },
  horizontalFill: { position: 'absolute', top: 0, bottom: 0 },
  verticalFill: { position: 'absolute', left: 0, right: 0 },
  mark: { position: 'absolute', width: 2, height: 2, borderRadius: 1 },
  thumb: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tooltip: { position: 'absolute', bottom: '120%', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tooltipText: { fontSize: 12, fontWeight: '600' },
  boundLabel: { fontSize: 12.5 },
  valueLabel: { fontSize: 12.5 },
  hint: { fontSize: 12.5 },
  error: { fontSize: 12.5 },
});
