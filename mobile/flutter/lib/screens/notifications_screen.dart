import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../navigation/ino_router.dart';
import '../notifications/notification_center.dart';
import '../notifications/notification_widgets.dart';
import '../theme/tokens.dart';
import '../widgets/empty_state.dart';
import '../widgets/screen_template.dart';

/// List template + Empty-state template (screen inventory row 9).
///
/// Still renders empty on a fresh launch — there is no backing notification source (§6.7 items 1
/// and 4: no transport, no data model). What INO-112 added is the *populated* state: the §6.2
/// in-row unread marker and the §6.4 category glyph, driven by whatever
/// [InoNotificationCenter.items] holds. The only thing that puts anything in it today is the
/// Settings → Preview push simulator, which is local and lost on restart.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final center = InoNotificationCenter.instance;

    return ScreenTemplate(
      title: 'Notifications',
      scroll: false,
      child: AnimatedBuilder(
        animation: center,
        builder: (context, _) {
          final items = center.items;
          if (items.isEmpty) {
            return const EmptyState(
              icon: LucideIcons.bell,
              headline: 'No notifications yet',
              body: "You're all caught up.",
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: InoSpace.s2),
            itemBuilder: (context, i) {
              final item = items[i];
              return InoNotificationRow(
                notification: item,
                unread: !center.isRead(item),
                onTap: item.target == null ? null : () => InoRouter.open(item.target!),
              );
            },
          );
        },
      ),
    );
  }
}
