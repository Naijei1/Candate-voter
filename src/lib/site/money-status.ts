import type { FinanceDirect } from "@/lib/finance/model";

export type MoneyReportState = "missing" | "zero" | "reported";

/** A stored all-zero total is a filed report. A missing total is not a report. */
export function moneyReportState(values: {
  receipts: number;
  disbursements: number;
  cash: number | null;
} | null | undefined): MoneyReportState {
  if (!values) return "missing";
  const cash = values.cash ?? 0;
  if (values.receipts === 0 && values.disbursements === 0 && cash === 0) return "zero";
  return "reported";
}

/** Receipts on the newest period, measured from the report before it. */
export function sinceLastFiling(periods: readonly Pick<FinanceDirect, "receipts" | "coverageEnd" | "sourceUrl">[]): {
  amount: number;
  since: string;
  sourceUrl: string;
} | null {
  if (periods.length < 2) return null;
  const latest = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  if (latest?.receipts == null || !previous?.coverageEnd || !latest.sourceUrl) return null;
  return { amount: latest.receipts, since: previous.coverageEnd, sourceUrl: latest.sourceUrl };
}
