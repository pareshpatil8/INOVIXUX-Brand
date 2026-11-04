import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoBadge` — Flutter port of `web/src/app/components/badge/ino-badge.component.ts`
/// (INO-460). Re-authored, not shared: Flutter has no CSS custom properties, so every value below
/// reads the same theme-role names the web component reads, never a literal.
///
/// Three usage modes per doc 26 §5:
/// 1. **Dot** — simple presence indicator (e.g. unread marker, online status)
/// 2. **Count** — numeric badge with 99+ overflow for counts ≥ 100
/// 3. **Status** — labeled status indicator with severity colors
///
/// Can be used standalone or positioned on a child element. For positioned mode, pass
/// `positioned: true` — the badge will use absolute positioning via a [Positioned] widget
/// (unlike web's :host-context() detection, Flutter requires explicit prop).
enum InoBadgeVariant { dot, count, status }

enum InoBadgeSize { sm, md }

enum InoBadgeSeverity { info, success, warning, danger }

class InoBadge extends StatelessWidget {
  final InoBadgeVariant variant;
  final InoBadgeSize size;
  final InoBadgeSeverity severity;

  /// Numeric value for `count` variant. Displays "99+" when value ≥ 100. Ignored for dot/status.
  final int? value;

  /// Status label text for `status` variant. Ignored for dot/count.
  final String? label;

  /// Required for `count` variant; optional for `dot` (makes it informative vs decorative);
  /// ignored for `status` (visible label is already accessible).
  final String? semanticLabel;

  /// When true, wraps the badge in a [Positioned] widget anchored to top-end corner. Parent must
  /// be a [Stack] with positioned children. Set false for standalone/inline usage.
  final bool positioned;

  const InoBadge({
    super.key,
    this.variant = InoBadgeVariant.count,
    this.size = InoBadgeSize.md,
    this.severity = InoBadgeSeverity.info,
    this.value,
    this.label,
    this.semanticLabel,
    this.positioned = false,
  });

  /// Display count with 99+ overflow logic.
  String get _displayValue {
    if (variant != InoBadgeVariant.count || value == null) return '';
    return value! >= 100 ? '99+' : value.toString();
  }

  /// Background color for each variant.
  Color _backgroundColor(InoPalette colors) {
    if (variant == InoBadgeVariant.dot || variant == InoBadgeVariant.count) {
      return colors.accent;
    }
    // Status variant uses severity colors directly. Web uses color-mix for a tinted surface
    // (12% severity + 88% surface), but Flutter doesn't have an equivalent built-in color-blend
    // function, so we use the full severity color for now.
    switch (severity) {
      case InoBadgeSeverity.success:
        return colors.success;
      case InoBadgeSeverity.warning:
        return colors.warning;
      case InoBadgeSeverity.danger:
        return colors.danger;
      case InoBadgeSeverity.info:
        return colors.info;
    }
  }

  /// Text color for count and status variants.
  Color _textColor(InoPalette colors) {
    if (variant == InoBadgeVariant.count) {
      return colors.onAccent;
    }
    // Status variant uses on-{severity} colors for text on severity-colored backgrounds.
    // Web uses a tinted background + severity text; mobile uses full severity background + on-severity text.
    switch (severity) {
      case InoBadgeSeverity.success:
        return colors.onSuccess;
      case InoBadgeSeverity.warning:
        return colors.onWarning;
      case InoBadgeSeverity.danger:
        return colors.onDanger;
      case InoBadgeSeverity.info:
        return colors.onInfo;
    }
  }

  /// Size-specific dimensions for each variant.
  _BadgeSize get _sizeSpec {
    switch (variant) {
      case InoBadgeVariant.dot:
        return size == InoBadgeSize.sm
            ? const _BadgeSize(width: 8, height: 8)
            : const _BadgeSize(width: 10, height: 10);
      case InoBadgeVariant.count:
        return size == InoBadgeSize.sm
            ? const _BadgeSize(height: 16, minWidth: 16, paddingHorizontal: 4, fontSize: 11)
            : const _BadgeSize(height: 20, minWidth: 20, paddingHorizontal: 6, fontSize: 13);
      case InoBadgeVariant.status:
        return size == InoBadgeSize.sm
            ? const _BadgeSize(height: 20, paddingHorizontal: 6, fontSize: 11)
            : const _BadgeSize(height: 24, paddingHorizontal: 8, fontSize: 13);
    }
  }

  Widget _buildBadgeContent(InoPalette colors) {
    final sizeSpec = _sizeSpec;

    if (variant == InoBadgeVariant.dot) {
      return Container(
        width: sizeSpec.width,
        height: sizeSpec.height,
        decoration: BoxDecoration(
          color: _backgroundColor(colors),
          shape: BoxShape.circle,
        ),
      );
    }

    if (variant == InoBadgeVariant.count) {
      return Container(
        height: sizeSpec.height,
        constraints: BoxConstraints(minWidth: sizeSpec.minWidth ?? 0),
        padding: EdgeInsets.symmetric(horizontal: sizeSpec.paddingHorizontal ?? 0),
        decoration: BoxDecoration(
          color: _backgroundColor(colors),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Center(
          child: ExcludeSemantics(
            child: Text(
              _displayValue,
              style: TextStyle(
                color: _textColor(colors),
                fontSize: sizeSpec.fontSize,
                fontWeight: FontWeight.w600,
                height: 1.0,
              ),
            ),
          ),
        ),
      );
    }

    // Status variant
    return Container(
      height: sizeSpec.height,
      padding: EdgeInsets.symmetric(horizontal: sizeSpec.paddingHorizontal ?? 0),
      decoration: BoxDecoration(
        color: _backgroundColor(colors),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          label ?? '',
          style: TextStyle(
            color: _textColor(colors),
            fontSize: sizeSpec.fontSize,
            fontWeight: FontWeight.w600,
            height: 1.0,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;

    // Accessibility semantics
    final String? effectiveLabel = variant == InoBadgeVariant.status
        ? null // Status has visible text, no extra label needed
        : variant == InoBadgeVariant.count
            ? semanticLabel ?? (value != null ? value.toString() : null)
            : semanticLabel;

    final bool hideFromSemantics = variant == InoBadgeVariant.dot && semanticLabel == null;

    Widget badge = Semantics(
      label: effectiveLabel,
      excludeSemantics: hideFromSemantics,
      child: _buildBadgeContent(colors),
    );

    if (positioned) {
      // Positioned mode: anchor to top-end corner of parent Stack
      // Transform to move badge 50% beyond parent boundary (matching web's translate(50%, -50%))
      return Positioned(
        top: 0,
        right: 0,
        child: Transform.translate(
          offset: const Offset(4, -4), // Approximate 50% of typical badge size
          child: badge,
        ),
      );
    }

    return badge;
  }
}

/// Size specification for badge dimensions.
class _BadgeSize {
  final double? width;
  final double height;
  final double? minWidth;
  final double? paddingHorizontal;
  final double? fontSize;

  const _BadgeSize({
    this.width,
    required this.height,
    this.minWidth,
    this.paddingHorizontal,
    this.fontSize,
  });
}
