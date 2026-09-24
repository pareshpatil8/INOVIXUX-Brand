import React from 'react';
import { FlatList, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useLinkTo } from '@react-navigation/native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { EmptyState } from '../components/EmptyState';
import { NotificationRow } from '../notifications/NotificationRow';
import { useNotifications } from '../notifications/NotificationCenter';
import { pathFromLink } from '../navigation/linking';
import { space } from '../theme/tokens';

/**
 * List template + Empty-state template (screen inventory row 9).
 *
 * Still renders empty on a fresh launch — there is no backing notification source
 * (docs/brand/13-mobile-app-patterns.md §6.7 items 1 and 4: no transport, no data model). What
 * INO-112 added is the *populated* state: the §6.2 in-row unread marker and the §6.4 category
 * glyph, driven by whatever the notification center holds. The only thing that puts anything in it
 * today is the Settings → Preview push simulator, which is local and lost on restart.
 */
export function NotificationsScreen() {
  const { items, isRead } = useNotifications();
  const linkTo = useLinkTo();

  if (items.length === 0) {
    return (
      <ScreenTemplate title="Notifications" scroll={false}>
        <EmptyState icon={Bell} headline="No notifications yet" body="You're all caught up." />
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate title="Notifications" scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
        contentContainerStyle={{ paddingBottom: space[9] }}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            unread={!isRead(item.id)}
            onPress={item.link ? () => linkTo(pathFromLink(item.link!)) : undefined}
          />
        )}
      />
    </ScreenTemplate>
  );
}
