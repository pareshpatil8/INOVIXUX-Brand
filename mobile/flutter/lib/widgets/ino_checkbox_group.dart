import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_checkbox.dart';

class InoCheckboxOption {
  final String label;
  final String value;
  final bool disabled;

  const InoCheckboxOption({required this.label, required this.value, this.disabled = false});
}

/// `<InoCheckboxGroup>` — Flutter port of `<ino-checkbox-group>` (web/src/app/components/checkbox,
/// INO-158 / INO-31 U-3). A plain `Column` wrapper (Flutter has no `<fieldset>`/`<legend>`
/// equivalent); `Semantics(container: true)` groups the legend/options for assistive tech without
/// claiming a native role Flutter doesn't have, the same trade the RN port's
/// `accessibilityRole="none"` wrapper makes for the same reason.
class InoCheckboxGroup extends StatelessWidget {
  final String? legend;
  final List<InoCheckboxOption> options;
  final List<String> value;
  final InoControlSize size;
  final bool disabled;
  final bool readonly;
  final ValueChanged<List<String>>? onChanged;

  const InoCheckboxGroup({
    super.key,
    this.legend,
    required this.options,
    this.value = const [],
    this.size = InoControlSize.standard,
    this.disabled = false,
    this.readonly = false,
    this.onChanged,
  });

  void _toggle(String optionValue, bool checked) {
    final next =
        checked ? [...value, optionValue] : value.where((v) => v != optionValue).toList();
    onChanged?.call(next);
  }

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
              child: InoCheckbox(
                label: option.label,
                size: size,
                checked: value.contains(option.value),
                disabled: disabled || option.disabled,
                readonly: readonly,
                onChanged: (checked) => _toggle(option.value, checked),
              ),
            ),
        ],
      ),
    );
  }
}
