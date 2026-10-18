import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// One crumb in the trail.
class InoBreadcrumbItem {
  final String label;
  final String? icon;
  final bool disabled;

  const InoBreadcrumbItem({required this.label, this.icon, this.disabled = false});
}

/// `InoBreadcrumb` — Flutter port of `<ino-breadcrumb>`
/// (web/src/app/components/breadcrumb, INO-429 / INO-31 B2).
///
/// Scope (SPEC.md §10): icons, per-item `disabled`, the current-page item (always the last entry,
/// never tappable), and collapsed-middle overflow. Two deliberate reinterpretations:
///
/// - **No popover.** Neither mobile toolkit treats an anchored popover as the idiomatic way to
///   reveal a handful of hidden strings on a small screen. Tapping the `…` here expands the
///   hidden items inline, in place of the ellipsis, instead of opening an overlay.
/// - **No Angular Router.** There is no `href`/`routerLink` equivalent — the host app owns
///   navigation and is handed the raw item via [onItemTap], the same plain-callback contract
///   `InoSelectButton`'s port already uses in place of a specific navigation library.
///
/// **Semantics.** Web uses `nav[aria-label]` + `ol`/`li` + `aria-current="page"`. Flutter's
/// [Semantics] has no equivalent roles; each navigable crumb is `Semantics(button: true)`, the
/// current crumb plain `Text` wrapped in [ExcludeSemantics] (nothing to announce beyond its own
/// text, which the surrounding row already exposes), and the separator is [ExcludeSemantics] too
/// — the same decorative-content treatment [InoDivider]'s unlabelled line uses for `aria-hidden`.
///
/// `readonly` and `loading` are web-only — see SPEC.md §10.
class InoBreadcrumb extends StatefulWidget {
  final List<InoBreadcrumbItem> items;

  /// Collapses the middle of the trail behind a `…` once `items.length` exceeds this and a hard
  /// floor of 3 — same rule the web component's SPEC.md §3 documents. `0` (default) never
  /// collapses.
  final int maxVisible;

  /// Renders every non-current crumb as inert text; the current-page item is unaffected.
  final bool readonly;

  final ValueChanged<InoBreadcrumbItem>? onItemTap;

  const InoBreadcrumb({
    super.key,
    required this.items,
    this.maxVisible = 0,
    this.readonly = false,
    this.onItemTap,
  });

  @override
  State<InoBreadcrumb> createState() => _InoBreadcrumbState();
}

class _InoBreadcrumbState extends State<InoBreadcrumb> {
  bool _expanded = false;

  bool _isNavigable(InoBreadcrumbItem item, bool isCurrent) =>
      !isCurrent && !item.disabled && !widget.readonly;

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return const SizedBox.shrink();
    }

    final colors = context.inoColors;
    const ctrl = InoControlSize.standard;
    final lastIndex = widget.items.length - 1;
    final isCollapsed = !_expanded &&
        widget.maxVisible > 0 &&
        widget.items.length > widget.maxVisible &&
        widget.items.length > 3;

    final entries = isCollapsed
        ? [
            (item: widget.items[0], isCurrent: false),
            (item: widget.items[lastIndex - 1], isCurrent: false),
            (item: widget.items[lastIndex], isCurrent: true),
          ]
        : [
            for (var i = 0; i <= lastIndex; i++) (item: widget.items[i], isCurrent: i == lastIndex),
          ];

    Widget separator() => ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: InoSpace.s1),
            child: Text('/', style: TextStyle(color: colors.onSurfaceMuted, fontSize: ctrl.fontSize)),
          ),
        );

    Widget crumb(InoBreadcrumbItem item, bool isCurrent) {
      final navigable = _isNavigable(item, isCurrent);
      final textColor =
          isCurrent ? colors.onSurface : navigable ? colors.onSurfaceMuted : colors.onSurfaceSubtle;

      final content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (item.icon != null)
            ExcludeSemantics(
              child: Padding(
                padding: const EdgeInsets.only(right: InoSpace.s1),
                child: Text(item.icon!, style: TextStyle(fontSize: ctrl.iconSize, color: textColor)),
              ),
            ),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(
              item.label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: ctrl.fontSize,
                color: textColor,
                fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        ],
      );

      if (!navigable) {
        return ExcludeSemantics(child: content);
      }

      return Semantics(
        button: true,
        label: item.label,
        child: GestureDetector(
          onTap: () => widget.onItemTap?.call(item),
          child: content,
        ),
      );
    }

    final children = <Widget>[];
    for (var i = 0; i < entries.length; i++) {
      if (i > 0) {
        children.add(separator());
        if (isCollapsed && i == 1) {
          children.add(Semantics(
            button: true,
            label: 'Show hidden breadcrumb items',
            child: GestureDetector(
              onTap: () => setState(() => _expanded = true),
              child: Text('…', style: TextStyle(fontSize: ctrl.fontSize, color: colors.onSurfaceMuted)),
            ),
          ));
          children.add(separator());
        }
      }
      children.add(crumb(entries[i].item, entries[i].isCurrent));
    }

    return Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: children);
  }
}
