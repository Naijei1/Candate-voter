import { parseCycle } from "./cycles";

/**
 * Regular Senate class on the ballot in `cycle`.
 * Class I: years ≡ 2 (mod 6) — 2018, 2024, 2030.
 * Class II: years ≡ 4 (mod 6) — 2020, 2026, 2032.
 * Class III: years ≡ 0 (mod 6) — 2022, 2028, 2034.
 * Odd years and out-of-range years have no regular class. A special
 * election is not invented here; a stored race already covers it.
 */
export function regularSenateClass(cycle: number): 1 | 2 | 3 | null {
  if (parseCycle(String(cycle)) == null) return null;
  if (cycle % 6 === 2) return 1;
  if (cycle % 6 === 4) return 2;
  if (cycle % 6 === 0) return 3;
  return null;
}

/**
 * States that hold a seat of this class. Each state has two classes.
 * Membership is the current constitutional assignment (stable since
 * Hawaii and Alaska). Class I and II are 33 seats; Class III is 34.
 */
const CLASS_STATES: Record<1 | 2 | 3, readonly string[]> = {
  1: [
    "AZ", "CA", "CT", "DE", "FL", "HI", "IN", "ME", "MD", "MA",
    "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NJ", "NM", "NY",
    "ND", "OH", "PA", "RI", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
  ],
  2: [
    "AL", "AK", "AR", "CO", "DE", "GA", "ID", "IL", "IA", "KS",
    "KY", "LA", "ME", "MA", "MI", "MN", "MS", "MT", "NE", "NH",
    "NJ", "NM", "NC", "OK", "OR", "RI", "SC", "SD", "TN", "TX",
    "VA", "WV", "WY",
  ],
  3: [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "FL", "GA", "HI",
    "ID", "IL", "IN", "IA", "KS", "KY", "LA", "MD", "MO", "NV",
    "NH", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "SC", "SD",
    "UT", "VT", "WA", "WI",
  ],
};

const CLASS_SETS: Record<1 | 2 | 3, ReadonlySet<string>> = {
  1: new Set(CLASS_STATES[1]),
  2: new Set(CLASS_STATES[2]),
  3: new Set(CLASS_STATES[3]),
};

export function statesInSenateClass(senateClass: 1 | 2 | 3): readonly string[] {
  return CLASS_STATES[senateClass];
}

/** True when `state` has a regular Senate seat on the ballot in `cycle`. */
export function senateSeatUp(state: string, cycle: number): boolean {
  const senateClass = regularSenateClass(cycle);
  if (senateClass == null) return false;
  return CLASS_SETS[senateClass].has(state);
}
