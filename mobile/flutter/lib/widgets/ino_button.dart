import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoButton` — Flutter port of `web/src/app/components/button/ino-button.component.ts`
/// (INO-156). Re-authored, not shared: Flutter has no CSS custom properties, so every value below
/// reads the same [InoControlSize] / [InoRadius] / palette-role names the web component reads,
/// never a literal.
///
/// Web-only states with no Flutter/touch equivalent are dropped rather than faked — `hover` (no
/// pointer on touch hardware) and the `:focus-visible` ring (external-keyboard focus is an
/// OS/platform-level highlight, not something this widget draws itself). `:active` (pressed) and
/// `loading`/`disabled` carry over and are both implemented below, same as web.
enum InoButtonVariant { primary, secondary, ghost, icon, danger }

class InoButton extends StatefulWidget {
  final InoButtonVariant variant;
  final InoControlSize size;
  final String? label;
  final VoidCallback? onPressed;
  final bool loading;
  /// Required when [variant] is [InoButtonVariant.icon] and there is no visible [label] — same
  /// contract as the web component's aria-label requirement.
  final String? semanticLabel;

  const InoButton({
    super.key,
    this.variant = InoButtonVariant.primary,
    this.size = InoControlSize.standard,
    this.label,
    required this.onPressed,
    this.loading = false,
    this.semanticLabel,
  });

  bool get disabled => onPressed == null;

  @override
  State<InoButton> createState() => _InoButtonState();
}

class _InoButtonState extends State<InoButton> {
  bool _pressed = false;

  bool get _isDisabled => widget.disabled || widget.loading;

  Color _fill(InoPalette colors) {
    switch (widget.variant) {
      case InoButtonVariant.primary:
        return _pressed ? colors.accentActive : colors.accent;
      case InoButtonVariant.danger:
        return colors.danger;
      case InoButtonVariant.secondary:
        return _pressed ? colors.surfaceSunken : colors.surfaceRaised;
      case InoButtonVariant.ghost:
      case InoButtonVariant.icon:
        return _pressed ? colors.surfaceSunken : colors.surface.withValues(alpha: 0);
    }
  }

  Color _text(InoPalette colors) {
    switch (widget.variant) {
      case InoButtonVariant.primary:
      case InoButtonVariant.danger:
        return colors.onAccent;
      case InoButtonVariant.secondary:
        return colors.onSurface;
      case InoButtonVariant.ghost:
      case InoButtonVariant.icon:
        return _pressed ? colors.accentActive : colors.onSurfaceMuted;
    }
  }

  Color _border(InoPalette colors) => widget.variant == InoButtonVariant.secondary
      ? (_pressed ? colors.accentActive : colors.border)
      : colors.surface.withValues(alpha: 0);

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final isIcon = widget.variant == InoButtonVariant.icon;
    final label = widget.label;

    return Semantics(
      button: true,
      enabled: !_isDisabled,
      // No `busy` flag on Flutter's Semantics widget (unlike aria-busy on web) — `liveRegion`
      // is the closest primitive, announcing the label change when loading flips the state.
      liveRegion: widget.loading,
      label: widget.semanticLabel ?? label,
      child: GestureDetector(
        onTapDown: _isDisabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: _isDisabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: _isDisabled ? null : () => setState(() => _pressed = false),
        onTap: _isDisabled ? null : widget.onPressed,
        child: AnimatedContainer(
          duration: InoMotion.fast,
          curve: InoMotion.easingStandard,
          constraints: BoxConstraints(
            minHeight: dims.height,
            minWidth: isIcon ? dims.height : 0,
          ),
          padding: EdgeInsets.symmetric(horizontal: isIcon ? 0 : dims.paddingInlineRoomy),
          decoration: BoxDecoration(
            color: _fill(colors),
            borderRadius: BorderRadius.circular(InoRadius.md),
            border: Border.all(
              color: _border(colors),
              width: widget.variant == InoButtonVariant.secondary ? 1 : 0,
            ),
          ),
          child: Opacity(
            opacity: _isDisabled && !widget.loading ? 0.5 : 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (widget.loading) ...[
                  SizedBox(
                    width: dims.iconSize * 0.7,
                    height: dims.iconSize * 0.7,
                    // Reduced motion (disableAnimations, the Flutter surface for
                    // prefers-reduced-motion): a spinning ring becomes a static one — still
                    // conveys "busy" via the open-ring shape, but nothing on screen moves.
                    child: MediaQuery.of(context).disableAnimations
                        ? DecoratedBox(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: _text(colors), width: 2),
                            ),
                          )
                        : CircularProgressIndicator(
                            strokeWidth: 2,
                            color: _text(colors),
                          ),
                  ),
                  if (label != null) SizedBox(width: dims.gap),
                ],
                if (label != null)
                  Opacity(
                    opacity: widget.loading ? 0.6 : 1,
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: _text(colors),
                        fontSize: dims.fontSize,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
