import snapshot from "../../../data/ky-fec-breakdown.json";

/**
 * Where a campaign committee's money came from, from OpenFEC
 * `/committee/{id}/totals/` for one cycle.
 *
 * individuals = individual_contributions
 * committees  = other_political_committee_contributions + political_party_committee_contributions
 * self        = candidate_contribution + loans_made_by_candidate
 * other       = receipts minus the three above (transfers, other loans, refunds, offsets)
 */
export type FundingBreakdown = {
  candidateId: string;
  committeeId: string;
  name: string;
  status: "ok" | "no-data";
  cycle: number;
  coverageStart: string | null;
  coverageEnd: string | null;
  receipts: number | null;
  individuals: number | null;
  committees: number | null;
  self: number | null;
  other: number | null;
  disbursements: number | null;
  cash: number | null;
  sourceUrl: string;
  apiUrl: string;
  retrievedAt: string;
};

export type FundingPart = "individuals" | "committees" | "self" | "other";

export const FUNDING_PARTS: ReadonlyArray<{ key: FundingPart; label: string; short: string; className: string }> = [
  { key: "individuals", label: "Individuals", short: "Individuals", className: "s-i" },
  { key: "committees", label: "PACs and other committees", short: "PACs", className: "s-c" },
  { key: "self", label: "Self-funding", short: "Self", className: "s-s" },
  { key: "other", label: "Other (transfers, loans, refunds)", short: "Other", className: "s-o" },
];

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function day(value: unknown): string | null {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function breakdownFromTotals(input: {
  candidateId: string;
  committeeId: string;
  name: string;
  cycle: number;
  totals: Record<string, unknown> | null;
  retrievedAt: string;
}): FundingBreakdown {
  const { candidateId, committeeId, name, cycle, totals, retrievedAt } = input;
  const base = {
    candidateId,
    committeeId,
    name,
    cycle,
    sourceUrl: `https://www.fec.gov/data/committee/${committeeId}/?cycle=${cycle}`,
    apiUrl: `https://api.open.fec.gov/v1/committee/${committeeId}/totals/?cycle=${cycle}`,
    retrievedAt,
  };
  if (!totals) {
    return {
      ...base,
      status: "no-data",
      coverageStart: null,
      coverageEnd: null,
      receipts: null,
      individuals: null,
      committees: null,
      self: null,
      other: null,
      disbursements: null,
      cash: null,
    };
  }
  const receipts = num(totals.receipts);
  const individuals = num(totals.individual_contributions);
  const committees = num(totals.other_political_committee_contributions) + num(totals.political_party_committee_contributions);
  const self = num(totals.candidate_contribution) + num(totals.loans_made_by_candidate);
  return {
    ...base,
    status: "ok",
    coverageStart: day(totals.coverage_start_date),
    coverageEnd: day(totals.coverage_end_date),
    receipts: cents(receipts),
    individuals: cents(individuals),
    committees: cents(committees),
    self: cents(self),
    other: cents(Math.max(0, receipts - individuals - committees - self)),
    disbursements: cents(num(totals.disbursements)),
    cash: totals.last_cash_on_hand_end_period == null ? null : cents(num(totals.last_cash_on_hand_end_period)),
  };
}

const ROWS = snapshot.rows as FundingBreakdown[];

export const FUNDING_RETRIEVED_AT = snapshot.retrievedAt;

export function fundingFor(candidateId: string | null | undefined): FundingBreakdown | null {
  if (!candidateId) return null;
  return ROWS.find((row) => row.candidateId === candidateId) ?? null;
}

export function fundingRows(): readonly FundingBreakdown[] {
  return ROWS;
}

export type FundingSegment = {
  key: FundingPart;
  label: string;
  short: string;
  className: string;
  amount: number;
  /** Share of receipts in whole percent, for the visible bar label only. */
  percent: number;
  /** Share in thousandths, for flex sizing. */
  perMille: number;
};

/** Segments with money, in fixed order. Empty when nothing was raised. */
export function fundingSegments(row: FundingBreakdown | null): FundingSegment[] {
  if (!row || row.status !== "ok" || !row.receipts || row.receipts <= 0) return [];
  const total = (row.individuals ?? 0) + (row.committees ?? 0) + (row.self ?? 0) + (row.other ?? 0);
  if (total <= 0) return [];
  return FUNDING_PARTS.flatMap((part) => {
    const amount = row[part.key] ?? 0;
    if (amount <= 0) return [];
    const share = amount / total;
    return [{ ...part, amount, percent: Math.round(share * 100), perMille: Math.max(1, Math.round(share * 1000)) }];
  });
}
