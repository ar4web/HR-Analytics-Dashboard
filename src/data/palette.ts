/**
 * Series colours, in one place.
 *
 * These are deliberately not the brand emerald. A chart's job is to be read
 * accurately, and green/red is the worst possible pairing for that: measured
 * under deuteranopia (the most common form of colour blindness) the emerald and
 * rose used previously sit at dE 19 — close enough to be confused.
 *
 * Values come from the Wong and IBM accessible palettes, and each pairing here
 * was checked with `scripts/verify-theme.py`, which simulates deuteranopia and
 * fails the build's verification step if a pair collapses.
 */

/** The two-series line chart. Blue/orange is the UK government's recommended pairing. */
export const SERIES = {
  hires: '#0ea5e9',
  exits: '#f97316',
} as const;

/** The voluntary/involuntary stacked bars. */
export const ATTRITION_SERIES = {
  voluntary: '#6366f1',
  involuntary: '#f59e0b',
} as const;

/**
 * Nominal categories where there is no inherent order (gender, location, and
 * anything else the user is not meant to read as a scale). Ordered so that
 * adjacent entries are far apart in colour space.
 */
export const CATEGORICAL = [
  '#0072b2',
  '#e69f00',
  '#009e73',
  '#cc79a7',
  '#56b4e9',
  '#d55e00',
  '#785ef0',
  '#f0e442',
] as const;

/** Cycles the categorical palette, so callers can index without bounds checks. */
export function categoricalColor(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length];
}
