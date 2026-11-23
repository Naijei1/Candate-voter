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

export type FinanceSeed = {
  receipts: number;
  disbursements: number;
  cash: number | null;
  sourceUrl: string | null;
};

export type FinanceHeadline =
  | { kind: "missing" }
  | { kind: "zero"; sourceUrl: string | null }
  | { kind: "reported"; receipts: number; cash: number | null; sourceUrl: string | null }
  | { kind: "filed"; sourceUrl: string | null };

/**
 * One stored cycle total, or the ballot seed when no cycle row is stored.
 * Several totals, or only period rows, stay unsummarized.
 */
export function financeHeadline(rows: readonly FinanceDirect[], seed: FinanceSeed | null): FinanceHeadline {
  const cycles = rows.filter((row) => row.scope === "cycle" && row.receipts != null);
  if (cycles.length === 1) {
    const row = cycles[0]!;
    return fromNumbers(row.receipts!, row.disbursements, row.cashOnHand, row.sourceUrl);
  }
  if (cycles.length > 1) return { kind: "filed", sourceUrl: newestSource(cycles) };
  if (seed) return fromNumbers(seed.receipts, seed.disbursements, seed.cash, seed.sourceUrl);
  const periods = rows.filter((row) => row.scope === "period" && row.receipts != null);
  if (periods.length > 0) return { kind: "filed", sourceUrl: newestSource(periods) };
  return { kind: "missing" };
}

/** Receipts on the newest period, only when it starts the day after the report before it. */
export function sinceLastFiling(periods: readonly Pick<FinanceDirect, "receipts" | "coverageStart" | "coverageEnd" | "sourceUrl" | "committeeId">[]): {
  amount: number;
  since: string;
  sourceUrl: string;
} | null {
  if (periods.length < 2) return null;
  const latest = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  const previousEnd = calendarDate(previous?.coverageEnd);
  const latestStart = calendarDate(latest?.coverageStart);
  if (
    latest?.receipts == null
    || !previousEnd
    || !latestStart
    || !latest.sourceUrl
    || !latest.committeeId
    || latest.committeeId !== previous?.committeeId
    || latestStart !== dayAfter(previousEnd)
  ) return null;
  return { amount: latest.receipts, since: previousEnd, sourceUrl: latest.sourceUrl };
}

function fromNumbers(
  receipts: number,
  disbursements: number | null,
  cash: number | null,
  sourceUrl: string | null,
): FinanceHeadline {
  if (disbursements == null) {
    if (receipts > 0) return { kind: "reported", receipts, cash, sourceUrl };
    return { kind: "filed", sourceUrl };
  }
  const state = moneyReportState({ receipts, disbursements, cash });
  if (state === "zero") return { kind: "zero", sourceUrl };
  return { kind: "reported", receipts, cash, sourceUrl };
}

function newestSource(rows: readonly FinanceDirect[]): string | null {
  const dated = [...rows].sort((a, b) => (a.coverageEnd ?? "").localeCompare(b.coverageEnd ?? ""));
  return dated.at(-1)?.sourceUrl ?? null;
}

function calendarDate(value: string | null | undefined): string | null {
  const day = value?.slice(0, 10);
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function dayAfter(day: string): string | null {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return null;
  const utc = new Date(Date.UTC(year, month - 1, date));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== date) return null;
  utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString().slice(0, 10);
}
