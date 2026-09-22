import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoToggle>` — Flutter port of `<ino-toggle>` (web/src/app/components/toggle,
/// INO-160 / INO-31 U-5). Fully custom-drawn (`GestureDetector` + `Container` + `Semantics`),
/// matching `ino_button.dart`'s approach of not leaning on Material's own widgets — Flutter's
/// built-in `Switch` pulls its own Material theming/sizing/thumb-shadow defaults that don't track
/// this design system's token set, so this widget draws its own track and thumb instead.
///
/// The icon overlay is an `Icon` positioned inside the thumb, swapped by `checked` — plain
/// Material icons, not a custom asset, mirroring the web component's own glyph choice (§2 of that
/// component's SPEC.md). Thumb position uses `AlignmentDirectional`, which Flutter resolves
/// against the ambient `Directionality` automatically — the same fix the web component's
/// `inset-inline-start` migration made (SPEC.md §7/§9).
///
/// `Semantics(toggled: checked)` is Flutter's switch-specific semantics flag — the direct
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
        // `invalid` always gets a visible border, checked or not — a border that only shows up
        // when unchecked (the old `checked ? null : Border.all(...)`) makes the danger colour
        // disappear on exactly the state most likely to need it (an invalid control the user just
        // turned on). Un-invalid keeps the prior checked/unchecked border split.
        border: invalid
            ? Border.all(color: colors.danger, width: 2)
            : (checked ? null : Border.all(color: colors.border)),
      ),
      child: AnimatedAlign(
        duration: InoMotion.base,
        curve: InoMotion.easingStandard,
        // `AlignmentDirectional`, not `Alignment.centerRight`/`centerLeft` — Flutter resolves
        // this against the ambient `Directionality` automatically, so the thumb travels the
        // correct way under RTL. The same fix the web component's `inset-inline-start`
        // migration made (SPEC.md §7/§9).
        alignment: checked ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
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
      // `enabled` reflects only `disabled`/`loading`, not `readonly` — a switch's SPEC.md §4
      // argues readonly is a distinct state from disabled (the control stays focusable and fully
      // legible, only its interactive affordances withdraw), so it gets its own `readOnly` flag
      // instead of collapsing into `enabled: false`.
      enabled: !disabled && !loading,
      readOnly: readonly,
      button: true,
      child: GestureDetector(
        onTap: _isInteractive ? () => onChanged?.call(!checked) : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
          // `AlignmentDirectional.centerStart`, not `Alignment.centerLeft` — same RTL fix as the
          // thumb above, applied to where the row sits when its parent offers extra width.
          child: Align(alignment: AlignmentDirectional.centerStart, child: row),
        ),
      ),
    );
  }
}
