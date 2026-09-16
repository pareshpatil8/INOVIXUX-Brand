import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// One tab in an [InoTabs] strip. Mirrors the `@Input`s of web's `<ino-tab-panel>` minus its
/// content: the Flutter port renders the strip only (see the [InoTabs] doc comment).
class InoTabItem {
  final String id;
  final String label;
  final bool disabled;
  final bool closable;
  final bool invalid;
  final bool loading;

  const InoTabItem({
    required this.id,
    required this.label,
    this.disabled = false,
    this.closable = false,
    this.invalid = false,
    this.loading = false,
  });
}

/// `InoTabs` — Flutter port of `<ino-tabs>` (web/src/app/components/tabs, INO-135 / INO-31 T-26).
/// Re-authored, not shared: Flutter has no CSS custom properties, so every value below reads the
/// same [InoControlSize] / [InoRadius] / [InoSpace] / palette-role names the web component reads,
/// never a literal.
///
/// Scope differences from web, all deliberate and all recorded in that component's SPEC.md §9:
/// - **Strip only.** This renders the tab strip and reports which tab is active; the parent renders
///   the content (an `IndexedStack`, a `switch`, a navigator). Web uses content projection, which
///   has no Flutter equivalent worth inventing.
/// - **Controlled only.** No uncontrolled mode: a Flutter caller already holds `State`, so an
///   internal fallback would be a second source of truth for the active tab.
/// - **No keyboard map / focus ring.** Arrow-key roving tabindex and `:focus-visible` have no touch
///   equivalent; external-keyboard focus is an OS-level highlight. Same states [InoButton] drops,
///   for the same reason — `hover` goes with them.
/// - **No scroll buttons under [scrollable].** A touch surface scrolls by dragging.
/// The ✕ *is* a real button here, unlike web (where a control nested inside the tab `<button>`
/// would be invalid HTML and web falls back to the Delete key instead).
class InoTabs extends StatelessWidget {
  final List<InoTabItem> tabs;

  /// Controlled: the parent always owns which tab is active.
  final String activeId;
  final ValueChanged<String> onActiveIdChanged;
  final InoControlSize size;
  final bool scrollable;

  /// Visible but inert: selection and close are both refused. Same contract as web.
  final bool readonly;
  final ValueChanged<String>? onTabClose;

  const InoTabs({
    super.key,
    required this.tabs,
    required this.activeId,
    required this.onActiveIdChanged,
    this.size = InoControlSize.standard,
    this.scrollable = false,
    this.readonly = false,
    this.onTabClose,
  });

  Color _labelColor(InoTabItem tab, InoPalette colors) {
    if (tab.disabled) return colors.onSurfaceSubtle;
    if (tab.invalid) return colors.dangerTextSafe;
    return tab.id == activeId ? colors.onSurface : colors.onSurfaceMuted;
  }

  Widget _buildTab(BuildContext context, InoTabItem tab, InoPalette colors) {
    final isActive = tab.id == activeId;
    final label = _labelColor(tab, colors);
    final inert = tab.disabled || readonly;

    return Semantics(
      selected: isActive,
      enabled: !tab.disabled,
      button: true,
      // No `busy` flag on Flutter's Semantics (unlike aria-busy on web) — `liveRegion` is the
      // closest primitive, announcing the label change when loading flips. Same call InoButton made.
      liveRegion: tab.loading,
      label: tab.closable && !readonly ? '${tab.label}, closable' : tab.label,
      child: InkWell(
        onTap: inert || isActive ? null : () => onActiveIdChanged(tab.id),
        highlightColor: colors.surfaceRaised,
        child: AnimatedContainer(
          duration: InoMotion.base,
          curve: InoMotion.easingStandard,
          constraints: BoxConstraints(minHeight: size.height),
          padding: EdgeInsets.symmetric(horizontal: size.paddingInlineRoomy),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                width: 2,
                color: isActive
                    ? (tab.invalid ? colors.dangerTextSafe : colors.accent)
                    : colors.surface.withValues(alpha: 0),
              ),
            ),
          ),
          child: Opacity(
            opacity: tab.disabled ? 0.5 : 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (tab.loading) ...[
                  SizedBox(
                    width: size.iconSize * 0.7,
                    height: size.iconSize * 0.7,
                    // Reduced motion (disableAnimations is Flutter's prefers-reduced-motion): the
                    // spinning ring becomes a static one — still "busy" by shape, nothing moves.
                    child: MediaQuery.of(context).disableAnimations
                        ? DecoratedBox(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: label, width: 2),
                            ),
                          )
                        : CircularProgressIndicator(strokeWidth: 2, color: label),
                  ),
                  SizedBox(width: size.gap),
                ],
                if (tab.invalid && !tab.loading) ...[
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: colors.dangerTextSafe,
                      shape: BoxShape.circle,
                    ),
                  ),
                  SizedBox(width: size.gap),
                ],
                Text(
                  tab.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: label,
                    fontSize: size.fontSize,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (tab.closable && !readonly) ...[
                  SizedBox(width: size.gap),
                  Semantics(
                    button: true,
                    label: 'Close ${tab.label}',
                    child: InkWell(
                      onTap: () => onTabClose?.call(tab.id),
                      borderRadius: BorderRadius.circular(InoRadius.sm),
                      // Floor the tappable box at the comfortable target even though the glyph is
                      // icon-sized — the same fix web makes with max(icon-size, target-min).
                      child: SizedBox(
                        width: InoTarget.comfortable,
                        height: InoTarget.comfortable,
                        child: Icon(Icons.close, size: size.iconSize, color: colors.onSurfaceMuted),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final children = tabs.map((tab) => _buildTab(context, tab, colors)).toList();
    final border = BoxDecoration(
      border: Border(bottom: BorderSide(width: 1, color: colors.border)),
    );

    return Semantics(
      container: true,
      child: scrollable
          ? Container(
              decoration: border,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(mainAxisSize: MainAxisSize.min, children: children),
              ),
            )
          : Container(
              decoration: border,
              // Non-scrollable mirrors web's default: wrap rather than clip, so a caller who did
              // not opt into `scrollable` never silently loses a tab off-screen.
              child: Wrap(spacing: 0, runSpacing: InoSpace.s1, children: children),
            ),
    );
  }
}
