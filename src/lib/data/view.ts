import { partyCode, partyLabel } from "../format";
import type { Candidate, Race } from "../types";
import {
  canonicalDistrict,
  canonicalRaceId,
  houseContestJurisdiction,
  houseContestTitle,
  raceIdAliases,
} from "./at-large";
import { collapseSamePerson, multiFilingNote, type CollapsedCandidate } from "./dedupe";
import { expectedRaceById } from "./expected-races";
import { normalizeFiledName, normalizePersonName } from "./names";

/** Another FEC id for the same person on this race. Party is the code that filing reported. */
export type AlternateFiling = {
  candidateId: string;
  fecCandidateId: string | null;
  partyAffiliation: string | null;
  partyCode: string | null;
  partyLabel: string;
  sourceUrl: string | null;
};

export type PublicCandidate = Candidate & {
  /** Uppercase FEC party code, or null when the filing left it blank. */
  partyCode: string | null;
  /** Readable label for `partyCode`. Not an endorsement. */
  partyLabel: string;
  /** Other FEC ids collapsed into this display row. Empty when this is the only filing. */
  alternateFilings: AlternateFiling[];
  /**
   * Short note when the same name was filed under more than one FEC id.
   * Each party is named once. Null for a single filing.
   */
  multiFilingNote: string | null;
};

type RaceLookup = {
  getRace(raceId: string): Promise<Race | null>;
  listCandidatesForRace(raceId: string): Promise<Candidate[]>;
};

/** Drop placeholder names and normalize casing, party code, and race id. */
export function cleanCandidate(candidate: Candidate): Candidate | null {
  const displayName =
    normalizePersonName(candidate.displayName) ??
    normalizePersonName(candidate.nameAsFiled);
  if (!displayName) return null;
  return {
    ...candidate,
    displayName,
    nameAsFiled: normalizeFiledName(candidate.nameAsFiled),
    partyAffiliation: partyCode(candidate.partyAffiliation),
    raceId: canonicalRaceId(candidate.raceId),
  };
}

export function presentCandidate(
  candidate: Candidate,
  alternates: readonly Candidate[] = alternateRows(candidate),
): PublicCandidate | null {
  const cleaned = cleanCandidate(candidate);
  if (!cleaned) return null;
  const code = partyCode(cleaned.partyAffiliation);
  const alternateFilings = alternates.flatMap((row) => {
    const next = cleanCandidate(row);
    return next ? [toAlternate(next)] : [];
  });
  return {
    ...cleaned,
    partyAffiliation: code,
    partyCode: code,
    partyLabel: partyLabel(code, cleaned.partyLabel),
    alternateFilings,
    multiFilingNote: multiFilingNote(cleaned, alternates.flatMap((row) => {
      const next = cleanCandidate(row);
      return next ? [next] : [];
    })),
  };
}

/** Party labels on a collapsed row, keeper first, each distinct label once. */
export function displayedPartyLabels(candidate: PublicCandidate): string[] {
  const labels = [candidate.partyLabel, ...candidate.alternateFilings.map((row) => row.partyLabel)];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
  }
  return unique;
}

/** Party codes on a collapsed row, keeper first, each distinct code once. */
export function displayedPartyCodes(candidate: PublicCandidate): Array<string | null> {
  const codes = [candidate.partyCode, ...candidate.alternateFilings.map((row) => row.partyCode)];
  const seen = new Set<string>();
  const unique: Array<string | null> = [];
  for (const code of codes) {
    const key = code ?? "";
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(code);
  }
  return unique;
}

/** Rewrite a single-seat House race that was stored under district 01. */
export function presentRace(race: Race): Race {
  if (race.office !== "house" || !race.state || !race.district) {
    const raceId = canonicalRaceId(race.raceId);
    return raceId === race.raceId ? race : { ...race, raceId };
  }
  const district = canonicalDistrict(race.state, race.district) ?? race.district;
  const raceId = canonicalRaceId(race.raceId);
  if (district === race.district && raceId === race.raceId) return race;
  return {
    ...race,
    raceId,
    district,
    title: houseContestTitle(race.state, district),
    jurisdiction: houseContestJurisdiction(race.state, district),
    sourceUrl: rewriteDistrictParam(race.sourceUrl, district),
  };
}

/** One row per canonical race id. A real at-large row wins over a legacy district 01 row. */
export function visibleRaces(races: readonly Race[]): Race[] {
  const best = new Map<string, { presented: Race; original: Race }>();
  for (const race of races) {
    const presented = presentRace(race);
    const current = best.get(presented.raceId);
    if (!current || preferRace(race, current.original)) {
      best.set(presented.raceId, { presented, original: race });
    }
  }
  return [...best.values()]
    .map((item) => item.presented)
    .sort((a, b) => a.raceId.localeCompare(b.raceId));
}

export async function loadVisibleRace(
  repo: Pick<RaceLookup, "getRace">,
  raceId: string,
): Promise<Race | null> {
  const ids = [...new Set([raceId, ...raceIdAliases(raceId)])];
  const rows: Race[] = [];
  for (const id of ids) {
    const row = await repo.getRace(id);
    if (row) rows.push(row);
  }
  if (rows.length === 0) return expectedRaceById(raceId);
  const preferred =
    rows.find((row) => row.district === "00") ??
    rows.find((row) => row.raceId === canonicalRaceId(row.raceId)) ??
    rows[0];
  return preferred ? presentRace(preferred) : null;
}

export async function loadVisibleCandidates(
  repo: Pick<RaceLookup, "listCandidatesForRace">,
  raceId: string,
): Promise<Candidate[]> {
  const ids = raceIdAliases(canonicalRaceId(raceId));
  const groups = await Promise.all(ids.map((id) => repo.listCandidatesForRace(id)));
  const cleaned = groups.flat().flatMap((candidate) => {
    const next = cleanCandidate(candidate);
    return next ? [next] : [];
  });
  return sortByName(collapseSamePerson(cleaned));
}

export async function loadPublicCandidates(
  repo: Pick<RaceLookup, "listCandidatesForRace">,
  raceId: string,
): Promise<PublicCandidate[]> {
  const candidates = await loadVisibleCandidates(repo, raceId);
  return candidates.flatMap((candidate) => {
    const presented = presentCandidate(candidate);
    return presented ? [presented] : [];
  });
}

function preferRace(next: Race, current: Race): boolean {
  const nextFiled = next.empty !== true;
  const currentFiled = current.empty !== true;
  if (nextFiled !== currentFiled) return nextFiled;
  const nextAtLarge = next.district === "00";
  const currentAtLarge = current.district === "00";
  if (nextAtLarge !== currentAtLarge) return nextAtLarge;
  return (next.updatedAt ?? "") > (current.updatedAt ?? "");
}

function sortByName<T extends Candidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => {
    const byName = a.displayName.localeCompare(b.displayName, "en");
    if (byName !== 0) return byName;
    return a.candidateId.localeCompare(b.candidateId);
  });
}

function alternateRows(candidate: Candidate): Candidate[] {
  const extra = (candidate as CollapsedCandidate).alternateFilings;
  if (!Array.isArray(extra)) return [];
  return extra.filter((row) => row && typeof row.candidateId === "string" && typeof row.displayName === "string");
}

function toAlternate(candidate: Candidate): AlternateFiling {
  const code = partyCode(candidate.partyAffiliation);
  return {
    candidateId: candidate.candidateId,
    fecCandidateId: candidate.fecCandidateId,
    partyAffiliation: code,
    partyCode: code,
    partyLabel: partyLabel(code, candidate.partyLabel),
    sourceUrl: candidate.sourceUrl,
  };
}

function rewriteDistrictParam(sourceUrl: string | null, district: string): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    if (url.searchParams.has("district")) url.searchParams.set("district", district);
    return url.toString();
  } catch {
    return sourceUrl;
  }
}
