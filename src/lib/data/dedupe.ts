import type { Candidate } from "../types";
import { partyCode, partyLabel } from "../format";
import { normalizePersonName } from "./names";

/**
 * Same normalized name on the same race. One-token names are not merged.
 * The race id already includes office, cycle, and jurisdiction, so two
 * people who only share a surname in different contests stay separate.
 */
export function samePersonKey(
  candidate: Pick<Candidate, "raceId" | "displayName">,
): string | null {
  const tokens = personTokens(candidate.displayName);
  if (!tokens) return null;
  return `${candidate.raceId}|${tokens}`;
}

/**
 * Presidential filers only. Ingest still reuses one candidate id for a
 * repeated presidential name. Senate and House duplicates are collapsed
 * on read so each FEC id's party stays on its own stored row.
 */
export function presidentialPersonKey(
  candidate: Pick<Candidate, "office" | "raceId" | "displayName">,
): string | null {
  if (candidate.office !== "president") return null;
  return samePersonKey(candidate);
}

export type CollapsedCandidate = Candidate & {
  /** Other stored rows for this name on this race. Empty when there is one filing. */
  alternateFilings: Candidate[];
};

/**
 * One display row per person on a race. The keeper is the latest FEC load
 * timestamp, then the lexicographically smallest candidate id.
 */
export function collapseSamePerson(candidates: readonly Candidate[]): CollapsedCandidate[] {
  const groups = new Map<string, Candidate[]>();
  const passthrough: CollapsedCandidate[] = [];
  for (const candidate of candidates) {
    const key = samePersonKey(candidate);
    if (!key) {
      passthrough.push({ ...candidate, alternateFilings: [] });
      continue;
    }
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }
  const kept = [...passthrough];
  for (const group of groups.values()) {
    const keeper = pickKeeper(group);
    const alternateFilings = group
      .filter((candidate) => candidate.candidateId !== keeper.candidateId)
      .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    kept.push({ ...keeper, alternateFilings });
  }
  return kept;
}

/** @deprecated Use collapseSamePerson. Presidential rows are included there. */
export function dedupePresidential(candidates: readonly Candidate[]): Candidate[] {
  return collapseSamePerson(candidates);
}

export type SamePersonDuplicatePlan = {
  raceId: string;
  personKey: string;
  keep: string;
  drop: string[];
};

export type PresidentialDuplicatePlan = SamePersonDuplicatePlan;

/** Groups that still have more than one stored candidate id. */
export function planSamePersonDuplicates(
  candidates: readonly Candidate[],
): SamePersonDuplicatePlan[] {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const key = samePersonKey(candidate);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }
  const plans: SamePersonDuplicatePlan[] = [];
  for (const [personKey, group] of groups) {
    if (group.length < 2) continue;
    const keeper = pickKeeper(group);
    plans.push({
      raceId: keeper.raceId,
      personKey,
      keep: keeper.candidateId,
      drop: group
        .filter((candidate) => candidate.candidateId !== keeper.candidateId)
        .map((candidate) => candidate.candidateId)
        .sort((a, b) => a.localeCompare(b)),
    });
  }
  plans.sort((a, b) => a.personKey.localeCompare(b.personKey));
  return plans;
}

export function planPresidentialDuplicates(
  candidates: readonly Candidate[],
): PresidentialDuplicatePlan[] {
  return planSamePersonDuplicates(candidates.filter((candidate) => candidate.office === "president"));
}

/**
 * One line for a collapsed row. Each party is named once. Every FEC id in
 * the group is listed so a citation can point at the filing that reported it.
 */
export function multiFilingNote(keeper: Candidate, alternates: readonly Candidate[]): string | null {
  if (alternates.length === 0) return null;
  const byParty = new Map<string, string[]>();
  for (const row of [keeper, ...alternates]) {
    const label = partyLabel(partyCode(row.partyAffiliation), row.partyLabel);
    const id = row.fecCandidateId?.trim() || row.candidateId;
    const list = byParty.get(label) ?? [];
    if (!list.includes(id)) list.push(id);
    byParty.set(label, list);
  }
  const parts = [...byParty.entries()].map(([label, ids]) => `${label} (${ids.join(", ")})`);
  if (byParty.size > 1) {
    return `Parties filed under multiple FEC ids: ${parts.join("; ")}.`;
  }
  return `Filed under multiple FEC ids: ${parts.join("; ")}.`;
}

function pickKeeper(group: readonly Candidate[]): Candidate {
  return [...group].sort((a, b) => {
    const byLoad = (b.sourceLoadedAt ?? "").localeCompare(a.sourceLoadedAt ?? "");
    if (byLoad !== 0) return byLoad;
    return a.candidateId.localeCompare(b.candidateId);
  })[0] as Candidate;
}

function personTokens(displayName: string): string | null {
  const name = normalizePersonName(displayName);
  if (!name) return null;
  const tokens = name
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z]/g, ""))
    .filter((token) => token.length >= 2);
  if (tokens.length < 2) return null;
  return tokens.join(" ");
}
