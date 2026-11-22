import { orgLabel } from "@/components/site/FinanceLists";
import { dayLabel } from "@/lib/format";
import { type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { kyPerson, rosterMoney } from "@/lib/site/ky-ballot";
import { snapshotFinance, FINANCE_SNAPSHOT_RETRIEVED_AT } from "@/lib/finance/snapshot";
import { filingDay, filingPeriods, verifiedCommittee } from "./fec-reports";
import { decodeHtmlEntities } from "./html-entities";
import { kentuckyCandidates } from "./ky-candidate-mentions";

export type TodayCard = {
  id: string;
  title: string;
  text: string;
  date: string | null;
  when: string | null;
  sourceName: string;
  sourceUrl: string;
  personId: string;
  personName: string;
  group: string;
};

export type TodayMoney = {
  spending: TodayCard[];
  receipts: TodayCard[];
  filings: TodayCard[];
  updatedAt: string;
};

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", notation: "compact", maximumSignificantDigits: 3,
});

export function kentuckyMoneyCards(
  bundle: { direct: readonly FinanceDirect[]; outside: readonly FinanceOutside[] },
  retrievedAt: string,
  limit = 4,
  personId?: string,
): TodayMoney {
  const selected = <T extends { candidateId: string }>(row: T) => {
    const person = kyPerson(row.candidateId)?.person;
    return person != null && (!personId || person.id === personId);
  };
  const outside = bundle.outside.filter(selected);
  const spending = outside
    .filter((row) => row.total > 0 && row.sourceUrl)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .flatMap((row): TodayCard[] => {
      const person = kyPerson(row.candidateId)?.person;
      if (!person || !row.sourceUrl) return [];
      const group = orgLabel(decodeHtmlEntities(row.committeeName ?? "")) || row.committeeId;
      const way = row.support === "support" ? "for" : "against";
      return [{
        id: `${row.committeeId}-${row.candidateId}-${row.support}`,
        title: `${group} ${way === "for" ? "supported" : "opposed"} ${person.name}`,
        text: `${compactMoney.format(row.total)} in outside spending ${way} ${person.name} in ${row.cycle}.`,
        date: null, when: null,
        sourceName: "FEC", sourceUrl: row.sourceUrl,
        personId: person.id, personName: person.name, group,
      }];
    });
  const candidates = kentuckyCandidates.filter((person) => !personId || person.id === personId);
  const direct = bundle.direct.filter(selected);
  const cycle = candidates.flatMap((person) => {
    const live = direct.find((row) => row.candidateId === person.fecCandidateId && row.scope === "cycle");
    const row = live ?? rosterMoney(person.raceId, person);
    return row ? [row] : [];
  });
  const periods = candidates.flatMap((person) => person.fecCandidateId ? filingPeriods(direct, person.fecCandidateId) : []);
  const filings = [...periods, ...cycle.filter((row) => row.sourceLabel === "FEC filing")]
    .sort((a, b) => (filingDay(b) ?? "").localeCompare(filingDay(a) ?? ""));
  const filed = new Set<string>();
  const filingCards = filings.flatMap((row) => {
    const date = filingDay(row);
    const key = `${row.candidateId}:${row.coverageEnd}`;
    if (!date || filed.has(key)) return [];
    const card = campaignCard(row, date);
    if (card.length) filed.add(key);
    return card;
  });
  const receipts = cycle
    .sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0))
    .flatMap((row) => campaignCard(row, null))
    .slice(0, limit);
  const updatedAt = [retrievedAt, ...bundle.direct.filter((row) => kyPerson(row.candidateId)).map((row) => row.updatedAt),
    ...bundle.outside.filter((row) => kyPerson(row.candidateId)).map((row) => row.updatedAt),
    ...periods.map((row) => row.updatedAt)].sort().at(-1) ?? retrievedAt;
  return { spending, receipts, filings: filingCards.slice(0, limit), updatedAt };
}

function campaignCard(row: FinanceDirect, date: string | null): TodayCard[] {
  const person = kyPerson(row.candidateId)?.person;
  if (!person || !row.sourceUrl || row.receipts == null || (!date && (row.receipts <= 0 || !row.coverageEnd))) return [];
  const committee = verifiedCommittee(row.candidateId, row.committeeId);
  const linked = committee || (row.committeeId && row.committeeName);
  const group = linked ? `${person.name}’s campaign` : person.name;
  const period = date && row.coverageStart && row.coverageEnd
    ? ` from ${dayLabel(row.coverageStart)} to ${dayLabel(row.coverageEnd)}`
    : row.coverageEnd ? ` through ${dayLabel(row.coverageEnd)}` : "";
  return [{
    id: `${date ? "filing" : "receipt"}-${row.candidateId}-${row.coverageEnd ?? ""}`,
    title: date ? `${group} filed a report` : `${person.name} reported fundraising`,
    text: `Raised ${compactMoney.format(row.receipts)}${period}.`,
    date, when: date ? dayLabel(date) : null,
    sourceName: "FEC", sourceUrl: row.sourceUrl,
    personId: person.id, personName: person.name, group: person.name,
  }];
}

export async function todayMoney(limit = 4, personId?: string): Promise<TodayMoney> {
  const bundle = await loadFinance(2026);
  const hit = (row: { candidateId: string }) => Boolean(kyPerson(row.candidateId));
  const snapshot = snapshotFinance();
  const direct = bundle.direct.some(hit) ? bundle.direct : snapshot.direct;
  const outside = bundle.outside.some(hit) ? bundle.outside : snapshot.outside;
  return kentuckyMoneyCards({ direct, outside }, bundle.retrievedAt ?? FINANCE_SNAPSHOT_RETRIEVED_AT, limit, personId);
}
