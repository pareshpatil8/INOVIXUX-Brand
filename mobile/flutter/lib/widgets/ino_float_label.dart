import 'package:flutter/widgets.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoFloatLabelVariant { over, in_, on }

/// `<InoFloatLabel>` — Flutter port of `<ino-float-label>`
/// (web/src/app/components/floatlabel, INO-141 / INO-31 T-18).
///
/// The web component derives "floated" purely from CSS (`:focus` / `:not(:placeholder-shown)`) —
/// Flutter has neither, so this is a real, stateful re-authoring (plan rev 9 §5's "React Native and
/// Flutter are real ports" rule): the caller supplies the field's own [FocusNode] and
/// [TextEditingController] (or a plain `hasValue` flag for a non-text control) and this widget
/// listens to both to drive the label's position/scale animation.
///
/// ```dart
/// InoFloatLabel(
///   label: 'Username',
///   focusNode: _focusNode,
///   controller: _controller,
///   child: TextField(focusNode: _focusNode, controller: _controller),
/// )
/// ```
class InoFloatLabel extends StatefulWidget {
  final String label;
  final InoFloatLabelVariant variant;
  final InoControlSize size;
  final FocusNode focusNode;
  final TextEditingController? controller;
  final bool hasValue;
  final bool disabled;
  final bool invalid;
  final Widget child;

  const InoFloatLabel({
    super.key,
    required this.label,
    required this.focusNode,
    required this.child,
    this.variant = InoFloatLabelVariant.over,
    this.size = InoControlSize.standard,
    this.controller,
    this.hasValue = false,
    this.disabled = false,
    this.invalid = false,
  });

  @override
  State<InoFloatLabel> createState() => _InoFloatLabelState();
}

class _InoFloatLabelState extends State<InoFloatLabel> {
  bool get _floated =>
      widget.focusNode.hasFocus || widget.hasValue || (widget.controller?.text.isNotEmpty ?? false);

  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(_onChange);
    widget.controller?.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.focusNode.removeListener(_onChange);
    widget.controller?.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final floated = _floated;
    final docked = widget.variant != InoFloatLabelVariant.over;

    final double restTop = docked ? widget.size.height / 2 + InoSpace.s2 : widget.size.height / 2;
    final double floatedTop = docked ? InoSpace.s2 : -InoSpace.s2 - (12 * 1.4);

    final color = widget.disabled
        ? colors.onSurfaceSubtle
        : widget.invalid
            ? colors.dangerTextSafe
            : colors.onSurfaceMuted;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        // "in"/"on" permanently reserve the docked label's space, the same job web's
        // padding-block-start bump on the wrapped control does — done here as extra height on the
        // field wrapper since Flutter can't reach into an arbitrary child's own decoration the way
        // `::ng-deep` does on web.
        Padding(
          padding: EdgeInsets.only(top: docked ? InoSpace.s3 : 0),
          child: widget.child,
        ),
        AnimatedPositioned(
          duration: InoMotion.fast,
          curve: InoMotion.easingStandard,
          left: InoSpace.s4,
          top: floated ? floatedTop : restTop,
          child: IgnorePointer(
            child: Container(
              padding: widget.variant == InoFloatLabelVariant.on && floated
                  ? const EdgeInsets.symmetric(horizontal: InoSpace.s1)
                  : EdgeInsets.zero,
              color: widget.variant == InoFloatLabelVariant.on && floated ? colors.surface : null,
              child: AnimatedDefaultTextStyle(
                duration: InoMotion.fast,
                curve: InoMotion.easingStandard,
                style: TextStyle(
                  fontSize: floated ? 12 : 15,
                  height: floated ? 1.4 : 1.4,
                  color: color,
                ),
                child: Text(widget.label),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
