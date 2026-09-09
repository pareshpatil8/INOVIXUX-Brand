import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorsDark, colorsLight, Palette } from './tokens';

/**
 * Mirrors web/src/app/services/theme.service.ts: default to OS `prefers-color-scheme`
 * (RN: `Appearance.getColorScheme()`), explicit in-app override persisted to platform storage
 * instead of `localStorage` — per docs/brand/13-mobile-app-patterns.md §3.
 */

type ThemeMode = 'system' | 'dark' | 'light';
const STORAGE_KEY = '@inovixux/theme-mode';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedScheme: 'dark' | 'light';
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(mode: ThemeMode, system: ColorSchemeName): 'dark' | 'light' {
  if (mode === 'system') return system === 'light' ? 'light' : 'dark'; // dark is the default, matches tokens.css
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light' || stored === 'system') setModeState(stored);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const resolvedScheme = resolve(mode, systemScheme);
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedScheme,
      colors: resolvedScheme === 'light' ? colorsLight : colorsDark,
      setMode,
    }),
    [mode, resolvedScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within <ThemeProvider>');
  return ctx;
}
