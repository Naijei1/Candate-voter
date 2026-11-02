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
  lastStatus: "running" | "success" | "error";
  lastError: string | null;
  candidatesSeen: number;
  directUpserted: number;
  periodsUpserted: number;
  outsideUpserted: number;
  updatedAt: string;
};

/** Shown once, on /finance. Other pages link here instead of repeating it. */
export const FINANCE_EXPLANATION =
  "Direct figures are the candidate committee's own FEC reports. Outside spending is money other committees reported as independent expenditures (Schedule E). Those amounts are not added together.";

export function formatMoney(value: number | null): string {
  if (value == null) return "Not reported";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function coverageKey(start: string | null, end: string | null): string | null {
  if (!end) return null;
  return `${start ?? ""}..${end}`;
}

export function coverageLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "Coverage dates not reported";
  if (start && end) return `${start} to ${end}`;
  return end ?? start ?? "Coverage dates not reported";
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
