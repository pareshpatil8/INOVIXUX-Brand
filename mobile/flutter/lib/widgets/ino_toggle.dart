import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoToggle>` — Flutter port of `<ino-toggle>` (web/src/app/components/toggle,
/// INO-160 / INO-31 U-5). Fully custom-drawn (`GestureDetector` + `Container` + `Semantics`),
/// matching `ino_checkbox.dart`'s approach of not leaning on Material's own widgets — Flutter's
/// built-in `Switch` pulls its own Material theming/sizing/thumb-shadow defaults that don't track
/// this design system's token set, so this widget draws its own track and thumb instead.
///
/// The icon overlay is an `Icon` positioned inside the thumb, swapped by `checked` — the same
/// "glyph inside the moving element" shape `ino_checkbox.dart`'s check/dash glyph already uses.
///
/// `Semantics(toggled: checked)` is Flutter's switch-specific semantics flag (distinct from
/// `Semantics(checked:)`, which `ino_checkbox.dart` uses for its own checkbox role) — the direct
/// equivalent of RN's `accessibilityRole="switch"` and web's `role="switch"`.
class InoToggle extends StatelessWidget {
  final String? label;
  final bool checked;
  final bool disabled;
  final bool readonly;
  final bool loading;
  final bool invalid;
  final InoControlSize size;
  final ValueChanged<bool>? onChanged;

  const InoToggle({
    super.key,
    this.label,
    this.checked = false,
    this.disabled = false,
    this.readonly = false,
    this.loading = false,
    this.invalid = false,
    this.size = InoControlSize.standard,
    this.onChanged,
  });

  bool get _isInteractive => !disabled && !readonly && !loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final thumbSize = size.iconSize;
    const inset = 2.0;
    final trackWidth = thumbSize * 2 + inset * 2;
    final trackHeight = thumbSize + inset * 2;

    final track = Container(
      width: trackWidth,
      height: trackHeight,
      decoration: BoxDecoration(
        color: checked ? colors.accent : colors.surfaceSunken,
        borderRadius: BorderRadius.circular(InoRadius.pill),
        border: checked ? null : Border.all(color: invalid ? colors.danger : colors.border),
      ),
      child: AnimatedAlign(
        duration: InoMotion.base,
        curve: InoMotion.easingStandard,
        alignment: checked ? Alignment.centerRight : Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.all(inset),
          child: Container(
            width: thumbSize,
            height: thumbSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: checked ? colors.onAccent : colors.onSurfaceMuted,
            ),
            alignment: Alignment.center,
            child: Icon(
              checked ? Icons.check : Icons.close,
              size: thumbSize * 0.6,
              color: checked ? colors.accent : colors.surface,
            ),
          ),
        ),
      ),
    );

    final row = Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          track,
          // Static ring, not an animated spinner — same scope call InoCheckbox's Flutter port
          // already made; no shared spin-animation primitive exists yet.
          if (loading) ...[
            SizedBox(width: size.gap),
            SizedBox(
              width: thumbSize / 2,
              height: thumbSize / 2,
              child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
            ),
          ],
          if (label != null) ...[
            SizedBox(width: size.gap),
            Text(
              label!,
              style: TextStyle(
                fontSize: size.fontSize,
                color: disabled ? colors.onSurfaceMuted : colors.onSurface,
              ),
            ),
          ],
        ],
      ),
    );

    return Semantics(
      label: label,
      toggled: checked,
      enabled: _isInteractive,
      button: true,
      child: GestureDetector(
        onTap: _isInteractive ? () => onChanged?.call(!checked) : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
          child: Align(alignment: Alignment.centerLeft, child: row),
        ),
      ),
    );
  }
}
