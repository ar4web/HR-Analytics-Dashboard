import { createContext, useContext } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark' | 'contrast';
export type ResolvedTheme = 'light' | 'dark' | 'contrast';
export type Density = 'compact' | 'comfortable' | 'executive';
export type Direction = 'ltr' | 'rtl';

export const APPEARANCE_STORAGE_KEY = 'hr-dash:appearance';

export interface AppearanceState {
  theme: ThemeChoice;
  density: Density;
  direction: Direction;
}

export const DEFAULT_APPEARANCE: AppearanceState = {
  theme: 'system',
  density: 'comfortable',
  direction: 'ltr',
};

export interface AppearanceContextValue extends AppearanceState {
  /** What `system` currently resolves to — never 'system'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
  setDensity: (density: Density) => void;
  setDirection: (direction: Direction) => void;
  reset: () => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark', 'contrast'];
const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'executive'];
const DIRECTIONS: readonly Direction[] = ['ltr', 'rtl'];

/** Reads the persisted appearance, falling back per-field so a partial or
 *  hand-edited value can never put the UI into an unsupported state. */
export function readStoredAppearance(): AppearanceState {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearanceState>;
    return {
      theme: THEMES.includes(parsed.theme as ThemeChoice) ? (parsed.theme as ThemeChoice) : DEFAULT_APPEARANCE.theme,
      density: DENSITIES.includes(parsed.density as Density) ? (parsed.density as Density) : DEFAULT_APPEARANCE.density,
      direction: DIRECTIONS.includes(parsed.direction as Direction) ? (parsed.direction as Direction) : DEFAULT_APPEARANCE.direction,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside <ThemeProvider>');
  return context;
}
