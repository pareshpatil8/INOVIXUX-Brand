import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoSkeletonShape { rectangle, circle, text }

/// `InoSkeleton` — Flutter port of
/// `web/src/app/components/skeleton/ino-skeleton.component.ts` (INO-131 / INO-31 T-14).
/// Re-authored, not shared: Flutter has no CSS custom properties or `@keyframes`, so the shimmer
/// is an `AnimationController` looping a `Transform.translate` over a semi-transparent overlay
/// strip, clipped to the placeholder's own bounds — the same "transform-only sweep, not a redrawn
/// gradient" shape the React Native port uses.
///
/// Full reasoning (shape defaults, size scale, reduced-motion gate, dropped `label` prop):
/// `web/src/app/components/skeleton/SPEC.md` §7.
class InoSkeleton extends StatefulWidget {
  final InoSkeletonShape shape;
  final InoControlSize size;
  final double? width;
  final double? height;
  final double? borderRadius;
  final bool animate;

  const InoSkeleton({
    super.key,
    this.shape = InoSkeletonShape.rectangle,
    this.size = InoControlSize.standard,
    this.width,
    this.height,
    this.borderRadius,
    this.animate = true,
  });

  @override
  State<InoSkeleton> createState() => _InoSkeletonState();
}

class _InoSkeletonState extends State<InoSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    // 1440ms — three durationSlow beats, matching the RN port's readable-sweep rationale
    // (SPEC.md §7); a bare 480ms pass reads as flicker at this element's typical size.
    duration: InoMotion.slow * 3,
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final shimmerActive = widget.animate && !reduceMotion;

    final (double defaultW, double defaultH, double defaultR) = switch (widget.shape) {
      InoSkeletonShape.circle => (widget.size.height, widget.size.height, widget.size.height / 2),
      InoSkeletonShape.text => (double.infinity, widget.size.fontSize, InoRadius.sm),
      InoSkeletonShape.rectangle => (double.infinity, widget.size.height, InoRadius.md),
    };

    final w = widget.width ?? defaultW;
    final h = widget.height ?? defaultH;
    final r = widget.borderRadius ?? defaultR;

    return Semantics(
      excludeSemantics: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(r),
        child: Container(
          width: w.isFinite ? w : null,
          height: h,
          color: colors.borderSoft,
          child: shimmerActive
              ? AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return FractionalTranslation(
                      translation: Offset(_controller.value * 4 - 2, 0),
                      child: Opacity(
                        opacity: 0.6,
                        child: Container(color: colors.border),
                      ),
                    );
                  },
                )
              : null,
        ),
      ),
    );
  }
}
