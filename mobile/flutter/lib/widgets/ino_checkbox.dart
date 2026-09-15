import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoCheckbox>` — Flutter port of `<ino-checkbox>` (web/src/app/components/checkbox,
/// INO-158 / INO-31 U-3). Fully custom-drawn (`GestureDetector` + `Container` + `Semantics`),
/// matching `ino_tag.dart`'s approach of not leaning on Material's own widgets — Flutter's
/// built-in `Checkbox` (even with `tristate: true`) pulls its own Material theming, sizing and
/// ripple defaults that don't track this design system's token set, so this widget draws its own
/// box instead of wrapping it.
///
/// `indeterminate` surfaces through `Semantics.mixed` (Flutter's tri-state semantics flag, the
/// equivalent of web's `aria-checked="mixed"` / RN's `accessibilityState.checked === 'mixed'`)
/// rather than `Semantics.checked`, which stays `null` while indeterminate so a screen reader
/// doesn't announce a false concrete value.
class InoCheckbox extends StatelessWidget {
  final String? label;
  final bool checked;
  final bool indeterminate;
  final bool disabled;
  final bool readonly;
  final bool loading;
  final bool invalid;
  final InoControlSize size;
  final ValueChanged<bool>? onChanged;

  const InoCheckbox({
    super.key,
    this.label,
    this.checked = false,
    this.indeterminate = false,
    this.disabled = false,
    this.readonly = false,
    this.loading = false,
    this.invalid = false,
    this.size = InoControlSize.standard,
    this.onChanged,
  });

  bool get _isInteractive => !disabled && !readonly && !loading;
  bool get _filled => checked || indeterminate;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final boxSize = size.iconSize;

    final box = Container(
      width: boxSize,
      height: boxSize,
      decoration: BoxDecoration(
        // null (not Colors.transparent) — BoxDecoration paints nothing when color is unset,
        // the same "no fill" outcome without a raw colour literal the adherence lint would flag.
        color: _filled ? colors.accent : null,
        borderRadius: BorderRadius.circular(InoRadius.sm),
        border: Border.all(
          color: invalid ? colors.danger : (_filled ? colors.accent : colors.border),
          width: 2,
        ),
      ),
      alignment: Alignment.center,
      child: checked && !indeterminate
          ? Icon(Icons.check, size: boxSize * 0.7, color: colors.onAccent)
          : indeterminate
              ? Container(width: boxSize * 0.5, height: 2, color: colors.onAccent)
              : null,
    );

    final row = Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          box,
          // Static ring, not an animated spinner — same scope call InoTag's RN port already made
          // by shipping no `loading` prop at all; no shared spin-animation primitive exists yet.
          if (loading) ...[
            SizedBox(width: size.gap),
            SizedBox(
              width: boxSize / 2,
              height: boxSize / 2,
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
      checked: indeterminate ? null : checked,
      mixed: indeterminate,
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
