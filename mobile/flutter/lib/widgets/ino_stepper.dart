import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// One step's data for [InoStepper] — the rail-only mobile analog of `<ino-step>`.
class InoStepperStep {
  final String id;
  final String label;
  final String? description;
  final bool disabled;
  final bool invalid;
  final bool loading;
  final bool completed;

  const InoStepperStep({
    required this.id,
    required this.label,
    this.description,
    this.disabled = false,
    this.invalid = false,
    this.loading = false,
    this.completed = false,
  });
}

enum InoStepperOrientation { horizontal, vertical }

/// `InoStepper` — Flutter port of `web/src/app/components/stepper/ino-stepper.component.ts`
/// (INO-136). Re-authored, not shared: Flutter has no CSS custom properties, so every value below
/// reads the same [InoControlSize] / [InoRadius] / palette-role names the web component reads,
/// never a literal.
///
/// Rail only, controlled only — the parent owns [activeId] and each step's `completed` flag, and
/// renders per-step content with the platform's own idiom (full reasoning: SPEC.md §9). Dropped
/// web states with no touch-platform meaning: hover, the `:focus-visible` ring, and the keyboard
/// map — same drop `InoButton`'s Flutter port documents. `:active` (pressed), `loading`,
/// `disabled` and `invalid` all carry over.
class InoStepper extends StatelessWidget {
  final List<InoStepperStep> steps;
  final String activeId;
  final ValueChanged<String> onActiveIdChanged;
  final InoControlSize size;
  final InoStepperOrientation orientation;
  final bool linear;
  final bool readonly;

  const InoStepper({
    super.key,
    required this.steps,
    required this.activeId,
    required this.onActiveIdChanged,
    this.size = InoControlSize.standard,
    this.orientation = InoStepperOrientation.horizontal,
    this.linear = true,
    this.readonly = false,
  });

  bool _isReachable(int index) {
    if (!linear) return true;
    for (var i = 0; i < index; i++) {
      if (!steps[i].completed) return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final vertical = orientation == InoStepperOrientation.vertical;
    final children = <Widget>[];

    for (var i = 0; i < steps.length; i++) {
      final step = steps[i];
      final active = step.id == activeId;
      final reachable = _isReachable(i);
      final locked = !reachable || readonly;
      final isDisabled = step.disabled || (locked && !active);

      if (i > 0) {
        final filled = steps[i - 1].completed;
        final indicatorHalf = size.iconSize / 2;
        children.add(vertical
            ? Padding(
                padding: EdgeInsets.only(left: indicatorHalf),
                child: Container(width: 2, height: InoSpace.s7, color: filled ? colors.accent : colors.border),
              )
            : Expanded(child: Container(height: 2, color: filled ? colors.accent : colors.border)));
      }

      final indicatorBorder = step.invalid
          ? colors.dangerTextSafe
          : (active || step.completed)
              ? colors.accent
              : step.disabled
                  ? colors.onSurfaceSubtle
                  : colors.border;
      final indicatorText = step.completed
          ? colors.onAccent
          : step.invalid
              ? colors.dangerTextSafe
              : active
                  ? colors.accent
                  : step.disabled
                      ? colors.onSurfaceSubtle
                      : colors.onSurfaceMuted;
      final labelColor = active
          ? colors.onSurface
          : step.invalid
              ? colors.dangerTextSafe
              : step.disabled
                  ? colors.onSurfaceSubtle
                  : colors.onSurfaceMuted;

      final indicator = Container(
        width: size.iconSize,
        height: size.iconSize,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: step.completed ? colors.accent : colors.surface.withValues(alpha: 0),
          border: Border.all(color: indicatorBorder, width: 2),
        ),
        child: step.loading
            ? SizedBox(
                width: size.iconSize * 0.6,
                height: size.iconSize * 0.6,
                child: CircularProgressIndicator(strokeWidth: 2, color: indicatorText),
              )
            : Text(
                step.completed ? '✓' : '${i + 1}',
                style: TextStyle(color: indicatorText, fontSize: size.fontSize * 0.7, fontWeight: FontWeight.w600),
              ),
      );

      final text = Column(
        crossAxisAlignment: vertical ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(step.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: labelColor, fontSize: size.fontSize, fontWeight: FontWeight.w600)),
          if (step.description != null)
            Text(step.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: colors.onSurfaceMuted, fontSize: size.fontSize * 0.8)),
        ],
      );

      final stepWidget = Semantics(
        button: true,
        enabled: !isDisabled,
        selected: active,
        liveRegion: step.loading,
        label: '${step.label}, step ${i + 1} of ${steps.length}',
        child: GestureDetector(
          onTap: isDisabled || active ? null : () => onActiveIdChanged(step.id),
          child: Padding(
            padding: const EdgeInsets.all(InoSpace.s1),
            child: vertical
                ? Row(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    indicator,
                    SizedBox(width: size.gap),
                    Flexible(child: text),
                  ])
                : Column(mainAxisSize: MainAxisSize.min, children: [
                    indicator,
                    SizedBox(height: size.gap),
                    text,
                  ]),
          ),
        ),
      );

      children.add(vertical ? stepWidget : Flexible(child: stepWidget));
    }

    return vertical
        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)
        : Row(crossAxisAlignment: CrossAxisAlignment.start, children: children);
  }
}
