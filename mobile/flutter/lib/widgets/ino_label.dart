import 'package:flutter/widgets.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `<InoLabel>` — Flutter port of `<ino-label>` (web/src/app/components/label, INO-140 /
/// INO-31 T-19). Presentational only, matching the web component's non-interactive contract
/// (SPEC.md §1): no `onTap`, no focus handling. Flutter has no native `<label for>` concept, so
/// pairing this label with the field it names is left to the caller (e.g. wrapping both in one
/// `Semantics` group), the same way `InoInput`'s own label-less `TextField` leaves label/field
/// association to whichever ancestor composes them.
///
/// Colour aliases (`onSurface`/`onSurfaceMuted`/`onSurfaceSubtle`/`dangerTextSafe`) match the web
/// component's `--ino-color-label*` roles per `form-label-tokens.md` §7 — `InoPalette` has no
/// dedicated `label*` fields by design, since those are pure web-side aliases of roles already
/// ported.
class InoLabel extends StatelessWidget {
  final String text;
  final InoControlSize size;
  final bool required;
  final bool disabled;
  final bool invalid;
  final bool readOnly;

  const InoLabel(
    this.text, {
    super.key,
    this.size = InoControlSize.standard,
    this.required = false,
    this.disabled = false,
    this.invalid = false,
    this.readOnly = false,
  });

  InoTypeLabel get _type {
    if (size == InoControlSize.sm) return InoTypeLabel.labelSm;
    if (size == InoControlSize.lg) return InoTypeLabel.labelLg;
    return InoTypeLabel.label;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final color = disabled
        ? colors.onSurfaceSubtle
        : invalid
            ? colors.dangerTextSafe
            : readOnly
                ? colors.onSurfaceMuted
                : colors.onSurface;
    final type = _type;

    return Text.rich(
      TextSpan(
        text: text,
        style: TextStyle(
          fontSize: type.fontSize,
          height: type.height,
          letterSpacing: type.letterSpacing,
          fontWeight: FontWeight.w500,
          color: color,
        ),
        children: required
            ? [
                // Decorative only (SPEC.md §3) — `semanticsLabel: ''` keeps it out of the
                // accessible name; callers must set the field's own `Semantics(label: ...)`
                // required wording, colour alone never carries meaning (WCAG 1.4.1).
                TextSpan(
                  text: ' *',
                  style: TextStyle(color: colors.dangerTextSafe),
                  semanticsLabel: '',
                ),
              ]
            : null,
      ),
    );
  }
}
