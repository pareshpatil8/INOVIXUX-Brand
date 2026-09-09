import React from 'react';
import { Bell } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { EmptyState } from '../components/EmptyState';

/**
 * List template + Empty-state template (screen inventory row 9). Rendered empty by default here
 * since there's no backing notification source yet — real data wiring is product/backend work,
 * out of this branding/design-system track's scope (same boundary noted for tab slot 2).
 */
export function NotificationsScreen() {
  return (
    <ScreenTemplate title="Notifications" scroll={false}>
      <EmptyState icon={Bell} headline="No notifications yet" body="You're all caught up." />
    </ScreenTemplate>
  );
}
