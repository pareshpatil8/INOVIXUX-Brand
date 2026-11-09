import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoChip` — Flutter port of `<ino-chip>` (web/src/app/components/chip, INO-462 / INO-31 Phase
/// B4). Parity benchmark: PrimeNG Chip. Contract: web/src/app/components/chip/SPEC.md.
///
/// Mirrors the web button-in-group contract: when `interactive` and `removable` are both set,
/// the main tap target and the remove tap target are two independent `Semantics(button: true)`
/// regions grouped under one `Semantics(container: true)`, not one combined control — same
/// reasoning `ino-chip.component.html`'s sibling-buttons structure documents (SPEC.md §1).
///
/// `removing` fades the chip out (`AnimatedOpacity`) and announces "Removing {label}" before
/// calling `onRemoved` — self-contained, same as the web port's local `removing` state rather
/// than an external list-animation the caller has to wire up (SPEC.md §2, §8). There is no
/// platform signal on Flutter equivalent to `prefers-reduced-motion`, so the fade always plays.
///
/// `size` reads the shared [InoControlSize] scale (`paddingInline`/`fontSize`/`iconSize`/`gap`
/// only — not `height`), the same three-alias subset the web component's `.ino-tag`-derived
/// chrome reads: a chip is a label/action, not a full-height form control (SPEC.md §3).
class InoChip extends StatefulWidget {
  final String label;
  final InoControlSize size;
  final bool interactive;
  final bool removable;
  final bool pressable;
  final bool pressed;
  final bool disabled;
  final bool readOnly;
  final Widget? icon;
  final Widget? avatar;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onPressedChanged;
  final VoidCallback? onRemoved;

  const InoChip({
    super.key,
    required this.label,
    this.size = InoControlSize.standard,
    this.interactive = false,
    this.removable = false,
    this.pressable = false,
    this.pressed = false,
    this.disabled = false,
    this.readOnly = false,
    this.icon,
    this.avatar,
    this.onTap,
    this.onPressedChanged,
    this.onRemoved,
  });

  @override
  State<InoChip> createState() => _InoChipState();
}

class _InoChipState extends State<InoChip> {
  bool _removing = false;

  bool get _blocked => widget.disabled || widget.readOnly || _removing;

  void _handleTap() {
    if (_blocked || !widget.interactive) return;
    if (widget.pressable) {
      widget.onPressedChanged?.call(!widget.pressed);
    }
    widget.onTap?.call();
  }

  void _handleRemove() {
    if (widget.disabled || widget.readOnly || _removing || !widget.removable) return;
    setState(() => _removing = true);
    SemanticsService.announce('Removing ${widget.label}', TextDirection.ltr);
    Future.delayed(InoMotion.fast, () {
      if (mounted) widget.onRemoved?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.inoColors;
    final dims = widget.size;
    final pressedActive = widget.interactive && widget.pressable && widget.pressed;

    final Color fill = pressedActive ? p.accent : p.surfaceRaised;
    final Color border = pressedActive ? p.accent : p.border;
    final Color onFill = pressedActive ? p.onAccent : p.onSurface;

    final labelText = Text(
      widget.label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(color: onFill, fontSize: dims.fontSize),
    );

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.icon != null) ...[
          IconTheme(
            data: IconThemeData(size: dims.iconSize, color: onFill),
            child: widget.icon!,
          ),
          SizedBox(width: dims.gap),
        ] else if (widget.avatar != null) ...[
          widget.avatar!,
          SizedBox(width: dims.gap),
        ],
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 160),
          child: labelText,
        ),
      ],
    );

    final Widget body = widget.interactive
        ? Semantics(
            button: true,
            enabled: !_blocked,
            toggled: widget.pressable ? widget.pressed : null,
            label: widget.label,
            child: GestureDetector(
              onTap: _blocked ? null : _handleTap,
              child: content,
            ),
          )
        : (widget.removable ? content : Semantics(label: widget.label, child: content));

    final bool removeBlocked = widget.disabled || widget.readOnly || _removing;
    final Widget? removeButton = widget.removable
        ? Semantics(
            button: true,
            label: 'Remove ${widget.label}',
            enabled: !removeBlocked,
            child: GestureDetector(
              onTap: removeBlocked ? null : _handleRemove,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(Icons.close, size: 14, color: onFill),
              ),
            ),
          )
        : null;

    final Widget chipChrome = Container(
      constraints: const BoxConstraints(minHeight: inoRowMinHeight),
      padding: EdgeInsets.symmetric(horizontal: dims.paddingInline, vertical: 4),
      decoration: BoxDecoration(
        color: fill,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(InoRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          body,
          if (removeButton != null) ...[SizedBox(width: dims.gap), removeButton],
        ],
      ),
    );

    final Widget chip = widget.removable
        ? Semantics(container: true, explicitChildNodes: true, child: chipChrome)
        : chipChrome;

    return Opacity(
      opacity: widget.disabled ? 0.5 : (widget.readOnly ? 0.75 : 1),
      child: AnimatedOpacity(
        opacity: _removing ? 0 : 1,
        duration: InoMotion.fast,
        curve: InoMotion.easingStandard,
        child: chip,
      ),
    );
  }
}
