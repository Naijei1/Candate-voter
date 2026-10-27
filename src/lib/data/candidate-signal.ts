import type { Race } from "../types";

type CandidateSignal = Pick<Race, "empty"> & {
  hasCandidates?: boolean;
  /** Present when a caller already joined the candidate list onto the race. */
  candidates?: readonly unknown[] | null;
};

/**
 * Stored Form 2 race rows count. Empty stubs do not. A joined `candidates: []`
 * does not, even when `empty` was dropped. `hasCandidates: false` does not.
 */
export function raceHasCandidates(race: CandidateSignal | null | undefined): boolean {
  if (!race) return false;
  if (race.hasCandidates === false) return false;
  if (race.empty === true) return false;
  if (Array.isArray(race.candidates) && race.candidates.length === 0) return false;
  return true;
}

/** A contest stub with no stored filing. List rows carry this instead of candidates. */
export function isEmptyRace(race: CandidateSignal): boolean {
  return !raceHasCandidates(race);
}

/** Read-time map signal. Does not write Dynamo. Stubs stay `empty: true`. */
export function signalRace<T extends Race>(race: T): T {
  if (raceHasCandidates(race)) return { ...race, hasCandidates: true };
  return { ...race, empty: true, hasCandidates: false };
}
