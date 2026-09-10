import React from 'react';
import { AlertCircle, WifiOff } from 'lucide-react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { EmptyState } from '../components/EmptyState';

/**
 * Error/offline template — screen inventory row 13. "Reuses the empty-state template rather than
 * inventing a new one" per docs/brand/15-mobile-screen-inventory.md row 13: same `EmptyState`
 * composition as Notifications' empty list, different icon + copy + a retry CTA. Not a standalone
 * nav destination in a real app (it renders inside whichever screen failed to load), but kept as
 * its own pushable screen here — same as the other templates in this scaffold — so it's a real,
 * running component rather than a code comment. Reachable from Settings → Preview.
 */
export function ErrorOfflineScreen({
  navigation,
  offline = true,
}: {
  navigation: { goBack: () => void };
  offline?: boolean;
}) {
  return (
    <ScreenTemplate scroll={false}>
      <EmptyState
        icon={offline ? WifiOff : AlertCircle}
        headline={offline ? "You're offline" : 'Something went wrong'}
        body={offline ? 'Check your connection and try again.' : "We couldn't load this. Try again in a moment."}
        ctaLabel="Retry"
        onPressCta={() => navigation.goBack()}
      />
    </ScreenTemplate>
  );
}
