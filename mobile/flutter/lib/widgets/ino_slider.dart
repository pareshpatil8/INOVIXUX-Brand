import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum InoSliderTrackSize { sm, md }

/// `<InoSlider>` — Flutter port of `<ino-slider>` (web/src/app/components/slider, INO-408 /
/// INO-31 B1).
///
/// Wraps Material's built-in `Slider`/`RangeSlider`, themed via `SliderThemeData` to match this
/// design system's tokens (`activeTrackColor`, `inactiveTrackColor`, `thumbColor`,
/// `overlayColor`) rather than a from-scratch custom-painted widget, per SPEC.md §11: unlike RN
/// (which has no built-in slider primitive to theme), Flutter's slider already implements the
/// drag/keyboard/semantics contract this component's spec asks for, so theming it is the
/// correct-effort choice here.
///
/// `range` switches between `Slider` (single `double` value) and `RangeSlider`
/// (`RangeValues` lower/upper) — the same mode-flag convention `InoAutocomplete`'s `multiple`
/// uses for its `value` type. `divisions` (derived from `step`) drives both the step-snap
/// behavior and, when `showMarks` is set, Material's own tick rendering — no separate custom
/// mark layer is needed the way the web/RN ports draw one.
class InoSlider extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final InoSliderTrackSize trackSize;
  final double min;
  final double max;
  final double step;
  final bool range;
  final bool vertical;
  final bool showMarks;
  final bool showMinMaxLabels;
  final bool showValueLabel;
  final bool disabled;
  final bool readonly;
  // Plain `double` in single mode, `RangeValues` in range mode — mirrors the web/RN `number |
  // [number, number]` union via two optional fields instead of a dynamic type, since Dart has no
  // convenient discriminated-union value type for a widget constructor parameter.
  final double? value;
  final RangeValues? rangeValue;
  final ValueChanged<double>? onValueChange;
  final ValueChanged<RangeValues>? onRangeValueChange;

  const InoSlider({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.trackSize = InoSliderTrackSize.md,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.range = false,
    this.vertical = false,
    this.showMarks = false,
    this.showMinMaxLabels = false,
    this.showValueLabel = false,
    this.disabled = false,
    this.readonly = false,
    this.value,
    this.rangeValue,
    this.onValueChange,
    this.onRangeValueChange,
  }) : assert(
          range ? rangeValue != null : value != null,
          'Provide `value` in single mode or `rangeValue` in range mode.',
        );

  bool get _isInteractive => !disabled && !readonly;

  String get _displayValueLabel => range
      ? '${rangeValue!.start.round()} – ${rangeValue!.end.round()}'
      : '${value!.round()}';

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = error != null && error!.isNotEmpty;
    final divisions = step > 0 ? ((max - min) / step).round() : null;
    final trackHeight = trackSize == InoSliderTrackSize.sm ? 2.0 : 4.0;

    final theme = SliderThemeData(
      activeTrackColor: colors.accent,
      inactiveTrackColor: colors.surfaceSunken,
      thumbColor: colors.surfaceRaised,
      overlayColor: colors.accent.withOpacity(0.12),
      valueIndicatorColor: colors.onSurface,
      activeTickMarkColor: colors.borderSoft,
      inactiveTickMarkColor: colors.borderSoft,
      trackHeight: trackHeight,
      disabledActiveTrackColor: colors.accent.withOpacity(0.5),
      disabledInactiveTrackColor: colors.surfaceSunken,
      disabledThumbColor: colors.surfaceRaised.withOpacity(0.5),
    );

    final slider = SliderTheme(
      data: theme,
      child: range
          ? RangeSlider(
              values: rangeValue!,
              min: min,
              max: max,
              divisions: divisions,
              labels: showValueLabel
                  ? RangeLabels('${rangeValue!.start.round()}', '${rangeValue!.end.round()}')
                  : null,
              onChanged: _isInteractive
                  ? (values) => onRangeValueChange?.call(values)
                  : null,
            )
          : Slider(
              value: value!,
              min: min,
              max: max,
              divisions: divisions,
              label: showValueLabel ? '${value!.round()}' : null,
              onChanged: _isInteractive ? (v) => onValueChange?.call(v) : null,
            ),
    );

    final trackRow = Row(
      children: [
        if (showMinMaxLabels)
          Text('${min.round()}', style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
        Expanded(
          child: vertical
              ? RotatedBox(quarterTurns: -1, child: slider)
              : slider,
        ),
        if (showMinMaxLabels)
          Text('${max.round()}', style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
      ],
    );

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Semantics(
        label: label,
        enabled: _isInteractive,
        readOnly: readonly,
        slider: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (label != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  label!,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: disabled ? colors.onSurfaceMuted : colors.onSurface,
                  ),
                ),
              ),
            vertical ? SizedBox(height: 160, child: trackRow) : trackRow,
            if (showValueLabel)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(_displayValueLabel, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
              ),
            if (invalid)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(error!, style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
              )
            else if (hint != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
              ),
          ],
        ),
      ),
    );
  }
}
