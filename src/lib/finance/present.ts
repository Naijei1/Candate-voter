import { coverageKey, type FinanceDirect, type FinanceOutside } from "./model";

/**
 * Cycle view shows FEC cycle totals only.
 * A coverage window shows matching report periods when they exist, otherwise
 * cycle rows for that window. Period dollars are never returned beside the
 * cycle total for the same view. Outside spending is cycle-scoped, so a
 * coverage filter does not include it.
 */
export function selectDirect(rows: readonly FinanceDirect[], coverage: string | null): FinanceDirect[] {
  const cycleRows = rows.filter((row) => row.scope === "cycle");
  if (!coverage) return dedupe(cycleRows);
  const periods = rows.filter(
    (row) => row.scope === "period" && coverageKey(row.coverageStart, row.coverageEnd) === coverage,
  );
  if (periods.length > 0) return dedupe(periods);
  return dedupe(cycleRows.filter((row) => coverageKey(row.coverageStart, row.coverageEnd) === coverage));
}

export function selectOutside(rows: readonly FinanceOutside[], coverage: string | null): FinanceOutside[] {
  if (coverage) return [];
  return [...rows];
}

export function coverageChoices(rows: readonly FinanceDirect[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const key = coverageKey(row.coverageStart, row.coverageEnd);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

function dedupe(rows: readonly FinanceDirect[]): FinanceDirect[] {
  const kept = new Map<string, FinanceDirect>();
  for (const row of rows) {
    const key = `${row.scope}#${row.candidateId}#${row.committeeId ?? ""}#${coverageKey(row.coverageStart, row.coverageEnd) ?? ""}`;
    const current = kept.get(key);
    if (!current || (row.fileNumber ?? "") > (current.fileNumber ?? "")) kept.set(key, row);
  }
  return [...kept.values()];
}
