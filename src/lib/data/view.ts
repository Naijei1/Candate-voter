import { partyCode, partyLabel } from "../format";
import type { Candidate, Race } from "../types";
import {
  canonicalDistrict,
  canonicalRaceId,
  houseContestJurisdiction,
  houseContestTitle,
  raceIdAliases,
} from "./at-large";
import { dedupePresidential } from "./dedupe";
import { normalizeFiledName, normalizePersonName } from "./names";

export type PublicCandidate = Candidate & {
  /** Uppercase FEC party code, or null when the filing left it blank. */
  partyCode: string | null;
  /** Readable label for `partyCode`. Not an endorsement. */
  partyLabel: string;
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

export function presentCandidate(candidate: Candidate): PublicCandidate | null {
  const cleaned = cleanCandidate(candidate);
  if (!cleaned) return null;
  const code = partyCode(cleaned.partyAffiliation);
  return {
    ...cleaned,
    partyAffiliation: code,
    partyCode: code,
    partyLabel: partyLabel(code, cleaned.partyLabel),
  };
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
  if (rows.length === 0) return null;
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
  return sortByName(dedupePresidential(cleaned));
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
  const nextAtLarge = next.district === "00";
  const currentAtLarge = current.district === "00";
  if (nextAtLarge !== currentAtLarge) return nextAtLarge;
  return (next.updatedAt ?? "") > (current.updatedAt ?? "");
}

function sortByName(candidates: readonly Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    const byName = a.displayName.localeCompare(b.displayName, "en");
    if (byName !== 0) return byName;
    return a.candidateId.localeCompare(b.candidateId);
  });
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
