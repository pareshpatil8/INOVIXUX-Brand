import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'notification_category.dart';
import 'notification_glyphs.dart';
import 'notification_center.dart';

/// Tab-bar badge — docs/brand/13-mobile-app-patterns.md §6.2 row 2, INO-112.
///
/// Dot when the count is unknown, numeral when known, `99+` above 99. Fill `--ino-color-danger`,
/// label `--ino-color-on-danger` (both audited in all three themes), `--ino-radius-pill`,
/// `--ino-type-label-size` (11px) **without** the label token's uppercase tracking — tracking on a
/// 2-character numeral just decentres it.
///
/// The badge sits *inside* the 44px tab target: it is painted as an overlay on the icon via a
/// [Stack] with [Positioned], so it never enlarges the target or displaces the icon+label pair
/// §1 requires. That is the whole reason this is a decoration rather than a row item.
class InoTabBadge extends StatelessWidget {
  /// The tab's own icon. The badge is drawn over its top-right corner.
  final Widget icon;
  final InoBadgeState state;

  const InoTabBadge({super.key, required this.icon, required this.state});

  @override
  Widget build(BuildContext context) {
    if (!state.visible) return icon;
    final colors = context.inoColors;
    final isDot = state.count == null;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        icon,
        Positioned(
          top: -4,
          right: -8,
          child: Semantics(
            // A colour-and-shape-only badge is invisible to a screen reader, so it gets words.
            // §6.2's dot-vs-numeral distinction is preserved in the label, not flattened away.
            label: isDot ? 'Unread notifications' : '${state.label} unread notifications',
            child: Container(
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              padding: isDot
                  ? EdgeInsets.zero
                  : const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              width: isDot ? 8 : null,
              height: isDot ? 8 : null,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: colors.danger,
                borderRadius: BorderRadius.circular(InoRadius.pill),
              ),
              child: isDot
                  ? null
                  : Text(
                      state.label,
                      style: TextStyle(
                        color: colors.onDanger,
                        // --ino-type-label-size, no letterSpacing — see the class doc.
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        height: 1.0,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Notifications list row — §6.2 row 3 (in-row unread marker) + §6.4 (category glyph).
///
/// The unread signal is an 8px (`--ino-space-2`) `--ino-color-accent` dot in the leading slot
/// **plus** the title at body weight rather than muted. Colour is never the only signal — same
/// rule `14-icon-system.md` §3's RAG-dot note sets.
class InoNotificationRow extends StatelessWidget {
  final InoNotification notification;
  final bool unread;
  final VoidCallback? onTap;

  const InoNotificationRow({
    super.key,
    required this.notification,
    required this.unread,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final text = Theme.of(context).textTheme;

    return Material(
      color: colors.surfaceRaised,
      borderRadius: BorderRadius.circular(InoRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(InoRadius.lg),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: inoRowMinHeight),
          padding: const EdgeInsets.symmetric(
            horizontal: InoSpace.s4,
            vertical: InoSpace.s3,
          ),
          decoration: BoxDecoration(
            border: Border.all(color: colors.borderSoft),
            borderRadius: BorderRadius.circular(InoRadius.lg),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Leading slot: the unread dot, or a same-width spacer so read and unread rows
              // keep their text on the same left edge.
              SizedBox(
                width: InoSpace.s2,
                height: InoSpace.s2 * 2,
                child: unread
                    ? Center(
                        child: Semantics(
                          label: 'Unread',
                          child: Container(
                            width: InoSpace.s2,
                            height: InoSpace.s2,
                            decoration: BoxDecoration(
                              color: colors.accent,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: InoSpace.s3),
              Icon(
                notification.category.glyph,
                size: 20,
                color: notification.category.tint(colors),
              ),
              const SizedBox(width: InoSpace.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.title,
                      style: text.bodyMedium?.copyWith(
                        // Second, non-colour unread signal: body weight vs muted.
                        color: unread ? colors.onSurface : colors.onSurfaceMuted,
                        fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (notification.body != null && notification.body!.isNotEmpty)
                      Text(
                        notification.body!,
                        style: text.bodySmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
