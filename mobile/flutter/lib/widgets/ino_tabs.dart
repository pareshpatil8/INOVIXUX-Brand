import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum InoTabsOrientation { horizontal, vertical }

/// One tab's label metadata in an [InoTabs] strip. Mirrors web's `<ino-tab-panel>` `@Input`s minus its
/// projected panel content: the Flutter port renders the strip only (see the [InoTabs] doc
/// comment) — the panel body is markup a Flutter caller already owns via `IndexedStack`/`switch`.
class InoTabItem {
  final String label;
  final bool disabled;

  const InoTabItem({required this.label, this.disabled = false});
}

/// `InoTabs` — Flutter port of `web/src/app/components/tabs/ino-tabs.component.ts` +
/// `ino-tab-panel.component.ts` (INO-135 / INO-31 T-26). Re-authored, not shared: Flutter has no CSS
/// custom properties, so every value below reads the same [InoControlSize] / [InoSpace] /
/// palette-role names the web component reads, never a literal.
///
/// Scope differences from web, all deliberate:
/// - **Strip only.** This renders the tab strip and reports the active index; the parent renders
///   the content (an `IndexedStack`, a `switch`, a navigator). Web uses content projection
///   (`<ino-tab-panel>` as a real child component), which has no Flutter equivalent worth inventing.
/// - **Controlled only, index-based.** Matches web's `[(activeIndex)]` two-way binding exactly —
///   a Flutter caller already holds `State`, so an internal fallback would be a second source of
///   truth for the active tab.
/// - **No keyboard map / focus ring.** Arrow-key roving tabindex and `:focus-visible` have no touch
///   equivalent; external-keyboard focus is an OS-level highlight. Same states `InoButton` drops,
///   for the same reason — `hover` goes with them.
class InoTabs extends StatelessWidget {
  final List<InoTabItem> items;
  final int activeIndex;
  final ValueChanged<int> onActiveIndexChanged;
  final InoControlSize size;
  final InoTabsOrientation orientation;

  const InoTabs({
    super.key,
    required this.items,
    required this.activeIndex,
    required this.onActiveIndexChanged,
    this.size = InoControlSize.standard,
    this.orientation = InoTabsOrientation.horizontal,
  });

  int get _clampedIndex => items.isEmpty ? 0 : activeIndex.clamp(0, items.length - 1);

  Widget _buildTab(BuildContext context, int index, InoPalette colors) {
    final tab = items[index];
    final isActive = index == _clampedIndex;
    final isVertical = orientation == InoTabsOrientation.vertical;
    final labelColor = isActive ? colors.onSurface : colors.onSurfaceMuted;
    final indicator = BorderSide(width: 2, color: isActive ? colors.accent : colors.surface.withValues(alpha: 0));

    return Semantics(
      selected: isActive,
      enabled: !tab.disabled,
      button: true,
      label: tab.label,
      child: InkWell(
        onTap: tab.disabled || isActive ? null : () => onActiveIndexChanged(index),
        child: AnimatedContainer(
          duration: InoMotion.fast,
          curve: InoMotion.easingStandard,
          constraints: BoxConstraints(minHeight: size.height),
          alignment: isVertical ? Alignment.centerLeft : Alignment.center,
          padding: EdgeInsets.symmetric(horizontal: size.paddingInline),
          decoration: BoxDecoration(
            border: isVertical ? Border(right: indicator) : Border(bottom: indicator),
          ),
          child: Opacity(
            opacity: tab.disabled ? 0.5 : 1,
            child: Text(
              tab.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: labelColor, fontSize: size.fontSize, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final tabs = List.generate(items.length, (i) => _buildTab(context, i, colors));

    if (orientation == InoTabsOrientation.vertical) {
      return Semantics(
        container: true,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(border: Border(right: BorderSide(color: colors.border))),
              child: Padding(
                padding: const EdgeInsets.only(right: InoSpace.s2),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: tabs),
              ),
            ),
          ],
        ),
      );
    }

    return Semantics(
      container: true,
      child: DecoratedBox(
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.border))),
        child: Wrap(spacing: InoSpace.s2, children: tabs),
      ),
    );
  }
}
