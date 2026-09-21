import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Flutter port of `<ino-progress-spinner>` (web/src/app/components/progress-spinner,
/// INO-133 / INO-31 T-21). Presentational only, matching the web component's non-interactive
/// contract: no `onTap`, no focus handling.
///
/// Built directly on the SDK's [CircularProgressIndicator] rather than a hand-rolled painter —
/// unlike the React Native port (no comparable framework-native ring), Flutter's own widget
/// already renders a token-coloured determinate (`value` 0.0-1.0) or indeterminate (`value: null`)
/// ring via `Canvas`, so reimplementing the geometry here would just be redundant risk.
class InoProgressSpinner extends StatelessWidget {
  final InoControlSize size;
  final double? value;
  final bool disabled;
  final bool invalid;
  final String? label;

  const InoProgressSpinner({
    super.key,
    this.size = InoControlSize.standard,
    this.value,
    this.disabled = false,
    this.invalid = false,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final ringColor = invalid ? colors.danger : colors.accent;
    final clamped = value?.clamp(0.0, 1.0);
    final accessibleLabel = label ??
        (clamped != null ? '${(clamped * 100).round()}% complete' : 'Loading');

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Semantics(
        label: invalid ? '$accessibleLabel (error)' : accessibleLabel,
        liveRegion: true,
        value: clamped != null ? '${(clamped * 100).round()}%' : null,
        child: SizedBox(
          width: size.height,
          height: size.height,
          child: CircularProgressIndicator(
            value: clamped,
            strokeWidth: size.height / 5.5,
            strokeCap: StrokeCap.round,
            backgroundColor: colors.borderSoft,
            valueColor: AlwaysStoppedAnimation<Color>(ringColor),
          ),
        ),
      ),
    );
  }
}
