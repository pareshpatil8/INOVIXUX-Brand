import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoAccordion` — Flutter port of `<ino-accordion>`. Container for collapsible accordion tabs
/// with mutual-exclusion support (single-expand mode). Spec: doc 26 §5 Phase B2 row
/// `ino-accordion`. See `web/src/app/components/accordion/SPEC.md` §10 for mobile parity scope.
///
/// `multiple` controls expand mode: when `false` (default), opening one tab closes all others;
/// when `true`, any number of tabs can be open simultaneously.
///
/// `size` (compact | comfortable, default comfortable) scales tab header/body padding.
/// `iconPosition` (start | end, default start) controls chevron placement (cascaded to tabs).
/// `disabled` dims the whole accordion and locks all tab toggles.
///
/// **Mobile scope:** Roving tabindex and Arrow-key navigation are omitted (Flutter has no
/// tabindex; mobile is touch-first). Each tab is tappable; focus management is left to the
/// platform.
class InoAccordion extends StatefulWidget {
  final List<InoAccordionTab> children;
  final bool multiple;
  final InoAccordionSize size;
  final InoAccordionIconPosition iconPosition;
  final bool disabled;

  const InoAccordion({
    super.key,
    required this.children,
    this.multiple = false,
    this.size = InoAccordionSize.comfortable,
    this.iconPosition = InoAccordionIconPosition.start,
    this.disabled = false,
  });

  @override
  State<InoAccordion> createState() => _InoAccordionState();
}

class _InoAccordionState extends State<InoAccordion> {
  final Set<int> _expandedIndices = {};

  void _handleTabToggle(int index, bool expanded) {
    setState(() {
      if (expanded) {
        if (!widget.multiple) {
          _expandedIndices.clear();
        }
        _expandedIndices.add(index);
      } else {
        _expandedIndices.remove(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return Opacity(
      opacity: widget.disabled ? 0.5 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: colors.border,
          ),
          borderRadius: BorderRadius.circular(InoRadius.md),
          color: colors.surfaceRaised,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: widget.children.asMap().entries.map((entry) {
            final index = entry.key;
            final child = entry.value;
            return child._copyWith(
              index: index,
              expanded: _expandedIndices.contains(index),
              onToggle: _handleTabToggle,
              size: widget.size,
              iconPosition: widget.iconPosition,
              accordionDisabled: widget.disabled,
            );
          }).toList(),
        ),
      ),
    );
  }
}

enum InoAccordionSize { compact, comfortable }
enum InoAccordionIconPosition { start, end }

/// `InoAccordionTab` — Flutter port of `<ino-accordion-tab>`. Individual collapsible panel
/// within an `InoAccordion`. Not intended for standalone use outside an accordion container.
///
/// `header` is the tab label (required). `disabled` locks this specific tab's toggle
/// (independent of the parent accordion's global `disabled`). `expanded` is the open/closed
/// state; emits `onExpandedChange` on toggle.
///
/// **Mobile scope:** No heading wrapper (Flutter has no heading semantics); uses
/// `GestureDetector` + `Semantics(button: true, expanded: ...)`. No roving tabindex or keyboard
/// navigation (see SPEC.md §10).
class InoAccordionTab extends StatelessWidget {
  final String header;
  final Widget child;
  final bool? expanded;
  final bool disabled;
  final ValueChanged<bool>? onExpandedChange;

  // Internal fields cascaded by parent InoAccordion
  final int? _index;
  final bool? _expanded;
  final void Function(int, bool)? _onToggle;
  final InoAccordionSize? _size;
  final InoAccordionIconPosition? _iconPosition;
  final bool? _accordionDisabled;

  const InoAccordionTab({
    super.key,
    required this.header,
    required this.child,
    this.expanded,
    this.disabled = false,
    this.onExpandedChange,
  })  : _index = null,
        _expanded = null,
        _onToggle = null,
        _size = null,
        _iconPosition = null,
        _accordionDisabled = null;

  const InoAccordionTab._internal({
    required this.header,
    required this.child,
    this.expanded,
    this.disabled = false,
    this.onExpandedChange,
    required int index,
    required bool expandedState,
    required void Function(int, bool) onToggle,
    required InoAccordionSize size,
    required InoAccordionIconPosition iconPosition,
    required bool accordionDisabled,
  })  : _index = index,
        _expanded = expandedState,
        _onToggle = onToggle,
        _size = size,
        _iconPosition = iconPosition,
        _accordionDisabled = accordionDisabled;

  InoAccordionTab _copyWith({
    required int index,
    required bool expanded,
    required void Function(int, bool) onToggle,
    required InoAccordionSize size,
    required InoAccordionIconPosition iconPosition,
    required bool accordionDisabled,
  }) {
    return InoAccordionTab._internal(
      header: header,
      child: child,
      expanded: this.expanded,
      disabled: disabled,
      onExpandedChange: onExpandedChange,
      index: index,
      expandedState: expanded,
      onToggle: onToggle,
      size: size,
      iconPosition: iconPosition,
      accordionDisabled: accordionDisabled,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final isExpanded = _onToggle != null ? (_expanded ?? false) : (expanded ?? false);
    final isDisabled = disabled || (_accordionDisabled ?? false);
    final size = _size ?? InoAccordionSize.comfortable;
    final iconPosition = _iconPosition ?? InoAccordionIconPosition.start;
    final paddingValue = size == InoAccordionSize.compact ? 12.0 : 16.0;
    final chevron = isExpanded ? '▾' : '▸';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          button: true,
          expanded: isExpanded,
          enabled: !isDisabled,
          child: GestureDetector(
            onTap: isDisabled
                ? null
                : () {
                    final nextExpanded = !isExpanded;
                    _onToggle?.call(_index ?? 0, nextExpanded);
                    onExpandedChange?.call(nextExpanded);
                  },
            child: Container(
              padding: EdgeInsets.symmetric(
                vertical: paddingValue,
                horizontal: paddingValue,
              ),
              color: colors.surfaceRaised,
              child: Row(
                children: [
                  if (iconPosition == InoAccordionIconPosition.start)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Text(
                        chevron,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDisabled
                              ? colors.onSurfaceMuted.withOpacity(0.5)
                              : colors.onSurfaceMuted,
                        ),
                      ),
                    ),
                  Expanded(
                    child: Text(
                      header,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDisabled
                            ? colors.onSurfaceMuted
                            : colors.onSurface,
                      ),
                    ),
                  ),
                  if (iconPosition == InoAccordionIconPosition.end)
                    Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: Text(
                        chevron,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDisabled
                              ? colors.onSurfaceMuted.withOpacity(0.5)
                              : colors.onSurfaceMuted,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        if (isExpanded)
          Semantics(
            label: header,
            child: Container(
              padding: EdgeInsets.symmetric(
                vertical: paddingValue,
                horizontal: paddingValue,
              ),
              color: colors.surface,
              child: child,
            ),
          ),
        if (_index != null && _index < ((_onToggle != null) ? 100 : 0))
          Container(
            height: 1,
            color: colors.borderSoft,
          ),
      ],
    );
  }
}
