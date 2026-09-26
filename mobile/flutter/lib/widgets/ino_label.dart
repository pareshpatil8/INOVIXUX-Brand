import 'package:flutter/widgets.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Fluid-density form-label type scale (`form-label-tokens.md` §5, `tokens.css` §4b) — mirrors
/// the values RN's `type.label`/`type.labelSm`/`type.labelLg` (`theme/tokens.ts`) already export.
/// `tokens.dart` has no form-label type scale of its own yet (only RN got one in W0-3); adding one
/// there would be a token-registry change outside this issue's merge-hygiene rule (SPEC.md §6), so
/// these are hand-composed literals, the same idiom `ino_tag.dart` already uses for its eyebrow
/// font. Edit `form-label-tokens.md` §3/§5 first if these ever need to change.
class _LabelType {
  const _LabelType(this.fontSize, this.height, this.letterSpacing);
  final double fontSize;
  final double height; // line-height, as a multiple of fontSize (Dart's TextStyle.height unit)
  final double letterSpacing;
}

const _labelTypeSm = _LabelType(12, 1.4, 0.06);
const _labelTypeDefault = _LabelType(14.5, 1.45, 0);
const _labelTypeLg = _LabelType(16, 1.35, -0.16);

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

  _LabelType get _type {
    if (size == InoControlSize.sm) return _labelTypeSm;
    if (size == InoControlSize.lg) return _labelTypeLg;
    return _labelTypeDefault;
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
