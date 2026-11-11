import { orgLabel } from "@/components/site/FinanceLists";
import { formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { kyBallotSeed } from "@/lib/site/ky-ballot";
import { snapshotFinance, FINANCE_SNAPSHOT_RETRIEVED_AT } from "@/lib/finance/snapshot";

export type TodayCard = {
  id: string;
  title: string;
  text: string;
  when: string;
  sourceName: string;
  sourceUrl: string;
};

export type TodayMoney = {
  spending: TodayCard[];
  receipts: TodayCard[];
  filings: TodayCard[];
};

function ballotNames(): Map<string, string> {
  return new Map(
    kyBallotSeed().candidates.flatMap((candidate) =>
      candidate.fecCandidateId ? [[candidate.fecCandidateId, candidate.displayName] as const] : [],
    ),
  );
}

function whenLabel(updatedAt: string | null, retrievedAt: string): string {
  const day = (updatedAt || retrievedAt).slice(0, 10);
  return `Retrieved ${day}`;
}

/**
 * Money cards for November ballot candidates only.
 * Totals from stored FEC rows. Does not invent a donor, a single gift, or a transaction date.
 */
export function kentuckyMoneyCards(
  bundle: { direct: readonly FinanceDirect[]; outside: readonly FinanceOutside[] },
  retrievedAt: string,
  limit = 4,
): TodayMoney {
  const names = ballotNames();
  const spending = bundle.outside
    .filter((row) => names.has(row.candidateId) && row.total != null && row.total > 0 && row.sourceUrl)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, limit)
    .map((row) => {
      const who = names.get(row.candidateId) ?? row.candidateName ?? row.candidateId;
      const group = orgLabel(row.committeeName) ?? row.committeeId;
      const way = row.support === "support" ? "support" : "oppose";
      const reports = row.count != null && row.count > 0 ? ` across ${row.count} reports` : "";
      return {
        id: `${row.committeeId}-${row.candidateId}-${row.support}`,
        title: `${group} ${way === "support" ? "supported" : "opposed"} ${who}`,
        text: `${group} reported ${formatMoney(row.total)} in independent expenditures that ${way} ${who}${reports}. This is the stored total for the 2026 cycle, not one payment.`,
        when: whenLabel(row.updatedAt, retrievedAt),
        sourceName: "FEC independent expenditures",
        sourceUrl: row.sourceUrl as string,
      };
    });
  const cycle = bundle.direct.filter(
    (row) => row.scope === "cycle" && names.has(row.candidateId) && row.sourceUrl && (row.receipts ?? 0) > 0,
  );
  const receipts = cycle
    .filter((row) => row.sourceLabel !== "FEC filing")
    .sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0))
    .slice(0, limit)
    .map((row) => receiptCard(row, names, retrievedAt));
  const filings = cycle
    .filter((row) => row.sourceLabel === "FEC filing")
    .sort((a, b) => (b.coverageEnd ?? "").localeCompare(a.coverageEnd ?? ""))
    .slice(0, limit)
    .map((row) => receiptCard(row, names, retrievedAt));
  return { spending, receipts, filings };
}

function receiptCard(row: FinanceDirect, names: Map<string, string>, retrievedAt: string): TodayCard {
  const who = names.get(row.candidateId) ?? row.name ?? row.candidateId;
  const group = orgLabel(row.committeeName) ?? "The campaign";
  const filing = row.sourceLabel === "FEC filing";
  return {
    id: `${filing ? "filing" : "receipt"}-${row.candidateId}-${row.coverageEnd ?? ""}`,
    title: filing ? `${group} filed a report for ${who}` : `${group} receipts for ${who}`,
    text: `${group} reported ${formatMoney(row.receipts)} in receipts for ${who}. Coverage ${row.coverageStart ?? "start not stored"} to ${row.coverageEnd ?? "end not stored"}. This is the committee total, not a list of donors.`,
    when: whenLabel(row.updatedAt, retrievedAt),
    sourceName: filing ? "FEC filing" : "FEC candidate totals",
    sourceUrl: row.sourceUrl as string,
  };
}

export async function todayMoney(limit = 4): Promise<TodayMoney> {
  const names = ballotNames();
  const bundle = await loadFinance(2026);
  const hit = (row: { candidateId: string }) => names.has(row.candidateId);
  const live = bundle.direct.some(hit) || bundle.outside.some(hit);
  const source = live ? bundle : snapshotFinance();
  const retrieved = (live ? bundle.retrievedAt : null) ?? source.direct[0]?.updatedAt ?? FINANCE_SNAPSHOT_RETRIEVED_AT;
  return kentuckyMoneyCards(source, retrieved, limit);
}
