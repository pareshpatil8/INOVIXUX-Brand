import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_radio.dart';

class InoRadioOption {
  final String label;
  final String value;
  final bool disabled;

  const InoRadioOption({required this.label, required this.value, this.disabled = false});
}

/// `<InoRadioGroup>` — Flutter port of `<ino-radio-group>` (web/src/app/components/radio-group,
/// INO-159 / INO-31 U-4). A plain `Column` wrapper (Flutter has no `<fieldset>`/`<legend>`
/// equivalent, same call `InoCheckboxGroup` makes); `Semantics(container: true)` groups the
/// legend/options for assistive tech without claiming a native role Flutter doesn't have.
///
/// Composes `InoRadio` per row and owns the single selected `value`, passing
/// `checked: value == option.value` down — the mobile equivalent of web's shared-`name` native
/// grouping, since Flutter has no platform-level mutual-exclusion primitive to lean on.
class InoRadioGroup extends StatelessWidget {
  final String? legend;
  final List<InoRadioOption> options;
  final String value;
  final InoControlSize size;
  final bool disabled;
  final bool readonly;
  final ValueChanged<String>? onChanged;

  const InoRadioGroup({
    super.key,
    this.legend,
    required this.options,
    this.value = '',
    this.size = InoControlSize.standard,
    this.disabled = false,
    this.readonly = false,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return Semantics(
      container: true,
      label: legend,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (legend != null)
            Padding(
              padding: const EdgeInsets.only(bottom: InoSpace.s1),
              child: Text(
                legend!,
                style: TextStyle(fontWeight: FontWeight.w600, color: colors.onSurface),
              ),
            ),
          for (final option in options)
            Padding(
              padding: const EdgeInsets.only(bottom: InoSpace.s2),
              child: InoRadio(
                label: option.label,
                size: size,
                checked: value == option.value,
                disabled: disabled || option.disabled,
                readonly: readonly,
                onChanged: (checked) {
                  if (checked) onChanged?.call(option.value);
                },
              ),
            ),
        ],
      ),
    );
  }
}
