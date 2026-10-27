"use server";

import { linkPersonFilings, type PersonFiling } from "@/lib/data/person-filings";
import { displayedPartyLabels, type PublicCandidate } from "@/lib/data/view";
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
  /** Same person across contests. The row is not removed when this list is long. */
  filings: PersonFiling[];
  /** True when any filing in `filings` is a write-in (W or WRI). */
  writeIn: boolean;
  /** True when `filings` lists more than one FEC id or contest. */
  multiFiling: boolean;
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

  const loaded = await Promise.all(
    parsed.ids.map(async (raceId) => {
      try {
        const candidates = await readCandidatesForRace(raceId);
        return { raceId, candidates };
      } catch (error) {
        logReadError("listCandidatesForRace", error);
        return { raceId, error: true as const };
      }
    }),
  );
  const linked = linkPersonFilings(
    loaded.flatMap((group) => ("error" in group ? [] : group.candidates)),
  );
  const byId = new Map(linked.map((row) => [row.candidateId, row]));
  const races: RaceCandidateGroup[] = loaded.map((group) => {
    if ("error" in group) return { raceId: group.raceId, error: true };
    return {
      raceId: group.raceId,
      candidates: group.candidates.map((candidate) =>
        toPreview(byId.get(candidate.candidateId) ?? candidate),
      ),
    };
  });

  return { ok: true, races };
}

function toPreview(candidate: PublicCandidate): CandidatePreview {
  return {
    candidateId: candidate.candidateId,
    displayName: candidate.displayName,
    partyAffiliation: candidate.partyAffiliation,
    partyCode: candidate.partyCode,
    partyLabel: candidate.partyLabel,
    partyLabels: displayedPartyLabels(candidate),
    multiFilingNote: candidate.multiFilingNote,
    alternateFilingCount: candidate.alternateFilings.length,
    filings: candidate.filings,
    writeIn: candidate.writeIn,
    multiFiling: candidate.multiFiling,
    sourceUrl: candidate.sourceUrl,
    updatedAt: candidate.updatedAt,
  };
}
