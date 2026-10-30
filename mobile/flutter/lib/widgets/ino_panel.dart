import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoPanelSize { sm, md, lg }

double _padding(InoPanelSize size) {
  switch (size) {
    case InoPanelSize.sm:
      return InoControlSize.sm.paddingInlineRoomy;
    case InoPanelSize.md:
      return InoControlSize.standard.paddingInlineRoomy;
    case InoPanelSize.lg:
      return InoControlSize.lg.paddingInlineRoomy;
  }
}

/// `<InoPanel>` — Flutter port of `<ino-panel>` (web/src/app/components/panel, INO-437 /
/// INO-31 B2). Combines `InoFieldset`'s collapsible-toggle logic (`GestureDetector` +
/// `Semantics(button: true, expanded: ...)`) with `InoCard`'s explicit [footer] widget — Flutter
/// has no content-projection equivalent of web's `[ino-panel-footer]`.
///
/// `Semantics(container: true, label: header)` groups the panel for assistive tech without
/// claiming a `region` landmark role Flutter doesn't expose (same call `InoFieldset` makes for
/// its own `group`-less wrapper, SPEC.md §3).
///
/// Unlike web's native toggle `<button disabled>`, [disabled] only dims this widget's own
/// chrome and disables the toggle's `GestureDetector` — [readonly] disables only the toggle
/// (`enabled: false` on its own `Semantics`), same behavior-only treatment `InoFieldset` already
/// uses for the same state.
class InoPanel extends StatelessWidget {
  final String? header;
  final InoPanelSize size;
  final bool collapsible;
  final bool collapsed;
  final bool disabled;
  final bool readonly;
  final bool loading;

  /// Actions bar, same idiom as `InoCard.footer`.
  final Widget? footer;

  final Widget? child;
  final ValueChanged<bool>? onCollapsedChanged;

  const InoPanel({
    super.key,
    this.header,
    this.size = InoPanelSize.md,
    this.collapsible = false,
    this.collapsed = false,
    this.disabled = false,
    this.readonly = false,
    this.loading = false,
    this.footer,
    this.child,
    this.onCollapsedChanged,
  });

  void _toggle() {
    if (disabled || readonly) return;
    onCollapsedChanged?.call(!collapsed);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final expanded = !collapsed;
    final showBody = !collapsible || expanded;
    final padding = _padding(size);

    Widget? headerWidget;
    if (header != null) {
      final text = Text(
        header!,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: disabled ? colors.onSurfaceMuted : colors.onSurface,
        ),
      );
      final bar = collapsible
          ? Semantics(
              button: true,
              enabled: !disabled && !readonly,
              excludeSemantics: disabled,
              child: GestureDetector(
                onTap: _toggle,
                child: Row(
                  children: [
                    AnimatedRotation(
                      turns: expanded ? 0.25 : 0,
                      duration: InoMotion.fast,
                      child: Text('▸', style: TextStyle(fontSize: 11, color: colors.onSurface)),
                    ),
                    const SizedBox(width: InoSpace.s1),
                    text,
                  ],
                ),
              ),
            )
          : text;

      headerWidget = Container(
        padding: EdgeInsets.symmetric(horizontal: padding, vertical: padding),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.borderSoft))),
        child: bar,
      );
    }

    final sections = <Widget>[
      if (headerWidget != null) headerWidget,
      if (showBody)
        Stack(
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: padding, vertical: padding),
              child: Opacity(opacity: loading ? 0.5 : 1, child: child ?? const SizedBox.shrink()),
            ),
            if (loading)
              Positioned.fill(
                child: Center(
                  child: SizedBox(
                    width: InoControlSize.standard.iconSize,
                    height: InoControlSize.standard.iconSize,
                    child: CircularProgressIndicator(strokeWidth: 2, color: colors.onSurfaceMuted),
                  ),
                ),
              ),
          ],
        ),
      if (footer != null)
        Container(
          padding: EdgeInsets.symmetric(horizontal: padding, vertical: padding),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: colors.borderSoft))),
          child: footer,
        ),
    ];

    return Semantics(
      container: true,
      label: header,
      child: Opacity(
        opacity: disabled ? 0.5 : 1,
        child: Container(
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            border: Border.all(color: colors.border),
            borderRadius: BorderRadius.circular(InoRadius.md),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(mainAxisSize: MainAxisSize.min, children: sections),
        ),
      ),
    );
  }
}
