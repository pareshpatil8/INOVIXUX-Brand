import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoProgressBarMode { determinate, indeterminate }

/// Flutter port of `web/src/app/components/progress-bar/ino-progress-bar.component.ts`
/// (INO-132 / INO-31 T-15). Re-authored, not shared: Flutter has no CSS custom properties or
/// `@keyframes`, so the determinate fill animates via an implicit width tween
/// (`TweenAnimationBuilder`) and the indeterminate sweep uses an `AnimationController` driving a
/// `FractionalTranslation`, gated behind `MediaQuery.of(context).disableAnimations` — the same
/// reduced-motion idiom `ino_skeleton.dart`'s own shimmer uses (pending INO-131). Under reduced
/// motion the sweep freezes to the same static 40%-wide resting bar the web CSS falls back to.
///
/// Track thickness reads `size.iconSize` — same "reuse the smallest control-size rung instead of
/// a new local value" choice `ino_meter_group.dart` and the web component's SPEC.md §3 make.
class InoProgressBar extends StatefulWidget {
  final InoProgressBarMode mode;
  final InoControlSize size;
  final double value; // 0–100, clamped. Only meaningful in mode == determinate.
  final bool showValue;
  final bool disabled;
  final bool invalid;
  /// Overrides the accessible name. Defaults to "N% complete" (determinate) or "Loading"
  /// (indeterminate) — same fallback web's `accessibleLabel` getter uses.
  final String? label;

  const InoProgressBar({
    super.key,
    this.mode = InoProgressBarMode.determinate,
    this.size = InoControlSize.standard,
    this.value = 0,
    this.showValue = false,
    this.disabled = false,
    this.invalid = false,
    this.label,
  });

  @override
  State<InoProgressBar> createState() => _InoProgressBarState();
}

class _InoProgressBarState extends State<InoProgressBar> with SingleTickerProviderStateMixin {
  late final AnimationController _sweepController = AnimationController(
    vsync: this,
    // 1440ms — three InoMotion.slow beats, same "reads as a sweep, not flicker" reasoning
    // ino_skeleton.dart's own shimmer loop uses (pending INO-131).
    duration: InoMotion.slow * 3,
  )..repeat();

  @override
  void dispose() {
    _sweepController.dispose();
    super.dispose();
  }

  double get _clamped => widget.value.isFinite ? widget.value.clamp(0, 100).toDouble() : 0;

  String get _accessibleLabel {
    if (widget.label != null && widget.label!.isNotEmpty) return widget.label!;
    return widget.mode == InoProgressBarMode.determinate
        ? '${_clamped.round()}% complete'
        : 'Loading';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final sweepActive = widget.mode == InoProgressBarMode.indeterminate && !reduceMotion;
    final fillColor = widget.invalid ? colors.danger : colors.accent;
    final thickness = widget.size.iconSize;

    final track = ClipRRect(
      borderRadius: BorderRadius.circular(InoRadius.pill),
      child: Container(
        height: thickness,
        color: colors.surfaceSunken,
        child: widget.mode == InoProgressBarMode.determinate
            ? Align(
                alignment: AlignmentDirectional.centerStart,
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: _clamped, end: _clamped),
                  duration: reduceMotion ? Duration.zero : InoMotion.base,
                  curve: InoMotion.easingStandard,
                  builder: (context, value, child) => FractionallySizedBox(
                    widthFactor: value / 100,
                    child: Container(color: fillColor),
                  ),
                ),
              )
            : Stack(
                children: [
                  AnimatedBuilder(
                    animation: _sweepController,
                    builder: (context, child) {
                      // -40% → 100% of the track, same path the web `@keyframes` sweep travels;
                      // frozen at the resting position when motion is reduced (nothing to cancel).
                      final t = sweepActive ? _sweepController.value : 0.0;
                      final start = -0.4 + t * 1.4;
                      return FractionalTranslation(
                        translation: Offset(start / 0.4, 0),
                        child: FractionallySizedBox(
                          widthFactor: 0.4,
                          child: Container(color: fillColor),
                        ),
                      );
                    },
                  ),
                ],
              ),
      ),
    );

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(child: track),
        if (widget.showValue && widget.mode == InoProgressBarMode.determinate) ...[
          SizedBox(width: widget.size.gap),
          ExcludeSemantics(
            child: Text(
              '${_clamped.round()}%',
              style: TextStyle(color: colors.onSurface, fontSize: widget.size.fontSize),
            ),
          ),
        ],
      ],
    );

    return Opacity(
      opacity: widget.disabled ? 0.5 : 1,
      child: Semantics(
        // role="progressbar" equivalent: a labelled, valued, non-focusable status widget.
        label: _accessibleLabel,
        value: widget.mode == InoProgressBarMode.determinate ? '${_clamped.round()}%' : null,
        liveRegion: widget.mode == InoProgressBarMode.indeterminate,
        child: content,
      ),
    );
  }
}
