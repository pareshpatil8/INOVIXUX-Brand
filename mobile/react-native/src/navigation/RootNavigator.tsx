import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, Settings } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { targetComfortable, targetSpacing } from '../theme/tokens';

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
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Detail" component={DetailScreen} />
    </HomeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const { colors, resolvedScheme } = useTheme();

  const navTheme = {
    ...(resolvedScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.surface,
      card: colors.surfaceRaised,
      border: colors.border,
      text: colors.onSurface,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
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
          options={{ title: 'Notifications', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} strokeWidth={2} /> }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
