import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoDrawerPosition { start, end, top, bottom }

enum InoDrawerSize { sm, standard, lg }

const Map<InoDrawerPosition, Map<InoDrawerSize, double>> _panelExtent = {
  InoDrawerPosition.start: {InoDrawerSize.sm: 320, InoDrawerSize.standard: 400, InoDrawerSize.lg: 480},
  InoDrawerPosition.end: {InoDrawerSize.sm: 320, InoDrawerSize.standard: 400, InoDrawerSize.lg: 480},
  InoDrawerPosition.top: {InoDrawerSize.sm: 240, InoDrawerSize.standard: 360, InoDrawerSize.lg: 480},
  InoDrawerPosition.bottom: {InoDrawerSize.sm: 240, InoDrawerSize.standard: 360, InoDrawerSize.lg: 480},
};

const double _swipeDismissRatio = 0.35;

/// `<ino-drawer>` port (INO-260, follow-up to INO-151). Edge-anchored sliding panel — extends
/// [showConfirmActionSheet]'s scrim/dismiss pattern (single-position, bottom-only, imperative) to
/// all four [InoDrawerPosition]s the web component supports, as a declarative widget (`visible` +
/// `onClose`, same controlled contract as the React Native port) with real drag-to-dismiss rather
/// than a thin `showModalBottomSheet` wrapper (web/src/app/components/drawer/SPEC.md §9 point 2).
///
/// Caller places this in a [Stack] over the screen content it should overlay — it is not a routed
/// dialog, matching the web component's "not a nav destination" contract.
class InoDrawer extends StatefulWidget {
  const InoDrawer({
    super.key,
    required this.visible,
    required this.onClose,
    this.position = InoDrawerPosition.end,
    this.size = InoDrawerSize.standard,
    this.heading,
    this.modal = true,
    this.closeOnBackdrop = true,
    this.closeOnEscape = true,
    this.loading = false,
    this.header,
    this.footer,
    this.child,
  });

  final bool visible;
  final VoidCallback onClose;
  final InoDrawerPosition position;
  final InoDrawerSize size;
  final String? heading;
  final bool modal;
  final bool closeOnBackdrop;
  final bool closeOnEscape;
  final bool loading;
  final Widget? header;
  final Widget? footer;
  final Widget? child;

  @override
  State<InoDrawer> createState() => _InoDrawerState();
}

class _InoDrawerState extends State<InoDrawer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: InoMotion.base, value: widget.visible ? 1 : 0);
  double _dragExtent = 0;

  @override
  void didUpdateWidget(InoDrawer old) {
    super.didUpdateWidget(old);
    if (widget.visible != old.visible) {
      _dragExtent = 0;
      if (widget.visible) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _isAxisX => widget.position == InoDrawerPosition.start || widget.position == InoDrawerPosition.end;

  double get _extent => _panelExtent[widget.position]![widget.size]!;

  // Positive drag pulls toward this position's own off-screen edge (start/top pull negative,
  // end/bottom pull positive) — dragging the other way hits a wall, it does not overshoot.
  double get _restingOffset {
    final progress = 1 - _controller.value;
    final sign = widget.position == InoDrawerPosition.start || widget.position == InoDrawerPosition.top ? -1 : 1;
    return sign * _extent * progress + _dragExtent;
  }

  void _onDragUpdate(DragUpdateDetails details) {
    final delta = _isAxisX ? details.delta.dx : details.delta.dy;
    final sign = widget.position == InoDrawerPosition.start || widget.position == InoDrawerPosition.top ? -1 : 1;
    final next = _dragExtent + delta;
    setState(() => _dragExtent = sign > 0 ? next.clamp(0, _extent) : next.clamp(-_extent, 0));
  }

  void _onDragEnd(DragEndDetails details) {
    if (_dragExtent.abs() > _extent * _swipeDismissRatio) {
      widget.onClose();
    } else {
      setState(() => _dragExtent = 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible && _controller.value == 0) return const SizedBox.shrink();
    final colors = context.inoColors;
    final radius = switch (widget.position) {
      InoDrawerPosition.start => const BorderRadius.horizontal(right: Radius.circular(InoRadius.xl)),
      InoDrawerPosition.end => const BorderRadius.horizontal(left: Radius.circular(InoRadius.xl)),
      InoDrawerPosition.top => const BorderRadius.vertical(bottom: Radius.circular(InoRadius.xl)),
      InoDrawerPosition.bottom => const BorderRadius.vertical(top: Radius.circular(InoRadius.xl)),
    };

    Widget panel = AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final offset = _isAxisX ? Offset(_restingOffset, 0) : Offset(0, _restingOffset);
        return Transform.translate(
          offset: offset,
          child: Opacity(opacity: widget.loading ? 0.75 : 1, child: _panel(context, colors, radius)),
        );
      },
    );

    if (widget.modal) {
      panel = GestureDetector(
        onHorizontalDragUpdate: _isAxisX ? _onDragUpdate : null,
        onHorizontalDragEnd: _isAxisX ? _onDragEnd : null,
        onVerticalDragUpdate: !_isAxisX ? _onDragUpdate : null,
        onVerticalDragEnd: !_isAxisX ? _onDragEnd : null,
        child: panel,
      );
    }

    final content = Stack(
      children: [
        if (widget.modal)
          FadeTransition(
            opacity: _controller,
            child: GestureDetector(
              onTap: widget.closeOnBackdrop ? widget.onClose : null,
              child: Container(color: colors.overlayScrim),
            ),
          ),
        Align(
          alignment: _alignmentFor(widget.position),
          child: panel,
        ),
      ],
    );

    if (!widget.modal) {
      // Non-modal: no full-screen barrier — the rest of the screen underneath stays interactive,
      // matching web's non-modal mode (no scrim, no focus trap, no scroll lock).
      return Positioned.fill(child: IgnorePointer(ignoring: false, child: content));
    }

    if (!widget.closeOnEscape) return content;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) widget.onClose();
      },
      child: content,
    );
  }

  Widget _panel(BuildContext context, InoPalette colors, BorderRadius radius) {
    final isAxisX = _isAxisX;
    return ConstrainedBox(
      constraints: isAxisX
          ? BoxConstraints(maxWidth: _extent, minWidth: 0)
          : BoxConstraints(maxHeight: _extent, minHeight: 0),
      child: SizedBox(
        width: isAxisX ? _extent : double.infinity,
        height: isAxisX ? double.infinity : _extent,
        child: Semantics(
          container: true,
          scopesRoute: widget.modal,
          namesRoute: widget.modal && widget.heading != null,
          label: widget.heading,
          liveRegion: true,
          child: Material(
            color: colors.surfaceRaised,
            borderRadius: radius,
            elevation: 8,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(InoSpace.s6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (widget.heading != null || widget.header != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: InoSpace.s4),
                        padding: const EdgeInsets.only(bottom: InoSpace.s4),
                        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.borderSoft))),
                        child: Row(
                          children: [
                            if (widget.heading != null)
                              Expanded(
                                child: Text(
                                  widget.heading!,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(color: colors.onSurface),
                                ),
                              ),
                            if (widget.header != null) widget.header!,
                            IconButton(
                              onPressed: widget.onClose,
                              icon: const Icon(Icons.close),
                              color: colors.onSurfaceMuted,
                              tooltip: 'Close drawer',
                              constraints: const BoxConstraints(
                                minWidth: InoTarget.comfortable,
                                minHeight: InoTarget.comfortable,
                              ),
                            ),
                          ],
                        ),
                      ),
                    Flexible(child: widget.child ?? const SizedBox.shrink()),
                    if (widget.footer != null)
                      Container(
                        margin: const EdgeInsets.only(top: InoSpace.s4),
                        padding: const EdgeInsets.only(top: InoSpace.s4),
                        decoration: BoxDecoration(border: Border(top: BorderSide(color: colors.borderSoft))),
                        child: widget.footer,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Alignment _alignmentFor(InoDrawerPosition position) => switch (position) {
        InoDrawerPosition.start => Alignment.centerLeft,
        InoDrawerPosition.end => Alignment.centerRight,
        InoDrawerPosition.top => Alignment.topCenter,
        InoDrawerPosition.bottom => Alignment.bottomCenter,
      };
}
