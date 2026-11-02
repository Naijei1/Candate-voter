import type { FinanceDirect, FinanceOutside, TotalsWatermark } from "./model";

export function fromDirectItem(item: Record<string, unknown>): FinanceDirect | null {
  if (item.entityType !== "finance-direct") return null;
  if (item.scope !== "cycle" && item.scope !== "period") return null;
  if (typeof item.candidateId !== "string" || typeof item.cycle !== "number") return null;
  if (typeof item.updatedAt !== "string") return null;
  const label = item.sourceLabel;
  if (label !== "FEC filing" && label !== "FEC candidate totals" && label !== "FEC committee report") return null;
  return {
    scope: item.scope,
    candidateId: item.candidateId,
    raceId: stringOrNull(item.raceId),
    name: stringOrNull(item.name),
    committeeId: stringOrNull(item.committeeId),
    committeeName: stringOrNull(item.committeeName),
    cycle: item.cycle,
    receipts: numberOrNull(item.receipts),
    disbursements: numberOrNull(item.disbursements),
    cashOnHand: numberOrNull(item.cashOnHand),
    debts: numberOrNull(item.debts),
    coverageStart: stringOrNull(item.coverageStart),
    coverageEnd: stringOrNull(item.coverageEnd),
    fileNumber: stringOrNull(item.fileNumber),
    sourceUrl: stringOrNull(item.sourceUrl),
    sourceLabel: label,
    updatedAt: item.updatedAt,
  };
}

export function fromOutsideItem(item: Record<string, unknown>): FinanceOutside | null {
  if (item.entityType !== "finance-outside") return null;
  if (typeof item.candidateId !== "string" || typeof item.committeeId !== "string") return null;
  if (typeof item.cycle !== "number" || typeof item.total !== "number" || typeof item.updatedAt !== "string") return null;
  if (item.support !== "support" && item.support !== "oppose") return null;
  return {
    candidateId: item.candidateId,
    raceId: stringOrNull(item.raceId),
    candidateName: stringOrNull(item.candidateName),
    committeeId: item.committeeId,
    committeeName: stringOrNull(item.committeeName),
    support: item.support,
    cycle: item.cycle,
    total: item.total,
    count: numberOrNull(item.count),
    sourceUrl: stringOrNull(item.sourceUrl),
    sourceLabel: "FEC independent expenditures",
    updatedAt: item.updatedAt,
  };
}

export function fromTotalsWatermark(item: Record<string, unknown>): TotalsWatermark | null {
  if (item.entityType !== "totalsWatermark" || item.source !== "fec-totals") return null;
  const status = item.lastStatus;
  if (status !== "running" && status !== "success" && status !== "partial" && status !== "error") return null;
  if (typeof item.updatedAt !== "string") return null;
  return {
    source: "fec-totals",
    lastRunAt: stringOrNull(item.lastRunAt),
    lastStatus: status,
    lastError: stringOrNull(item.lastError),
    candidatesSeen: numberOrZero(item.candidatesSeen),
    directUpserted: numberOrZero(item.directUpserted),
    periodsUpserted: numberOrZero(item.periodsUpserted),
    outsideUpserted: numberOrZero(item.outsideUpserted),
    cursorCycle: numberOrNull(item.cursorCycle),
    cursorCandidateId: stringOrNull(item.cursorCandidateId),
    updatedAt: item.updatedAt,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
