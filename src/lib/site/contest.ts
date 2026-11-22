import { cache } from "react";
import type { CandidateResponse, FilingsResponse, RaceListResponse, RaceResponse } from "@/lib/api/v1-types";
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
import { isKentuckyFederalRaceId } from "@/lib/site/ky-race-id";
import type { Race } from "@/lib/types";

/** Kentucky pilot cycle from the October 30, 2026 brief. */
export const PILOT_YEAR = 2026;

export type FilingLoad = Pick<RaceListResponse, "races" | "refreshedAt"> & {
  /** False when DynamoDB could not be read. Stubs are the ballot structure, not a roster. */
  filingsLoaded: boolean;
};

export async function loadPilotIndex(cycle = PILOT_YEAR): Promise<FilingLoad> {
  try {
    const [races, refreshedAt] = await Promise.all([readRacesForCycle(cycle), safeWatermark()]);
    return { races, refreshedAt, filingsLoaded: true };
  } catch {
    return {
      races: appendExpectedRaces([], [cycle]),
      refreshedAt: null,
      filingsLoaded: false,
    };
  }
}

export type ContestLoad = Pick<RaceResponse, "candidates" | "refreshedAt"> & {
  race: RaceResponse["race"] | null;
  filingsLoaded: boolean;
};

export const loadContest = cache(async (raceId: string): Promise<ContestLoad> => {
  if (!isKentuckyFederalRaceId(raceId)) return { race: null, candidates: [], refreshedAt: null, filingsLoaded: true };
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
    const [candidates, refreshedAt] = await Promise.all([readCandidatesForRace(race.raceId), safeWatermark()]);
    return { race, candidates, refreshedAt, filingsLoaded: true };
  } catch {
    return { race, candidates: ballotFallback(race.raceId), refreshedAt: null, filingsLoaded: false };
  }
});

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
      race: CandidateResponse["race"];
      filings: FilingsResponse["filings"];
    }
  | { ok: false; missing: boolean };

export const loadProfile = cache(async (candidateId: string): Promise<ProfileLoad> => {
  try {
    const candidate = await readCandidate(candidateId);
    if (!candidate || !isKentuckyFederalRaceId(candidate.raceId)) return { ok: false, missing: true };
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
});

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
