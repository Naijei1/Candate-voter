import type { Candidate } from "../types";
import { normalizePersonName } from "./names";

/**
 * Stable key for a presidential filer. Same normalized name on the same
 * race only. One-token names are not merged. House and Senate rows are
 * never merged, because a shared name there is weaker evidence.
 */
export function presidentialPersonKey(
  candidate: Pick<Candidate, "office" | "raceId" | "displayName">,
): string | null {
  if (candidate.office !== "president") return null;
  const name = normalizePersonName(candidate.displayName);
  if (!name) return null;
  const tokens = name
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z]/g, ""))
    .filter((token) => token.length >= 2);
  if (tokens.length < 2) return null;
  return `${candidate.raceId}|${tokens.join(" ")}`;
}

/**
 * Collapse presidential rows that are the same person. The keeper is the
 * lexicographically smallest candidate id so the public link stays put.
 */
export function dedupePresidential(candidates: readonly Candidate[]): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  const passthrough: Candidate[] = [];
  for (const candidate of candidates) {
    const key = presidentialPersonKey(candidate);
    if (!key) {
      passthrough.push(candidate);
      continue;
    }
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }
  const kept = [...passthrough];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    const winner = sorted[0];
    if (winner) kept.push(winner);
  }
  return kept;
}

export type PresidentialDuplicatePlan = {
  raceId: string;
  personKey: string;
  keep: string;
  drop: string[];
};

/** Groups that still have more than one stored candidate id. */
export function planPresidentialDuplicates(
  candidates: readonly Candidate[],
): PresidentialDuplicatePlan[] {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const key = presidentialPersonKey(candidate);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }
  const plans: PresidentialDuplicatePlan[] = [];
  for (const [personKey, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    const keep = sorted[0]?.candidateId;
    if (!keep) continue;
    plans.push({
      raceId: sorted[0]?.raceId ?? "",
      personKey,
      keep,
      drop: sorted.slice(1).map((candidate) => candidate.candidateId),
    });
  }
  plans.sort((a, b) => a.personKey.localeCompare(b.personKey));
  return plans;
}
