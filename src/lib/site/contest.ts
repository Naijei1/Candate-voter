import { isBogusAtLargeContest } from "@/lib/data/at-large";
import { appendExpectedRaces, expectedRaceById } from "@/lib/data/expected-races";
import {
  logReadError,
  readCandidatesForRace,
  readCandidate,
  readFilingsForCandidate,
  readRace,
  readRacesForCycle,
  readWatermark,
} from "@/lib/data/read";
import { presentCandidate, type PublicCandidate } from "@/lib/data/view";
import { missingKyBallotCandidates } from "@/lib/site/ky-ballot";
import type { Filing, Race } from "@/lib/types";

/** Kentucky pilot cycle from the October 30, 2026 brief. */
export const PILOT_YEAR = 2026;

export type FilingLoad = {
  races: Race[];
  refreshedAt: string | null;
  /** False when DynamoDB could not be read. Stubs are the ballot structure, not a roster. */
  filingsLoaded: boolean;
};

export async function loadPilotIndex(cycle = PILOT_YEAR): Promise<FilingLoad> {
  try {
    const races = await readRacesForCycle(cycle);
    return { races, refreshedAt: await safeWatermark(), filingsLoaded: true };
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return {
      races: appendExpectedRaces([], [cycle]),
      refreshedAt: null,
      filingsLoaded: false,
    };
  }
}

export type ContestLoad = {
  race: Race | null;
  candidates: PublicCandidate[];
  refreshedAt: string | null;
  filingsLoaded: boolean;
};

export async function loadContest(raceId: string): Promise<ContestLoad> {
  let filingsLoaded = true;
  let race: Race | null = null;
  try {
    race = await readRace(raceId);
  } catch (error) {
    logReadError("getRace", error);
    filingsLoaded = false;
    race = expectedRaceById(raceId);
  }
  if (!race || isBogusAtLargeContest(race)) {
    return { race: null, candidates: [], refreshedAt: null, filingsLoaded };
  }
  if (!filingsLoaded) {
    return { race, candidates: ballotFallback(race.raceId), refreshedAt: null, filingsLoaded: false };
  }
  try {
    const candidates = await readCandidatesForRace(race.raceId);
    return { race, candidates, refreshedAt: await safeWatermark(), filingsLoaded: true };
  } catch (error) {
    logReadError("listCandidatesForRace", error);
    return { race, candidates: ballotFallback(race.raceId), refreshedAt: null, filingsLoaded: false };
  }
}

function ballotFallback(raceId: string): PublicCandidate[] {
  return missingKyBallotCandidates(raceId, new Set()).flatMap((candidate) => {
    const row = presentCandidate(candidate);
    return row ? [row] : [];
  });
}

export type ProfileLoad =
  | {
      ok: true;
      candidate: NonNullable<Awaited<ReturnType<typeof readCandidate>>>;
      race: Race | null;
      filings: Filing[];
    }
  | { ok: false; missing: boolean };

export async function loadProfile(candidateId: string): Promise<ProfileLoad> {
  try {
    const candidate = await readCandidate(candidateId);
    if (!candidate) return { ok: false, missing: true };
    const [race, filings] = await Promise.all([
      readRace(candidate.raceId).catch((error) => {
        logReadError("getRace", error);
        return expectedRaceById(candidate.raceId);
      }),
      readFilingsForCandidate(candidate.candidateId).catch((error) => {
        logReadError("listFilingsForCandidate", error);
        return null;
      }),
    ]);
    if (filings == null) return { ok: false, missing: false };
    return { ok: true, candidate, race, filings };
  } catch (error) {
    logReadError("getCandidate", error);
    return { ok: false, missing: false };
  }
}

async function safeWatermark(): Promise<string | null> {
  try {
    return (await readWatermark())?.updatedAt ?? null;
  } catch (error) {
    logReadError("getWatermark", error);
    return null;
  }
}

export function contestsForState(races: readonly Race[], postal: string): Race[] {
  return races
    .filter(
      (race) =>
        race.state === postal &&
        (race.office === "senate" || race.office === "house") &&
        !isBogusAtLargeContest(race),
    )
    .sort((a, b) => {
      if (a.office !== b.office) return a.office === "senate" ? -1 : 1;
      return a.raceId.localeCompare(b.raceId);
    });
}
