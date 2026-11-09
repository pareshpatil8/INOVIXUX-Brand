import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// One option in the segmented control. `icon` is optional; when provided it renders as a
/// leading widget (icon-only is not ported — see SPEC.md §8).
class InoSelectButtonOption {
  final String label;
  final String value;
  final IconData? icon;
  final bool disabled;

  const InoSelectButtonOption({
    required this.label,
    required this.value,
    this.icon,
    this.disabled = false,
  });
}

/// `InoSelectButton` — Flutter port of `<ino-select-button>`
/// (`web/src/app/components/select-button`, INO-410 / INO-31 B1).
///
/// Scope (SPEC.md §8): segmented button row with single and multiple selection, sm/md/lg sizing,
/// per-option disabled, optional group label, and equal-width mode. Icon-only is not ported (no
/// platform icon system yet). Overlay/bottom-sheet idiom is NOT used — a segmented control is an
/// inline widget on every platform; no overlay is needed or appropriate.
///
/// **Semantics.** Web uses `role="radiogroup"` (single) / `role="group"` (multi). Flutter's
/// [Semantics] has no radiogroup equivalent; each option is a [Semantics] button carrying
/// `selected` for both modes, matching the substitution [InoSelect] and [InoMultiSelect] use for
/// their rows. Pressed/selected/disabled carry over; hover and `:focus-visible` ring are
/// touch-platform concepts and are dropped, same rule [InoButton] states.
class InoSelectButton extends StatelessWidget {
  final List<InoSelectButtonOption> options;
  final String? groupLabel;

  /// Single-select: current value (`''` = none selected).
  final String value;

  /// Multi-select: current selection set.
  final List<String> values;

  final bool multiple;
  final bool disabled;
  final bool equalWidth;

  /// `'sm'` | `'default'` | `'lg'`
  final String size;

  /// Called with the new single value (single-select) or new list (multi-select).
  final ValueChanged<String>? onChanged;
  final ValueChanged<List<String>>? onChangedMulti;

  const InoSelectButton({
    super.key,
    required this.options,
    this.groupLabel,
    this.value = '',
    this.values = const [],
    this.multiple = false,
    this.disabled = false,
    this.equalWidth = false,
    this.size = 'default',
    this.onChanged,
    this.onChangedMulti,
  });

  InoControlSize get _controlSize {
    if (size == 'sm') return InoControlSize.sm;
    if (size == 'lg') return InoControlSize.lg;
    return InoControlSize.standard;
  }

  bool _isSelected(String optionValue) {
    if (multiple) return values.contains(optionValue);
    return value == optionValue;
  }

  void _onTap(BuildContext context, InoSelectButtonOption option) {
    if (disabled || option.disabled) return;
    if (multiple) {
      final next = List<String>.from(values);
      if (next.contains(option.value)) {
        next.remove(option.value);
      } else {
        next.add(option.value);
      }
      onChangedMulti?.call(next);
    } else {
      onChanged?.call(option.value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.inoColors;
    final ctrl = _controlSize;

    Widget group = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < options.length; i++)
          _OptionTile(
            option: options[i],
            selected: _isSelected(options[i].value),
            groupDisabled: disabled,
            ctrl: ctrl,
            palette: p,
            isFirst: i == 0,
            isLast: i == options.length - 1,
            equalWidth: equalWidth,
            onTap: () => _onTap(context, options[i]),
          ),
      ],
    );

    if (equalWidth) {
      group = Row(
        children: [
          for (var i = 0; i < options.length; i++)
            Expanded(
              child: _OptionTile(
                option: options[i],
                selected: _isSelected(options[i].value),
                groupDisabled: disabled,
                ctrl: ctrl,
                palette: p,
                isFirst: i == 0,
                isLast: i == options.length - 1,
                equalWidth: true,
                onTap: () => _onTap(context, options[i]),
              ),
            ),
        ],
      );
    }

    if (groupLabel != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          InoLabel(groupLabel!),
          const SizedBox(height: 4),
          group,
        ],
      );
    }
    return group;
  }
}

class _OptionTile extends StatelessWidget {
  final InoSelectButtonOption option;
  final bool selected;
  final bool groupDisabled;
  final InoControlSize ctrl;
  final InoPalette palette;
  final bool isFirst;
  final bool isLast;
  final bool equalWidth;
  final VoidCallback onTap;

  const _OptionTile({
    required this.option,
    required this.selected,
    required this.groupDisabled,
    required this.ctrl,
    required this.palette,
    required this.isFirst,
    required this.isLast,
    required this.equalWidth,
    required this.onTap,
  });

  bool get _disabled => groupDisabled || option.disabled;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.only(
      topLeft: isFirst ? Radius.circular(InoRadius.md) : Radius.zero,
      bottomLeft: isFirst ? Radius.circular(InoRadius.md) : Radius.zero,
      topRight: isLast ? Radius.circular(InoRadius.md) : Radius.zero,
      bottomRight: isLast ? Radius.circular(InoRadius.md) : Radius.zero,
    );

    final bg = selected ? palette.accent : palette.surfaceRaised;
    final fg = selected ? palette.onAccent : palette.onSurface;
    final borderColor = selected ? palette.accent : palette.border;
    final opacity = _disabled ? 0.6 : 1.0;

    return Semantics(
      button: true,
      selected: selected,
      enabled: !_disabled,
      label: option.label,
      child: Opacity(
        opacity: opacity,
        child: GestureDetector(
          onTap: _disabled ? null : onTap,
          child: Container(
            height: ctrl.height,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: radius,
              border: Border(
                top: BorderSide(color: borderColor),
                bottom: BorderSide(color: borderColor),
                left: BorderSide(color: borderColor, width: isFirst ? 1 : 0.5),
                right: BorderSide(color: borderColor, width: isLast ? 1 : 0.5),
              ),
            ),
            padding: EdgeInsets.symmetric(horizontal: ctrl.paddingInline),
            child: Row(
              mainAxisSize: equalWidth ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (option.icon != null) ...[
                  Icon(option.icon, size: ctrl.iconSize, color: fg),
                  SizedBox(width: ctrl.gap),
                ],
                Text(
                  option.label,
                  style: TextStyle(
                    fontSize: ctrl.fontSize,
                    fontWeight: FontWeight.w500,
                    color: fg,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
