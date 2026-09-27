import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoStepperOrientation { horizontal, vertical }

/// One step's header metadata in an [InoStepper] rail. Mirrors web's `<ino-step>` `@Input`s minus
/// its projected panel content — the Flutter port renders the rail only (see [InoStepper] doc
/// comment). `completed` mirrors the internal flag web's `<ino-stepper>` derives from its own
/// `furthestIndex` tracking; since this port is controlled-only, the parent (which already owns
/// `activeIndex`) supplies it directly instead of the port re-deriving a second source of truth.
class InoStepperItem {
  final String label;
  final bool disabled;
  final bool completed;

  const InoStepperItem({required this.label, this.disabled = false, this.completed = false});
}

/// `InoStepper` — Flutter port of `web/src/app/components/stepper/ino-stepper.component.ts` +
/// `ino-step.component.ts` (INO-136 / INO-31 T-27). Re-authored, not shared: Flutter has no CSS
/// custom properties, so every value below reads the same [InoControlSize] / [InoSpace] /
/// palette-role names the web component reads, never a literal.
///
/// Scope differences from web, all deliberate — same class of omission `InoTabs`' Flutter port
/// documents for the sibling container/leaf component:
/// - **Rail only.** This renders the step rail and reports the active index; the parent renders
///   the panel content. Web uses content projection (`<ino-step>` as a real child component),
///   which has no Flutter equivalent worth inventing.
/// - **Controlled only, index-based.** Matches web's `[(activeIndex)]` two-way binding exactly —
///   a Flutter caller already holds `State`, so an internal fallback would be a second source of
///   truth for the active step. `linear` only gates header taps here (`onActiveIndexChanged` is
///   never called for an unreachable step); the caller's own `next()`/`previous()` equivalent is
///   just incrementing `activeIndex`, same as web's `next()`/`previous()` bypass `isReachable()`.
/// - **No keyboard map / focus ring.** Arrow-key roving tabindex and `:focus-visible` have no touch
///   equivalent; external-keyboard focus is an OS-level highlight.
class InoStepper extends StatelessWidget {
  final List<InoStepperItem> items;
  final int activeIndex;
  final ValueChanged<int> onActiveIndexChanged;
  final InoControlSize size;
  final InoStepperOrientation orientation;
  final bool linear;

  const InoStepper({
    super.key,
    required this.items,
    required this.activeIndex,
    required this.onActiveIndexChanged,
    this.size = InoControlSize.standard,
    this.orientation = InoStepperOrientation.horizontal,
    this.linear = true,
  });

  int get _clampedIndex => items.isEmpty ? 0 : activeIndex.clamp(0, items.length - 1);

  bool _isReachable(int index) {
    if (items[index].disabled) return false;
    return linear ? index <= _clampedIndex || items[index].completed : true;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final vertical = orientation == InoStepperOrientation.vertical;
    final children = <Widget>[];

    for (var i = 0; i < items.length; i++) {
      if (i > 0) {
        children.add(vertical
            ? Padding(
                padding: EdgeInsets.only(left: size.iconSize / 2 - 0.5),
                child: Container(width: 1, height: InoSpace.s6, color: colors.border),
              )
            : Flexible(
                fit: FlexFit.loose,
                child: Container(
                  height: 1,
                  constraints: const BoxConstraints(minWidth: 20),
                  color: colors.border,
                ),
              ));
      }
      children.add(_buildStep(context, i, colors, vertical));
    }

    return Semantics(
      container: true,
      child: vertical
          ? Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: children)
          : Row(children: children),
    );
  }

  Widget _buildStep(BuildContext context, int index, InoPalette colors, bool vertical) {
    final step = items[index];
    final isActive = index == _clampedIndex;
    final reachable = _isReachable(index);

    final Color badgeBackground;
    final Color badgeBorder;
    final Color badgeText;
    if (step.completed) {
      badgeBackground = colors.accentSecondary;
      badgeBorder = colors.accentSecondary;
      badgeText = colors.onAccent;
    } else if (isActive) {
      badgeBackground = colors.accent;
      badgeBorder = colors.accent;
      badgeText = colors.onAccent;
    } else {
      badgeBackground = colors.surface.withValues(alpha: 0);
      badgeBorder = colors.border;
      badgeText = colors.onSurfaceMuted;
    }
    final labelColor = isActive || step.completed ? colors.onSurface : colors.onSurfaceMuted;

    final badge = Container(
      width: size.iconSize,
      height: size.iconSize,
      alignment: Alignment.center,
      decoration: BoxDecoration(shape: BoxShape.circle, color: badgeBackground, border: Border.all(color: badgeBorder)),
      child: step.completed && !isActive
          ? Icon(Icons.check, size: size.iconSize * 0.6, color: badgeText)
          : Text('${index + 1}', style: TextStyle(color: badgeText, fontSize: size.fontSize * 0.75, fontWeight: FontWeight.w600)),
    );

    final label = Text(
      step.label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(color: labelColor, fontSize: size.fontSize, fontWeight: FontWeight.w600),
    );

    final content = Opacity(
      opacity: step.disabled ? 0.5 : 1,
      child: Padding(
        padding: const EdgeInsets.all(InoSpace.s2),
        child: vertical
            ? Row(mainAxisSize: MainAxisSize.min, children: [badge, SizedBox(width: size.gap), label])
            : Column(mainAxisSize: MainAxisSize.min, children: [badge, SizedBox(height: size.gap), label]),
      ),
    );

    final stepWidget = Semantics(
      selected: isActive,
      enabled: reachable,
      button: true,
      label: '${step.label}, step ${index + 1} of ${items.length}',
      child: InkWell(
        onTap: !reachable || isActive ? null : () => onActiveIndexChanged(index),
        child: content,
      ),
    );

    return vertical ? stepWidget : Flexible(child: stepWidget);
  }
}
