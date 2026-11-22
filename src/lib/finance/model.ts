import { dayLabel } from "@/lib/format";
/**
 * Direct committee money and Schedule E outside spending.
 * A direct row is never added to an outside row.
 */

export type FinanceDirect = {
  scope: "cycle" | "period";
  candidateId: string;
  raceId: string | null;
  name: string | null;
  committeeId: string | null;
  committeeName: string | null;
  cycle: number;
  receipts: number | null;
  disbursements: number | null;
  cashOnHand: number | null;
  debts: number | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  fileNumber: string | null;
  receiptDate?: string | null;
  sourceUrl: string | null;
  sourceLabel: "FEC filing" | "FEC candidate totals" | "FEC committee report";
  updatedAt: string;
};

export type FinanceOutside = {
  candidateId: string;
  raceId: string | null;
  candidateName: string | null;
  committeeId: string;
  committeeName: string | null;
  support: "support" | "oppose";
  cycle: number;
  total: number;
  count: number | null;
  sourceUrl: string | null;
  sourceLabel: "FEC independent expenditures";
  updatedAt: string;
};

export type TotalsWatermark = {
  source: "fec-totals";
  lastRunAt: string | null;
  /** `partial` means the next scheduled run should continue after the cursor. */
  lastStatus: "running" | "success" | "partial" | "error" | "rate_limited";
  lastError: string | null;
  httpStatus: number | null;
  retryAfterMs: number | null;
  candidatesSeen: number;
  directUpserted: number;
  periodsUpserted: number;
  outsideUpserted: number;
  cursorCycle: number | null;
  cursorCandidateId: string | null;
  updatedAt: string;
};

export function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const WHOLE_DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Short label for a bar, e.g. "$12.5M". The table shows the full amount. */
export function shortMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return WHOLE_DOLLARS.format(value);
}

export function coverageKey(start: string | null, end: string | null): string | null {
  if (!end) return null;
  return `${start ?? ""}..${end}`;
}

export function coverageLabel(start: string | null, end: string | null): string {
  if (start && end) return `${dayLabel(start)} to ${dayLabel(end)}`;
  return dayLabel(end ?? start ?? "");
}

export function fecImagePdf(image: string | null | undefined): string | null {
  const text = image?.trim() ?? "";
  if (!/^\d{11,}$/.test(text)) return null;
  return `https://docquery.fec.gov/pdf/${text.slice(-3)}/${text}/${text}.pdf`;
}

export function candidateTotalsUrl(candidateId: string, cycle: number): string {
  return `https://www.fec.gov/data/candidate/${candidateId}/?cycle=${cycle}&election_full=false`;
}

export function scheduleEUrl(input: {
  candidateId: string;
  committeeId: string;
  cycle: number;
  support: "support" | "oppose";
}): string {
  const indicator = input.support === "support" ? "S" : "O";
  const params = new URLSearchParams({
    data_type: "processed",
    candidate_id: input.candidateId,
    committee_id: input.committeeId,
    cycle: String(input.cycle),
    support_oppose_indicator: indicator,
  });
  return `https://www.fec.gov/data/independent-expenditures/?${params.toString()}`;
}
