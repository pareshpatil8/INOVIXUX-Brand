import React from 'react';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { NotificationProvider } from './src/notifications/NotificationCenter';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <ThemeProvider>
      {/* Outside NavigationContainer (which RootNavigator owns) so notification state survives
          navigation — docs/brand/13-mobile-app-patterns.md §6.2/§6.3, INO-112. */}
      <NotificationProvider>
        <RootNavigator />
      </NotificationProvider>
    </ThemeProvider>
  );
}
