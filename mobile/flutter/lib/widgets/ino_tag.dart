import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoTagSeverity { info, low, medium, high }

const Map<InoTagSeverity, String> _severityLabel = {
  InoTagSeverity.info: 'Info',
  InoTagSeverity.low: 'Low risk',
  InoTagSeverity.medium: 'Medium risk',
  InoTagSeverity.high: 'High risk',
};

/// `<InoTag>` — Flutter port of `<ino-tag>` (web/src/app/components/tag, INO-143 / INO-31 T-12).
/// Presentational only, matching the web component's non-interactive contract: no `onTap`, no
/// focus handling — a removable/tappable tag is a different, not-yet-built component.
///
/// `high -> danger`, `medium -> warning`, `low -> success`, `info -> info` — the mobile palettes
/// (theme/tokens.dart's `InoPalette`) have no risk-* roles, only success/warning/danger/info, so
/// severity maps onto the roles that are actually ported. Same mapping web's `ino-alert` status
/// union already makes; full reasoning in web/src/app/components/tag/SPEC.md §7.
class InoTag extends StatelessWidget {
  final InoTagSeverity severity;
  final String? value;
  final bool rounded;
  final bool dot;
  final bool disabled;

  const InoTag({
    super.key,
    this.severity = InoTagSeverity.info,
    this.value,
    this.rounded = false,
    this.dot = false,
    this.disabled = false,
  });

  (Color, Color) _roleColors(InoPalette colors) {
    switch (severity) {
      case InoTagSeverity.high:
        return (colors.danger, colors.onDanger);
      case InoTagSeverity.medium:
        return (colors.warning, colors.onWarning);
      case InoTagSeverity.low:
        return (colors.success, colors.onSuccess);
      case InoTagSeverity.info:
        return (colors.info, colors.onInfo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final (fill, onFill) = _roleColors(colors);
    final label = value ?? _severityLabel[severity]!;

    if (dot) {
      return Semantics(
        label: label,
        child: Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: fill, shape: BoxShape.circle),
        ),
      );
    }

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Semantics(
        label: label,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: InoSpace.s3, vertical: InoSpace.s1),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(rounded ? InoRadius.pill : InoRadius.sm),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: onFill,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),
    );
  }
}
