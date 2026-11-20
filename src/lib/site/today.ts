import { orgLabel } from "@/components/site/FinanceLists";
import { type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { dayLabel } from "@/lib/site/money-charts";
import { kyBallotSeed } from "@/lib/site/ky-ballot";
import { snapshotFinance, FINANCE_SNAPSHOT_RETRIEVED_AT } from "@/lib/finance/snapshot";

export type TodayCard = {
  id: string;
  title: string;
  text: string;
  when: string;
  sourceName: string;
  sourceUrl: string;
  /** Ballot person id, for the headshot. */
  personId: string | null;
  personName: string;
  /** Committee or group named on the record. Used for the mark when no photo is stored. */
  group: string;
};

export type TodayMoney = {
  spending: TodayCard[];
  receipts: TodayCard[];
  filings: TodayCard[];
};

function ballotPeople(): Map<string, string> {
  return new Map(
    kyBallotSeed().candidates.flatMap((candidate) =>
      candidate.fecCandidateId ? [[candidate.fecCandidateId, candidate.candidateId] as const] : [],
    ),
  );
}

function ballotNames(): Map<string, string> {
  return new Map(
    kyBallotSeed().candidates.flatMap((candidate) =>
      candidate.fecCandidateId ? [[candidate.fecCandidateId, candidate.displayName] as const] : [],
    ),
  );
}

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});

function whenLabel(updatedAt: string | null, retrievedAt: string): string {
  const day = (updatedAt || retrievedAt).slice(0, 10);
  return dayLabel(day);
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
  const people = ballotPeople();
  const spending = bundle.outside
    .filter((row) => names.has(row.candidateId) && row.total != null && row.total > 0 && row.sourceUrl)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, limit)
    .map((row) => {
      const who = names.get(row.candidateId) ?? row.candidateName ?? row.candidateId;
      const group = orgLabel(row.committeeName) ?? row.committeeId;
      const way = row.support === "support" ? "support" : "oppose";
      const reports = row.count != null && row.count > 0 ? ` (${row.count} ${row.count === 1 ? "report" : "reports"})` : "";
      return {
        id: `${row.committeeId}-${row.candidateId}-${row.support}`,
        title: `${group} ${way === "support" ? "supported" : "opposed"} ${who}`,
        text: `${compactMoney.format(row.total ?? 0)} in outside spending ${way === "support" ? "for" : "against"} ${who} in ${row.cycle}${reports}.`,
        when: whenLabel(row.updatedAt, retrievedAt),
        sourceName: "FEC",
        sourceUrl: row.sourceUrl as string,
        personId: people.get(row.candidateId) ?? null,
        personName: who,
        group,
      };
    });
  const cycle = bundle.direct.filter(
    (row) => row.scope === "cycle" && names.has(row.candidateId) && row.sourceUrl && (row.receipts ?? 0) > 0,
  );
  const receipts = cycle
    .filter((row) => row.sourceLabel !== "FEC filing")
    .sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0))
    .slice(0, limit)
    .map((row) => receiptCard(row, names, people, retrievedAt));
  const filings = cycle
    .filter((row) => row.sourceLabel === "FEC filing")
    .sort((a, b) => (b.coverageEnd ?? "").localeCompare(a.coverageEnd ?? ""))
    .slice(0, limit)
    .map((row) => receiptCard(row, names, people, retrievedAt));
  return { spending, receipts, filings };
}

function receiptCard(
  row: FinanceDirect,
  names: Map<string, string>,
  people: Map<string, string>,
  retrievedAt: string,
): TodayCard {
  const who = names.get(row.candidateId) ?? row.name ?? row.candidateId;
  const group = orgLabel(row.committeeName) ?? "The campaign";
  const filing = row.sourceLabel === "FEC filing";
  const period = row.coverageStart && row.coverageEnd
    ? ` from ${dayLabel(row.coverageStart)} to ${dayLabel(row.coverageEnd)}`
    : row.coverageEnd ? ` through ${dayLabel(row.coverageEnd)}`
    : row.coverageStart ? ` since ${dayLabel(row.coverageStart)}` : "";
  return {
    id: `${filing ? "filing" : "receipt"}-${row.candidateId}-${row.coverageEnd ?? ""}`,
    title: filing ? `${group} filed a report` : `${group} fundraising`,
    text: `Raised ${compactMoney.format(row.receipts ?? 0)}${period}.`,
    when: whenLabel(row.updatedAt, retrievedAt),
    sourceName: "FEC",
    sourceUrl: row.sourceUrl as string,
    personId: people.get(row.candidateId) ?? null,
    personName: who,
    group,
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
