import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoMeterColor { accent, accentSecondary, success, warning, danger, info }
enum InoMeterOrientation { horizontal, vertical }

const List<InoMeterColor> _defaultColorOrder = [
  InoMeterColor.accent,
  InoMeterColor.accentSecondary,
  InoMeterColor.success,
  InoMeterColor.warning,
  InoMeterColor.danger,
  InoMeterColor.info,
];

class InoMeterItem {
  final String label;
  final double value;
  final InoMeterColor? color;

  const InoMeterItem({required this.label, required this.value, this.color});
}

class _Segment {
  final InoMeterItem item;
  final InoMeterColor color;
  final double percent;

  const _Segment(this.item, this.color, this.percent);
}

/// Flutter port of `<ino-meter-group>` (web/src/app/components/meter-group,
/// INO-144 / INO-31 T-13). Presentational only, matching the web component's non-interactive
/// contract: no `onTap`, no focus handling. Track thickness reads `size.iconSize` — same
/// "reuse the smallest control-size rung instead of a new local value" choice the web
/// component's SPEC.md §3 makes.
class InoMeterGroup extends StatelessWidget {
  final List<InoMeterItem> items;
  final double min;
  final double max;
  final InoMeterOrientation orientation;
  final InoControlSize size;
  final String? label;
  final bool showLegend;
  final bool disabled;
  final bool invalid;
  final bool loading;

  const InoMeterGroup({
    super.key,
    required this.items,
    this.min = 0,
    this.max = 100,
    this.orientation = InoMeterOrientation.horizontal,
    this.size = InoControlSize.standard,
    this.label,
    this.showLegend = true,
    this.disabled = false,
    this.invalid = false,
    this.loading = false,
  });

  Color _resolve(InoPalette colors, InoMeterColor color) {
    switch (color) {
      case InoMeterColor.accent:
        return colors.accent;
      case InoMeterColor.accentSecondary:
        return colors.accentSecondary;
      case InoMeterColor.success:
        return colors.success;
      case InoMeterColor.warning:
        return colors.warning;
      case InoMeterColor.danger:
        return colors.danger;
      case InoMeterColor.info:
        return colors.info;
    }
  }

  List<_Segment> _segments() {
    final range = (max - min).abs() < 0.0001 ? 0.0001 : max - min;
    var used = 0.0;
    return List.generate(items.length, (i) {
      final item = items[i];
      final value = item.value < 0 ? 0.0 : item.value;
      final available = (range - used) < 0 ? 0.0 : range - used;
      final rendered = value < available ? value : available;
      used += rendered;
      final color = item.color ?? _defaultColorOrder[i % _defaultColorOrder.length];
      return _Segment(item, color, (rendered / range) * 100);
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final thickness = size.iconSize;
    final segments = _segments();
    final horizontal = orientation == InoMeterOrientation.horizontal;

    final accessibleLabel = label ??
        (items.isEmpty
            ? 'Meter group'
            : items.map((i) => '${i.label} ${i.value}').join(', '));

    final track = Container(
      width: horizontal ? null : thickness,
      height: horizontal ? thickness : null,
      decoration: BoxDecoration(
        color: colors.surfaceSunken,
        borderRadius: BorderRadius.circular(InoRadius.pill),
        border: invalid ? Border.all(color: colors.danger, width: 2) : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: loading
          ? null
          : Flex(
              direction: horizontal ? Axis.horizontal : Axis.vertical,
              verticalDirection:
                  horizontal ? VerticalDirection.down : VerticalDirection.up,
              children: segments
                  .map((seg) => Expanded(
                        flex: (seg.percent * 100).round().clamp(0, 1000000),
                        child: Container(color: _resolve(colors, seg.color)),
                      ))
                  .toList(),
            ),
    );

    final legend = Wrap(
      spacing: InoSpace.s2,
      runSpacing: InoSpace.s2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: segments
          .map((seg) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: InoSpace.s2,
                    height: InoSpace.s2,
                    decoration: BoxDecoration(
                        color: _resolve(colors, seg.color), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 4),
                  Text(seg.item.label,
                      style: TextStyle(fontSize: 15, color: colors.onSurface)),
                  const SizedBox(width: 4),
                  Text('${seg.item.value}',
                      style: TextStyle(fontSize: 15, color: colors.onSurfaceMuted)),
                ],
              ))
          .toList(),
    );

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Semantics(
        label: invalid ? '$accessibleLabel (data may be inaccurate)' : accessibleLabel,
        enabled: !disabled,
        // No `busy` flag on Flutter's Semantics widget (unlike aria-busy on web) —
        // `liveRegion` is the same substitution InoButton/InoCard's loading state uses.
        liveRegion: loading,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: horizontal ? double.infinity : thickness, child: track),
            if (showLegend) ...[const SizedBox(height: InoSpace.s3), legend],
          ],
        ),
      ),
    );
  }
}
