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

const CLERK = "Official U.S. House photograph";

/** Official Clerk portraits only. Everyone else stays on initials. */
const portraits: Record<string, { src: string; credit: string }> = {
  S6KY00286: { src: "/photos/ky/S6KY00286.jpg", credit: CLERK },
  H6KY01110: { src: "/photos/ky/H6KY01110.jpg", credit: CLERK },
  H8KY02031: { src: "/photos/ky/H8KY02031.jpg", credit: CLERK },
  H2KY03206: { src: "/photos/ky/H2KY03206.jpg", credit: CLERK },
  H0KY05015: { src: "/photos/ky/H0KY05015.jpg", credit: CLERK },
};

export function stanceIssues(): Issue[] {
  return issues;
}

export function portraitFor(candidateId: string): { src: string; credit: string } | null {
  return portraits[candidateId] ?? null;
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
