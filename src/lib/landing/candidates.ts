"use server";

import { displayedPartyLabels } from "@/lib/data/view";
import { logReadError, readCandidatesForRace } from "@/lib/data/read";
import { parseRaceIds } from "@/lib/landing";

export type CandidatePreview = {
  candidateId: string;
  displayName: string;
  partyAffiliation: string | null;
  partyCode: string | null;
  /** Stored label when the filing has one; otherwise the FEC code map or the raw code. */
  partyLabel: string;
  /** Distinct affiliation labels, keeper first. */
  partyLabels: string[];
  multiFilingNote: string | null;
  /** Other FEC ids already collapsed into this row. The keeper is not included. */
  alternateFilingCount: number;
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
            partyCode: candidate.partyCode,
            partyLabel: candidate.partyLabel,
            partyLabels: displayedPartyLabels(candidate),
            multiFilingNote: candidate.multiFilingNote,
            alternateFilingCount: candidate.alternateFilings.length,
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
