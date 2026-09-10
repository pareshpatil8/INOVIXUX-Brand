import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../widgets/empty_state.dart';
import '../widgets/screen_template.dart';

/// Error/offline template — screen inventory row 13. "Reuses the empty-state template rather
/// than inventing a new one" per docs/brand/15-mobile-screen-inventory.md row 13: same
/// [EmptyState] composition as Notifications' empty list, different icon + copy + a retry CTA.
/// Not a standalone nav destination in a real app (it renders inside whichever screen failed to
/// load), but kept as its own pushable screen here — same as the other templates in this
/// scaffold — so it's a real, running widget rather than a code comment. Reachable from
/// Settings → Developer preview.
class ErrorOfflineScreen extends StatelessWidget {
  final bool offline;

  const ErrorOfflineScreen({super.key, this.offline = true});

  @override
  Widget build(BuildContext context) {
    return ScreenTemplate(
      scroll: false,
      child: EmptyState(
        icon: offline ? LucideIcons.wifiOff : LucideIcons.alertCircle,
        headline: offline ? "You're offline" : 'Something went wrong',
        body: offline
            ? 'Check your connection and try again.'
            : "We couldn't load this. Try again in a moment.",
        ctaLabel: 'Retry',
        onPressCta: () => Navigator.of(context).maybePop(),
      ),
    );
  }
}
