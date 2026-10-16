import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  AppearanceContext,
  DEFAULT_APPEARANCE,
  readStoredAppearance,
  systemPrefersDark,
  type AppearanceContextValue,
  type AppearanceState,
  type Density,
  type Direction,
  type ResolvedTheme,
  type ThemeChoice,
} from './appearance';

/**
 * Owns the three appearance axes and mirrors them onto <html> as data attributes.
 *
 * The attributes are the contract: all styling keys off `[data-theme]`,
 * `[data-density]` and `dir`, so no component needs to know which theme is
 * active. `index.html` applies the stored values before first paint to avoid a
 * flash of the wrong theme; this provider keeps them in sync afterwards.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppearanceState>(readStoredAppearance);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track the OS preference so "system" stays live without a reload.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    state.theme === 'system' ? (systemDark ? 'dark' : 'light') : state.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = state.theme;
    root.dataset.density = state.density;
    root.dir = state.direction;
    root.lang = state.direction === 'rtl' ? 'ar' : 'en';
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / storage disabled — the app still works, the preference just won't persist */
    }
  }, [resolvedTheme, state]);

  const setTheme = useCallback((theme: ThemeChoice) => setState((s) => ({ ...s, theme })), []);
  const setDensity = useCallback((density: Density) => setState((s) => ({ ...s, density })), []);
  const setDirection = useCallback((direction: Direction) => setState((s) => ({ ...s, direction })), []);
  const reset = useCallback(() => setState(DEFAULT_APPEARANCE), []);

  const value = useMemo<AppearanceContextValue>(
    () => ({ ...state, resolvedTheme, setTheme, setDensity, setDirection, reset }),
    [state, resolvedTheme, setTheme, setDensity, setDirection, reset],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
