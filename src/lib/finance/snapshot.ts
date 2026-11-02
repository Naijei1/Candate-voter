import snapshot from "@/content/fec/2026-senate-ky-finance.json";
import { normalizePersonName } from "../data/names";
import type { FinanceDirect, FinanceOutside } from "./model";

export const FINANCE_SNAPSHOT_CYCLE = snapshot.cycle;
export const FINANCE_SNAPSHOT_RACE = snapshot.raceId;
export const FINANCE_SNAPSHOT_RETRIEVED_AT = snapshot.retrievedAt;

export function snapshotFinance(): { direct: FinanceDirect[]; outside: FinanceOutside[] } {
  const updatedAt = snapshot.retrievedAt;
  const direct: FinanceDirect[] = snapshot.direct.flatMap((row) => {
    const supportLabel = row.sourceLabel === "FEC filing" ? "FEC filing" : "FEC candidate totals";
    return [
      {
        scope: "cycle" as const,
        candidateId: row.candidateId,
        raceId: snapshot.raceId,
        name: normalizePersonName(row.name),
        committeeId: row.committeeId,
        committeeName: row.committeeName,
        cycle: snapshot.cycle,
        receipts: amount(row.receipts),
        disbursements: amount(row.disbursements),
        cashOnHand: amount(row.cashOnHand),
        debts: amount(row.debts),
        coverageStart: row.coverageStart,
        coverageEnd: row.coverageEnd,
        fileNumber: null,
        sourceUrl: row.sourceUrl,
        sourceLabel: supportLabel,
        updatedAt,
      },
    ];
  });
  const outside: FinanceOutside[] = snapshot.outside.flatMap((row) => {
    if (row.support !== "support" && row.support !== "oppose") return [];
    if (!row.committeeId) return [];
    const total = amount(row.total);
    if (total == null) return [];
    return [
      {
        candidateId: row.candidateId,
        raceId: snapshot.raceId,
        candidateName: normalizePersonName(row.candidateName),
        committeeId: row.committeeId,
        committeeName: row.committeeName,
        support: row.support,
        cycle: snapshot.cycle,
        total,
        count: amount(row.count),
        sourceUrl: row.sourceUrl,
        sourceLabel: "FEC independent expenditures" as const,
        updatedAt,
      },
    ];
  });
  return { direct, outside };
}

function amount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
