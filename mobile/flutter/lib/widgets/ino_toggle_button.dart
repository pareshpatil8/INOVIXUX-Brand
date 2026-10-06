import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoToggleButton` — Flutter port of `<ino-toggle-button>`
/// (web/src/app/components/toggle-button, INO-412 / INO-31 B1). WAI-ARIA "toggle button"
/// pattern — `Semantics(button: true, toggled: pressed)` — distinct from `InoToggle`'s
/// `Semantics(toggled: checked)` switch pattern (the Flutter `toggled` flag itself is generic;
/// pairing it with `button: true` here vs. no explicit role there is what carries the
/// aria-pressed-vs-role=switch distinction web draws).
///
/// Fill/text/border-by-state mirror `ino_button.dart`'s `_fill`/`_text`/`_border` methods:
/// unpressed reads the same pair `InoButtonVariant.secondary` uses, pressed reads the same pair
/// `InoButtonVariant.primary` uses — reusing two already-themed pairs rather than inventing a
/// third visual language for one component.
class InoToggleButton extends StatefulWidget {
  final String onLabel;
  final String offLabel;
  final IconData? onIcon;
  final IconData? offIcon;
  final String? semanticLabel;
  final bool pressed;
  final InoControlSize size;
  final ValueChanged<bool>? onChanged;

  const InoToggleButton({
    super.key,
    this.onLabel = 'Yes',
    this.offLabel = 'No',
    this.onIcon,
    this.offIcon,
    this.semanticLabel,
    this.pressed = false,
    this.size = InoControlSize.standard,
    required this.onChanged,
  });

  bool get disabled => onChanged == null;

  @override
  State<InoToggleButton> createState() => _InoToggleButtonState();
}

class _InoToggleButtonState extends State<InoToggleButton> {
  bool _down = false;

  bool get _isDisabled => widget.disabled;

  Color _fill(InoPalette colors) {
    if (widget.pressed) return _down ? colors.accentActive : colors.accent;
    return _down ? colors.surfaceSunken : colors.surfaceRaised;
  }

  Color _text(InoPalette colors) => widget.pressed ? colors.onAccent : colors.onSurface;

  Color _border(InoPalette colors) {
    if (widget.pressed) return colors.surface.withValues(alpha: 0);
    return _down ? colors.accentActive : colors.border;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final label = widget.pressed ? widget.onLabel : widget.offLabel;
    final icon = widget.pressed ? widget.onIcon : widget.offIcon;

    return Semantics(
      button: true,
      toggled: widget.pressed,
      enabled: !_isDisabled,
      label: widget.semanticLabel ?? label,
      child: GestureDetector(
        onTapDown: _isDisabled ? null : (_) => setState(() => _down = true),
        onTapUp: _isDisabled ? null : (_) => setState(() => _down = false),
        onTapCancel: _isDisabled ? null : () => setState(() => _down = false),
        onTap: _isDisabled ? null : () => widget.onChanged?.call(!widget.pressed),
        child: AnimatedContainer(
          duration: InoMotion.fast,
          curve: InoMotion.easingStandard,
          constraints: BoxConstraints(minHeight: dims.height),
          padding: EdgeInsets.symmetric(horizontal: dims.paddingInlineRoomy),
          decoration: BoxDecoration(
            color: _fill(colors),
            borderRadius: BorderRadius.circular(InoRadius.md),
            border: Border.all(color: _border(colors), width: widget.pressed ? 0 : 1),
          ),
          child: Opacity(
            opacity: _isDisabled ? 0.5 : 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: dims.iconSize, color: _text(colors)),
                  SizedBox(width: dims.gap),
                ],
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: _text(colors),
                    fontSize: dims.fontSize,
                    fontWeight: FontWeight.w600,
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
