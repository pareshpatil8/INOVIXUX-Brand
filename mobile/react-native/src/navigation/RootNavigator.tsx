import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, type NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, Settings } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ErrorOfflineScreen } from '../screens/ErrorOfflineScreen';
import { useTheme } from '../theme/ThemeProvider';
import { targetComfortable, targetSpacing } from '../theme/tokens';
import { useNotifications } from '../notifications/NotificationCenter';
import { PushBannerHost } from '../notifications/PushBanner';
import { TabBadge } from '../notifications/TabBadge';
import { linking } from './linking';

/**
 * Primary nav = bottom tab bar, 3–5 items, icon + label, ≥44px targets, 8px spacing
 * (docs/brand/13-mobile-app-patterns.md §1). Secondary nav = stack push, not tabs-within-tabs.
 *
 * Tab bar composition per docs/brand/15-mobile-screen-inventory.md §2: Home, [slot 2 — core
 * product surface, name pending, out of this design-system track's scope], Notifications,
 * Settings. Slot 2 intentionally omitted here rather than invented — flagging it in code the
 * same way the spec doc flags it, so it isn't silently guessed into existence.
 */
export type HomeStackParamList = {
  Home: undefined;
  Detail: { id: string; title: string };
  Search: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Detail" component={DetailScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
    </HomeStack.Navigator>
  );
}

/**
 * Settings tab is its own stack, not a bare screen — its "Preview" section (see
 * `SettingsScreen`) pushes the templates that don't have a natural in-app entry point yet
 * (auth/onboarding lives pre-tab-bar, behind a signed-out state this scaffold doesn't model), so
 * every screen in `docs/brand/15-mobile-screen-inventory.md` is a real, running screen rather
 * than just a file on disk.
 */
export type SettingsStackParamList = {
  Settings: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  ErrorOffline: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen name="Onboarding" component={OnboardingScreen} />
      <SettingsStack.Screen name="SignIn" component={SignInScreen} />
      <SettingsStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <SettingsStack.Screen name="ErrorOffline" component={ErrorOfflineScreen} />
    </SettingsStack.Navigator>
  );
}

/**
 * Root tab param list, plus the global augmentation React Navigation reads.
 *
 * Added by INO-112 so `linking.ts`'s `config` is actually type-checked against the real screen
 * names. Without the `declare global` block, `ReactNavigation.RootParamList` is an empty interface
 * and `LinkingOptions` accepts any `screens` object at all — a typo like `Detai: 'home/:id'` would
 * compile and then silently send every Detail deep link to the §6.5 fallback (Home), which is
 * exactly the kind of failure a path grammar shared across three tracks cannot afford to have
 * happen quietly.
 */
export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  NotificationsTab: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const { colors, resolvedScheme } = useTheme();
  const { tabBadge, setOnNotificationsScreen } = useNotifications();

  const navTheme = {
    ...(resolvedScheme !== 'light' ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedScheme !== 'light' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.surface,
      card: colors.surfaceRaised,
      border: colors.border,
      text: colors.onSurface,
      primary: colors.accent,
    },
  };

  return (
    // `linking` (INO-112) wires docs/brand/13-mobile-app-patterns.md §6.5's path grammar and
    // §6.6's parent-chain rule declaratively — see ./linking.ts. React Navigation handles both
    // cold start (`getInitialURL`) and warm start (`Linking` 'url' events) from this one config,
    // which is why this track has no imperative intake code the way Flutter does.
    <NavigationContainer theme={navTheme} linking={linking}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.onSurfaceMuted,
          tabBarStyle: {
            backgroundColor: colors.surfaceRaised,
            borderTopColor: colors.borderSoft,
            minHeight: targetComfortable + targetSpacing,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} /> }}
        />
        <Tab.Screen
          name="NotificationsTab"
          component={NotificationsScreen}
          // §6.2 row 1: "Clear on Notifications-screen view, not on app open." The tab becoming
          // focused *is* the view — the screen itself is kept mounted by the tab navigator, so its
          // own mount effect would fire once at launch and never again.
          listeners={{
            focus: () => setOnNotificationsScreen(true),
            blur: () => setOnNotificationsScreen(false),
          }}
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => (
              <TabBadge
                icon={<Bell color={color} size={size} strokeWidth={2} />}
                state={tabBadge}
              />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStackNavigator}
          options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} /> }}
        />
      </Tab.Navigator>
      {/* Mounted inside the container, above the tabs: the banner must be able to appear over any
          tab without being torn down by navigation, and tapping it resolves its link through
          `useLinkTo`, which needs this context. */}
      <PushBannerHost />
    </NavigationContainer>
  );
}
