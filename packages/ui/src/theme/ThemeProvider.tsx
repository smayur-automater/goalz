import { createTheme, type AgeMode, type ColorScheme, type Theme } from '@goalz/tokens';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, I18nManager, Platform, useColorScheme } from 'react-native';

export type ColorSchemePreference = ColorScheme | 'system';
export type Direction = 'ltr' | 'rtl';

export interface UiTheme extends Theme {
  direction: Direction;
}

const ThemeContext = createContext<UiTheme | null>(null);

export interface ThemeProviderProps {
  /** The user's choice in Settings. 'system' follows the device. */
  colorScheme?: ColorSchemePreference;
  mode?: AgeMode;
  /** Forces the high-contrast palette (Simple mode always uses it). */
  highContrast?: boolean;
  /** Defaults to the native layout direction. On web, also set `dir` on <html>. */
  direction?: Direction;
  children: ReactNode;
}

/** On web the setting can be read synchronously, so the first render already respects it. */
function initialReduceMotion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        // Not available on this platform: keep animations on.
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);
  return reduceMotion;
}

export function ThemeProvider({
  colorScheme = 'system',
  mode = 'standard',
  highContrast = false,
  direction,
  children,
}: ThemeProviderProps) {
  const system = useColorScheme();
  const reduceMotion = useReduceMotion();
  const scheme: ColorScheme =
    colorScheme === 'system' ? (system === 'dark' ? 'dark' : 'light') : colorScheme;
  const dir: Direction = direction ?? (I18nManager.isRTL ? 'rtl' : 'ltr');

  const theme = useMemo<UiTheme>(
    () => ({ ...createTheme({ scheme, mode, highContrast, reduceMotion }), direction: dir }),
    [scheme, mode, highContrast, reduceMotion, dir],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): UiTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return theme;
}
