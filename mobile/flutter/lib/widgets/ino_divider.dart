import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoDividerOrientation { horizontal, vertical }

enum InoDividerThickness { hairline, thick }

/// `InoDivider` — Flutter port of `<ino-divider>`
/// (web/src/app/components/divider, INO-441 / INO-31 B2). A line that groups or separates
/// content; no interactive state (doc 26 §5 row: `St: n/a`).
///
/// `label` only renders in [InoDividerOrientation.horizontal] — same contract the web component's
/// SPEC.md §1 documents; passing one with [InoDividerOrientation.vertical] is silently ignored.
///
/// `thickness` reads [InoBorderWidth.hairline]/[InoBorderWidth.thick] (tokens.css §6b), not a
/// density-repointed value — a divider's line weight is a deliberate visual choice, not a
/// control-comfort trade-off (web SPEC.md §3).
///
/// Unlabelled dividers carry no `Semantics` — a bare rule has nothing useful to announce beyond
/// the divider itself. A labelled divider exposes the label as its `Semantics.label`.
class InoDivider extends StatelessWidget {
  final InoDividerOrientation orientation;
  final InoDividerThickness thickness;
  final String? label;

  const InoDivider({
    super.key,
    this.orientation = InoDividerOrientation.horizontal,
    this.thickness = InoDividerThickness.hairline,
    this.label,
  });

  double get _thickness =>
      thickness == InoDividerThickness.thick ? InoBorderWidth.thick : InoBorderWidth.hairline;

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final isVertical = orientation == InoDividerOrientation.vertical;
    final showLabel = !isVertical && label != null && label!.isNotEmpty;

    Widget line() => isVertical
        ? Container(width: _thickness, color: colors.border)
        : Container(height: _thickness, color: colors.border);

    final content = showLabel
        ? Row(
            children: [
              Expanded(child: line()),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: InoSpace.s3),
                child: Text(
                  label!,
                  style: TextStyle(color: colors.onSurfaceMuted, fontSize: 12.5),
                ),
              ),
              Expanded(child: line()),
            ],
          )
        : line();

    return showLabel
        ? Semantics(label: label, child: content)
        : ExcludeSemantics(child: content);
  }
}
