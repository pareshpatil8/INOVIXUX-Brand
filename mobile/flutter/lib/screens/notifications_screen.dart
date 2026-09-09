import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../widgets/empty_state.dart';
import '../widgets/screen_template.dart';

/// List template + Empty-state template (screen inventory row 9). Rendered empty by default —
/// no backing notification source yet; real data wiring is product/backend work, out of this
/// branding/design-system track's scope (same boundary noted for tab slot 2).
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ScreenTemplate(
      title: 'Notifications',
      scroll: false,
      child: EmptyState(
        icon: LucideIcons.bell,
        headline: 'No notifications yet',
        body: "You're all caught up.",
      ),
    );
  }
}
