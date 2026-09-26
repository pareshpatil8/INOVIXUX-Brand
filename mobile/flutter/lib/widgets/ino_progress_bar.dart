import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoProgressBarMode { determinate, indeterminate }

enum InoProgressBarSize { sm, standard, lg }

const Map<InoProgressBarSize, double> _trackThickness = {
  InoProgressBarSize.sm: InoSpace.s1,
  InoProgressBarSize.standard: InoSpace.s2,
  InoProgressBarSize.lg: InoSpace.s3,
};

/// `<InoProgressBar>` — Flutter port of `<ino-progress-bar>`
/// (web/src/app/components/progress-bar, INO-132 / INO-31 T-15). Mirrors the web ARIA contract:
/// [Semantics.value] carries the same "N%" string web's `aria-valuetext` announces in determinate
/// mode; indeterminate mode passes no value, matching Flutter's own indeterminate convention
/// (same as [LinearProgressIndicator] with a null `value`) and web/RN's own "no numeric value to
/// report" rule — see web/src/app/components/progress-bar/SPEC.md §2.
class InoProgressBar extends StatefulWidget {
  final InoProgressBarMode mode;
  final InoProgressBarSize size;
  final double value;
  final bool showValue;
  final String unit;
  final bool disabled;
  final bool invalid;

  const InoProgressBar({
    super.key,
    this.mode = InoProgressBarMode.determinate,
    this.size = InoProgressBarSize.standard,
    this.value = 0,
    this.showValue = true,
    this.unit = '%',
    this.disabled = false,
    this.invalid = false,
  });

  @override
  State<InoProgressBar> createState() => _InoProgressBarState();
}

class _InoProgressBarState extends State<InoProgressBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: InoMotion.slow * 3);
    if (widget.mode == InoProgressBarMode.indeterminate) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(InoProgressBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.mode == InoProgressBarMode.indeterminate && !_controller.isAnimating) {
      _controller.repeat();
    } else if (widget.mode == InoProgressBarMode.determinate) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final clampedValue = widget.value.clamp(0, 100).toDouble();
    final valueText = '${clampedValue.round()}${widget.unit}';
    final thickness = _trackThickness[widget.size]!;
    final fillColor = widget.invalid ? colors.danger : colors.accent;
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    Widget fillWidget;
    if (widget.mode == InoProgressBarMode.determinate) {
      fillWidget = FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: clampedValue / 100,
        child: Container(
          height: thickness,
          decoration: BoxDecoration(color: fillColor, borderRadius: BorderRadius.circular(thickness / 2)),
        ),
      );
    } else if (reduceMotion) {
      fillWidget = FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: 0.4,
        child: Container(
          height: thickness,
          decoration: BoxDecoration(color: fillColor, borderRadius: BorderRadius.circular(thickness / 2)),
        ),
      );
    } else {
      fillWidget = AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth * 0.4;
              final travel = constraints.maxWidth + width;
              final left = -width + _controller.value * travel;
              return Stack(children: [
                Positioned(
                  left: left,
                  child: Container(
                    width: width,
                    height: thickness,
                    decoration:
                        BoxDecoration(color: fillColor, borderRadius: BorderRadius.circular(thickness / 2)),
                  ),
                ),
              ]);
            },
          );
        },
      );
    }

    return Opacity(
      opacity: widget.disabled ? 0.5 : 1,
      child: Semantics(
        label: 'Progress',
        value: widget.mode == InoProgressBarMode.determinate ? valueText : null,
        liveRegion: widget.mode == InoProgressBarMode.indeterminate,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(thickness / 2),
              child: Container(
                width: double.infinity,
                height: thickness,
                decoration: BoxDecoration(
                  color: colors.surfaceSunken,
                  border: Border.all(color: colors.border, width: 1),
                  borderRadius: BorderRadius.circular(thickness / 2),
                ),
                child: fillWidget,
              ),
            ),
            if (widget.mode == InoProgressBarMode.determinate && widget.showValue)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  valueText,
                  style: TextStyle(color: colors.onSurfaceMuted, fontSize: 12.5),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
