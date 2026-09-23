import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoRadio>` — Flutter port of `<ino-radio>` (web/src/app/components/radio-group,
/// INO-159 / INO-31 U-4). Fully custom-drawn (`GestureDetector` + `Container` + `Semantics`),
/// mirroring `ino_checkbox.dart`'s approach of not leaning on Material's own widgets — Flutter's
/// built-in `Radio` pulls its own Material theming/sizing/ripple defaults that don't track this
/// design system's token set.
///
/// `Semantics.checked` is set directly as a plain `bool` — unlike `ino_checkbox.dart`, there is no
/// `mixed`/indeterminate concept for a radio, so `Semantics.mixed` is never set here.
///
/// `checked` is caller-managed, same as `InoCheckbox` — this widget never flips its own `checked`
/// value; `InoRadioGroup` (or a caller wiring up several standalone `InoRadio`s) owns which option
/// is selected and is solely responsible for un-checking siblings, since Flutter has no platform
/// mutual-exclusion primitive to lean on either (unlike web's shared-`name` native grouping).
class InoRadio extends StatelessWidget {
  final String? label;
  final bool checked;
  final bool disabled;
  final bool readonly;
  final bool loading;
  final bool invalid;
  final InoControlSize size;
  final ValueChanged<bool>? onChanged;

  const InoRadio({
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
    final dotSize = size.iconSize;

    final ring = Container(
      width: dotSize,
      height: dotSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: invalid ? colors.danger : (checked ? colors.accent : colors.border),
          width: 2,
        ),
      ),
      alignment: Alignment.center,
      child: checked
          ? Container(
              width: dotSize * 0.5,
              height: dotSize * 0.5,
              decoration: BoxDecoration(shape: BoxShape.circle, color: colors.accent),
            )
          : null,
    );

    final row = Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ring,
          // Static ring, not an animated spinner — same scope call `ino_checkbox.dart` already made.
          if (loading) ...[
            SizedBox(width: size.gap),
            SizedBox(
              width: dotSize / 2,
              height: dotSize / 2,
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
      checked: checked,
      enabled: _isInteractive,
      inMutuallyExclusiveGroup: true,
      child: GestureDetector(
        onTap: _isInteractive ? () => onChanged?.call(true) : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: InoTarget.comfortable),
          child: Align(alignment: Alignment.centerLeft, child: row),
        ),
      ),
    );
  }
}
