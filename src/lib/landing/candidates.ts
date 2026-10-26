"use server";

import { logReadError, readCandidatesForRace } from "@/lib/data/read";
import { parseRaceIds } from "@/lib/landing";

export type CandidatePreview = {
  candidateId: string;
  displayName: string;
  partyAffiliation: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
};

export type RaceCandidateGroup =
  | { raceId: string; candidates: CandidatePreview[] }
  | { raceId: string; error: true };

export type RaceCandidatesResult =
  | { ok: true; races: RaceCandidateGroup[] }
  | { ok: false; error: string };

/** Candidates for the state panel. Names stay alphabetical. Party is not a sort. */
export async function loadCandidatesForRaces(
  raceIds: string[],
): Promise<RaceCandidatesResult> {
  const parsed = parseRaceIds(raceIds);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const races = await Promise.all(
    parsed.ids.map(async (raceId): Promise<RaceCandidateGroup> => {
      try {
        const candidates = await readCandidatesForRace(raceId);
        return {
          raceId,
          candidates: candidates.map((candidate) => ({
            candidateId: candidate.candidateId,
            displayName: candidate.displayName,
            partyAffiliation: candidate.partyAffiliation,
            sourceUrl: candidate.sourceUrl,
            updatedAt: candidate.updatedAt,
          })),
        };
      } catch (error) {
        logReadError("listCandidatesForRace", error);
        return { raceId, error: true };
      }
    }),
  );

  return { ok: true, races };
}
