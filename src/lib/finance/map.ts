import {
  candidateTotalsUrl,
  fecImagePdf,
  scheduleEUrl,
  type FinanceDirect,
  type FinanceOutside,
} from "./model";

export type FinanceContext = {
  raceId: string | null;
  name: string | null;
  committeeId: string | null;
  committeeName: string | null;
  updatedAt: string;
};

export function mapCandidateCycleTotal(
  row: Record<string, unknown>,
  context: FinanceContext,
): FinanceDirect | null {
  const candidateId = text(row.candidate_id);
  const cycle = year(row.cycle);
  if (!candidateId || cycle == null) return null;
  const image = text(row.last_beginning_image_number);
  const filing = fecImagePdf(image);
  return {
    scope: "cycle",
    candidateId,
    raceId: context.raceId,
    name: context.name,
    committeeId: context.committeeId,
    committeeName: context.committeeName,
    cycle,
    receipts: money(row.receipts),
    disbursements: money(row.disbursements),
    cashOnHand: money(row.last_cash_on_hand_end_period) ?? money(row.cash_on_hand_end_period),
    debts: money(row.last_debts_owed_by_committee) ?? money(row.debts_owed_by_committee),
    coverageStart: day(row.coverage_start_date),
    coverageEnd: day(row.coverage_end_date),
    fileNumber: null,
    sourceUrl: filing ?? candidateTotalsUrl(candidateId, cycle),
    sourceLabel: filing ? "FEC filing" : "FEC candidate totals",
    updatedAt: context.updatedAt,
  };
}

/**
 * One current committee report. Amended copies with `most_recent` false are skipped
 * so an older version is not stored beside the replacement.
 */
export function mapCommitteeReport(
  row: Record<string, unknown>,
  context: FinanceContext & { candidateId: string },
): FinanceDirect | null {
  if (row.most_recent === false) return null;
  const cycle = year(row.cycle);
  const committeeId = text(row.committee_id) ?? context.committeeId;
  if (cycle == null || !committeeId) return null;
  const coverageEnd = day(row.coverage_end_date);
  const fileNumber = text(row.file_number) ?? (typeof row.file_number === "number" ? String(row.file_number) : null);
  const pdf = https(row.pdf_url);
  return {
    scope: "period",
    candidateId: context.candidateId,
    raceId: context.raceId,
    name: context.name,
    committeeId,
    committeeName: text(row.committee_name) ?? context.committeeName,
    cycle,
    receipts: money(row.total_receipts_period),
    disbursements: money(row.total_disbursements_period),
    cashOnHand: money(row.cash_on_hand_end_period),
    debts: money(row.debts_owed_by_committee),
    coverageStart: day(row.coverage_start_date),
    coverageEnd,
    fileNumber,
    sourceUrl: pdf,
    sourceLabel: pdf ? "FEC committee report" : "FEC candidate totals",
    updatedAt: context.updatedAt,
  };
}

/** FEC's Schedule E aggregate. This does not read itemized lines. */
export function mapScheduleEByCandidate(
  row: Record<string, unknown>,
  context: { raceId: string | null; candidateName: string | null; updatedAt: string },
): FinanceOutside | null {
  const candidateId = text(row.candidate_id);
  const committeeId = text(row.committee_id);
  const cycle = year(row.cycle);
  const total = money(row.total);
  const support = row.support_oppose_indicator === "S" ? "support" : row.support_oppose_indicator === "O" ? "oppose" : null;
  if (!candidateId || !committeeId || cycle == null || total == null || !support) return null;
  return {
    candidateId,
    raceId: context.raceId,
    candidateName: context.candidateName,
    committeeId,
    committeeName: text(row.committee_name),
    support,
    cycle,
    total,
    count: typeof row.count === "number" && Number.isFinite(row.count) ? row.count : null,
    sourceUrl: scheduleEUrl({ candidateId, committeeId, cycle, support }),
    sourceLabel: "FEC independent expenditures",
    updatedAt: context.updatedAt,
  };
}

export function principalCommittee(rows: Record<string, unknown>[]): { committeeId: string; committeeName: string | null } | null {
  const principal = rows.find((row) => row.designation === "P" || row.committee_designation === "P");
  const chosen = principal ?? rows[0];
  if (!chosen) return null;
  const committeeId = text(chosen.committee_id);
  if (!committeeId) return null;
  return { committeeId, committeeName: text(chosen.name) ?? text(chosen.committee_name) };
}

function money(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function year(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1980 || parsed > 2100) return null;
  return parsed;
}

function day(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 10) return null;
  const text = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function https(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("https://")) return null;
  return value;
}
