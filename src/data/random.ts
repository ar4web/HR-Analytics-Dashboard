/**
 * Deterministic pseudo-random helpers.
 *
 * The dashboard's numbers must be stable: the same build has to render the same
 * figures on every reload, and a screenshot taken today has to still explain
 * itself tomorrow. `Math.random()` cannot do that, so every synthetic value in
 * this app comes from a seeded generator instead.
 *
 * The seed is fixed, so the *population* is identical on every run. Only the
 * rolling 12-month window moves (it is anchored to AS_OF_DATE), which is what
 * an HR dashboard is supposed to do.
 */

/** mulberry32 — small, fast, and good enough for demo data. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Random = ReturnType<typeof createRandom>;

/** Integer in [min, max] inclusive. */
export function randInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Picks from a list where each entry carries a relative weight. Used for the
 * distributions the dashboard reports on, so the generator and the charts agree
 * by construction rather than by coincidence.
 */
export function pickWeighted<T>(random: Random, items: readonly { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/**
 * Approximately normal via the sum of three uniforms (Bates distribution),
 * clamped to +/- 3 standard deviations. Used for salary spread: real pay
 * distributions are bell-shaped, not uniform, so a uniform spread would make
 * the salary chart look obviously fake.
 */
export function randNormal(random: Random, mean: number, spread: number): number {
  const u = (random() + random() + random()) / 3;
  const normalised = (u - 0.5) / 0.2887; // rescale to ~N(0,1)
  const clamped = Math.max(-3, Math.min(3, normalised));
  return mean + clamped * spread;
}

/** Fisher-Yates, on a copy. */
export function shuffle<T>(random: Random, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
