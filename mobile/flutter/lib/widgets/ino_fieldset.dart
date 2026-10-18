import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoFieldsetSize { sm, md, lg }

double _padding(InoFieldsetSize size) {
  switch (size) {
    case InoFieldsetSize.sm:
      return InoControlSize.sm.paddingInlineRoomy;
    case InoFieldsetSize.md:
      return InoControlSize.standard.paddingInlineRoomy;
    case InoFieldsetSize.lg:
      return InoControlSize.lg.paddingInlineRoomy;
  }
}

/// `<InoFieldset>` — Flutter port of `<ino-fieldset>` (web/src/app/components/fieldset, INO-439 /
/// INO-31 B2). A plain `Container`/`Column` wrapper (Flutter has no `<fieldset>`/`<legend>`
/// equivalent, same call `InoRadioGroup`/`InoCheckboxGroup` make); `Semantics(container: true,
/// label: legend)` groups the legend/content for assistive tech without claiming a native role
/// Flutter doesn't have.
///
/// When [collapsible], the legend row is a `GestureDetector` wrapped in
/// `Semantics(button: true, expanded: ..., enabled: !readonly)`, mirroring the web disclosure
/// pattern's `aria-expanded`/toggle-only-readonly shape (SPEC.md §3 — no readonly semantic exists
/// on the group itself, only on the toggle).
///
/// Unlike web's native `<fieldset disabled>`, Flutter has no cascade: [disabled] only dims this
/// widget's own chrome. Each child owns its own `disabled`, same limitation `InoRadioGroup`/
/// `InoCheckboxGroup` already document for their own `disabled`.
class InoFieldset extends StatelessWidget {
  final String? legend;
  final InoFieldsetSize size;
  final bool collapsible;
  final bool collapsed;
  final bool disabled;
  final bool readonly;
  final bool loading;
  final String? error;
  final Widget? child;
  final ValueChanged<bool>? onCollapsedChanged;

  const InoFieldset({
    super.key,
    this.legend,
    this.size = InoFieldsetSize.md,
    this.collapsible = false,
    this.collapsed = false,
    this.disabled = false,
    this.readonly = false,
    this.loading = false,
    this.error,
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
    final showContent = !collapsible || expanded;

    final legendWidget = legend == null
        ? null
        : collapsible
            ? Semantics(
                button: true,
                enabled: !disabled,
                excludeSemantics: disabled || readonly,
                child: GestureDetector(
                  onTap: _toggle,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedRotation(
                        turns: expanded ? 0.25 : 0,
                        duration: InoMotion.fast,
                        child: Text('▸', style: TextStyle(fontSize: 11, color: colors.onSurface)),
                      ),
                      const SizedBox(width: InoSpace.s1),
                      Text(
                        legend!,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: disabled ? colors.onSurfaceMuted : colors.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            : Text(
                legend!,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: disabled ? colors.onSurfaceMuted : colors.onSurface,
                ),
              );

    return Semantics(
      container: true,
      label: legend,
      child: Opacity(
        opacity: disabled ? 0.5 : 1,
        child: Container(
          padding: EdgeInsets.all(_padding(size)),
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            border: Border.all(color: error != null ? colors.danger : colors.border),
            borderRadius: BorderRadius.circular(InoRadius.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (legendWidget != null) legendWidget,
              if (showContent)
                Padding(
                  padding: EdgeInsets.only(top: legendWidget != null ? InoSpace.s2 : 0),
                  child: Opacity(
                    opacity: loading ? 0.5 : 1,
                    child: child ?? const SizedBox.shrink(),
                  ),
                ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: InoSpace.s2),
                  child: Text(
                    error!,
                    style: TextStyle(fontWeight: FontWeight.w600, color: colors.danger),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
