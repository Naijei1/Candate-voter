import data from "../../../data/ky-stances.json";

export type Stance = {
  issueId: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type Issue = { id: string; label: string };

const issues = data.issues as Issue[];
const byCandidate = data.candidates as Record<string, Stance[]>;

export function stanceIssues(): Issue[] {
  return issues;
}

export function stancesFor(candidateId: string): Stance[] {
  return byCandidate[candidateId] ?? [];
}

export function stanceCoverage(): { id: string; name: string; count: number }[] {
  return Object.entries(byCandidate).map(([id, rows]) => ({ id, name: id, count: rows.length }));
}

/** Share of selected issues that have a sourced stance. Null when the candidate has no stances at all. */
export function matchScore(candidateId: string, selected: readonly string[]): { enough: boolean; percent: number | null; rows: Array<Stance | { issueId: string; missing: true }> } {
  const rows = stancesFor(candidateId);
  if (rows.length === 0) return { enough: false, percent: null, rows: [] };
  const picked = selected.length > 0 ? selected : issues.map((issue) => issue.id);
  const detail = picked.map((issueId) => rows.find((row) => row.issueId === issueId) ?? { issueId, missing: true as const });
  const hits = detail.filter((row) => !("missing" in row)).length;
  return { enough: true, percent: Math.round((hits / picked.length) * 100), rows: detail };
}
