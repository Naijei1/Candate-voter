import snapshot from "../../../data/ky-fec-feed-finance.json";
import type { FinanceDirect } from "../finance/model";
import { kyPerson } from "./ky-ballot";

export const committeeContributions = snapshot.contributions;
export const candidateOutsideSpending = snapshot.outside;
export const campaignFinanceChecked = [...snapshot.reports, ...snapshot.outside, ...snapshot.contributions]
  .map((row) => row.retrievedAt).sort().at(-1) ?? null;

export function verifiedCommittee(candidateId: string, committeeId: string | null) {
  return snapshot.committees.find((link) => link.candidateId === candidateId && (!committeeId || link.committeeId === committeeId));
}

export function filingDay(row: Pick<FinanceDirect, "sourceUrl" | "receiptDate">): string | null {
  const date = row.receiptDate?.slice(0, 10);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date) return date;
  const image = /^https:\/\/docquery\.fec\.gov\/(?:pdf\/\d{3}\/|cgi-bin\/fecimg\/\?)(20\d{2})(\d{2})(\d{2})\d{10}(?:\/|$)/i.exec(row.sourceUrl ?? "");
  return image ? `${image[1]}-${image[2]}-${image[3]}` : null;
}

export function filingPeriods(rows: readonly FinanceDirect[], candidateId: string): FinanceDirect[] {
  const snapshotRows: FinanceDirect[] = snapshot.reports.filter((row) => row.candidateId === candidateId).map((row) => ({
    scope: "period",
    candidateId,
    raceId: kyPerson(candidateId)?.race.raceId ?? null,
    name: null,
    committeeId: row.committeeId,
    committeeName: verifiedCommittee(candidateId, row.committeeId)?.name ?? null,
    cycle: 2026,
    receipts: row.receipts,
    disbursements: null,
    cashOnHand: null,
    debts: null,
    coverageStart: row.start,
    coverageEnd: row.end,
    fileNumber: row.fileNumber,
    sourceUrl: row.sourceUrl,
    sourceLabel: "FEC committee report",
    updatedAt: row.retrievedAt,
    receiptDate: row.receiptDate,
  }));
  const periods = new Map<string, FinanceDirect>();
  for (const row of [...snapshotRows, ...rows]) {
    if (row.scope !== "period" || row.candidateId !== candidateId || !row.coverageEnd || !Number.isFinite(Date.parse(row.coverageEnd)) || row.receipts == null) continue;
    const key = `${row.committeeId}:${row.coverageStart}:${row.coverageEnd}`;
    const previous = periods.get(key);
    if (!previous || (filingDay(row) ?? "") >= (filingDay(previous) ?? "")) periods.set(key, row);
  }
  return [...periods.values()].sort((a, b) => (a.coverageEnd ?? "").localeCompare(b.coverageEnd ?? ""));
}
