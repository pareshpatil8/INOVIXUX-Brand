import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_skeleton.dart';

enum InoImageFit { cover, contain, fill, none, scaleDown }

/// Maps the web `object-fit` keyword set to Flutter's `BoxFit` — web/src/app/components/image/
/// SPEC.md §3. `none` (never resize) maps to `BoxFit.none`; `scaleDown` maps to
/// `BoxFit.scaleDown`, Flutter's own exact equivalent (unlike the RN port, which has to
/// approximate both — `BoxFit` covers the full CSS `object-fit` set natively).
BoxFit _boxFit(InoImageFit fit) {
  switch (fit) {
    case InoImageFit.cover:
      return BoxFit.cover;
    case InoImageFit.contain:
      return BoxFit.contain;
    case InoImageFit.fill:
      return BoxFit.fill;
    case InoImageFit.none:
      return BoxFit.none;
    case InoImageFit.scaleDown:
      return BoxFit.scaleDown;
  }
}

/// Flutter has no intrinsic-sizing layout for a remote image without an async size probe —
/// unlike web's default intrinsic mode, a dimension is always required here. This is the
/// fallback box when neither `width` nor `height` is supplied. Platform caveat:
/// web/src/app/components/image/SPEC.md §8.
const double _defaultDimension = 200;

/// `InoImage` — Flutter port of `<ino-image>` (web/src/app/components/image, INO-487 / INO-31
/// Phase B5). Base render only: loading placeholder, error-fallback, caption, intrinsic/fit
/// sizing — no lightbox. The preview-on-click lightbox is web-only (no focus-trap primitive
/// exists on this platform in this codebase); full reasoning: `SPEC.md` §8.
class InoImage extends StatefulWidget {
  final String? src;
  final String alt;
  final InoImageFit fit;
  final double? width;
  final double? height;
  final String? caption;
  final Widget? fallback;

  const InoImage({
    super.key,
    this.src,
    required this.alt,
    this.fit = InoImageFit.cover,
    this.width,
    this.height,
    this.caption,
    this.fallback,
  });

  @override
  State<InoImage> createState() => _InoImageState();
}

class _InoImageState extends State<InoImage> {
  bool _loaded = false;
  bool _failed = false;

  @override
  void didUpdateWidget(InoImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Mirrors the web component's `ngOnChanges` reset — swapping to a new `src` always gets a
    // fresh load attempt instead of staying stuck on a previous outcome.
    if (oldWidget.src != widget.src) {
      setState(() {
        _loaded = false;
        _failed = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final boxWidth = widget.width ?? _defaultDimension;
    final boxHeight = widget.height ?? _defaultDimension;
    final showImage = (widget.src?.isNotEmpty ?? false) && !_failed;
    final showFallback = !(widget.src?.isNotEmpty ?? false) || _failed;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(InoRadius.md),
          child: Container(
            width: boxWidth,
            height: boxHeight,
            color: colors.surfaceSunken,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (showImage)
                  Image.network(
                    widget.src!,
                    width: boxWidth,
                    height: boxHeight,
                    fit: _boxFit(widget.fit),
                    semanticLabel: widget.alt,
                    frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
                      if (frame != null && !_loaded) {
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted) setState(() => _loaded = true);
                        });
                      }
                      return AnimatedOpacity(
                        opacity: frame == null ? 0 : 1,
                        duration: InoMotion.fast,
                        child: child,
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => _failed = true);
                      });
                      return const SizedBox.shrink();
                    },
                  ),
                if (showImage && !_loaded)
                  InoSkeleton(shape: InoSkeletonShape.rectangle, width: boxWidth, height: boxHeight, borderRadius: InoRadius.md),
                if (showFallback)
                  Semantics(
                    label: widget.alt.isNotEmpty ? widget.alt : 'Image unavailable',
                    image: true,
                    child: Center(
                      child: widget.fallback ??
                          Icon(
                            LucideIcons.imageOff,
                            size: (boxWidth < boxHeight ? boxWidth : boxHeight) * 0.3,
                            color: colors.onSurfaceMuted,
                          ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (widget.caption != null && widget.caption!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              widget.caption!,
              style: TextStyle(fontSize: 11.5, color: colors.onSurfaceMuted),
            ),
          ),
      ],
    );
  }
}
