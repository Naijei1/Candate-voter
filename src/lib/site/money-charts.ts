import { orgLabel } from "@/components/site/FinanceLists";
import type { FinanceOutside } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { FINANCE_SNAPSHOT_RETRIEVED_AT, snapshotFinance } from "@/lib/finance/snapshot";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";
import type { ChartTarget } from "./money-chart-lines";

export type { ChartTarget } from "./money-chart-lines";
export { targetLines } from "./money-chart-lines";

export const CHART_RACE_IDS = [
  "2026-senate-KY",
  "2026-house-KY-01",
  "2026-house-KY-02",
  "2026-house-KY-03",
  "2026-house-KY-04",
  "2026-house-KY-05",
  "2026-house-KY-06",
] as const;

export type ChartPerson = {
  id: string;
  name: string;
  party: string;
  raised: number;
  spent: number;
  /** Null when the FEC total did not include cash on hand. */
  cash: number | null;
  coverageEnd: string;
  sourceUrl: string;
};

export type ChartRace = {
  raceId: string;
  title: string;
  people: ChartPerson[];
  /** Names on the ballot with no FEC totals stored. Listed, never drawn as zero. */
  missing: string[];
};

export type ChartCommittee = {
  committeeId: string;
  name: string;
  total: number;
  support: number;
  oppose: number;
  candidates: string[];
  /** Per candidate, how much this group spent for and against them. From FEC independent expenditures only. */
  targets: ChartTarget[];
  sourceUrl: string | null;
};


export type MoneyChartData = {
  races: ChartRace[];
  committees: ChartCommittee[];
  /** Plain "as of" lines for the chart footers. */
  candidateAsOf: string;
  committeeAsOf: string;
  candidateSource: { name: string; url: string };
};

export function raceTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}

/** Stored FEC cycle totals for each Kentucky November nominee. No value is estimated. */
export function chartRaces(): ChartRace[] {
  return CHART_RACE_IDS.flatMap((raceId) => {
    const race = kyBallot(raceId);
    if (!race) return [];
    const people: ChartPerson[] = [];
    const missing: string[] = [];
    for (const person of race.people) {
      if (!person.finance) {
        missing.push(person.name);
        continue;
      }
      people.push({
        id: person.id,
        name: person.name,
        party: person.party,
        raised: person.finance.receipts,
        spent: person.finance.disbursements,
        cash: person.finance.cash,
        coverageEnd: person.finance.coverageEnd,
        sourceUrl: person.finance.sourceUrl,
      });
    }
    people.sort((a, b) => b.raised - a.raised);
    return [{ raceId, title: raceTitle(raceId), people, missing }];
  });
}

/** Outside groups ranked by the stored independent-expenditure totals for November nominees. */
export function topCommittees(
  outside: readonly FinanceOutside[],
  nominees: ReadonlyMap<string, string>,
  limit = 6,
): ChartCommittee[] {
  const byCommittee = new Map<string, ChartCommittee>();
  for (const row of outside) {
    const who = nominees.get(row.candidateId);
    if (!who || !(row.total > 0)) continue;
    const entry = byCommittee.get(row.committeeId) ?? {
      committeeId: row.committeeId,
      name: orgLabel(row.committeeName) ?? row.committeeId,
      total: 0,
      support: 0,
      oppose: 0,
      candidates: [],
      targets: [],
      sourceUrl: `https://www.fec.gov/data/committee/${row.committeeId}/`,
    };
    entry.total += row.total;
    if (row.support === "support") entry.support += row.total;
    else entry.oppose += row.total;
    if (!entry.candidates.includes(who)) entry.candidates.push(who);
    let target = entry.targets.find((item) => item.name === who);
    if (!target) {
      target = { name: who, support: 0, oppose: 0 };
      entry.targets.push(target);
    }
    if (row.support === "support") target.support += row.total;
    else target.oppose += row.total;
    byCommittee.set(row.committeeId, entry);
  }
  for (const entry of byCommittee.values()) entry.targets.sort((a, b) => b.support + b.oppose - (a.support + a.oppose));
  return [...byCommittee.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

function nomineeNames(): Map<string, string> {
  const map = new Map<string, string>();
  for (const raceId of CHART_RACE_IDS) {
    for (const person of kyBallot(raceId)?.people ?? []) {
      if (person.fecCandidateId) map.set(person.fecCandidateId, person.name);
      for (const id of person.alsoFecIds) map.set(id, person.name);
    }
  }
  return map;
}

export function dayLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function loadMoneyCharts(): Promise<MoneyChartData> {
  const nominees = nomineeNames();
  const bundle = await loadFinance(2026);
  const live = bundle.outside.some((row) => nominees.has(row.candidateId));
  const outside = live ? bundle.outside : snapshotFinance().outside;
  const outsideDay = live
    ? (bundle.retrievedAt ?? latest(bundle.outside.map((row) => row.updatedAt)) ?? FINANCE_SNAPSHOT_RETRIEVED_AT)
    : FINANCE_SNAPSHOT_RETRIEVED_AT;
  const races = chartRaces();
  const coverageEnd = latest(races.flatMap((race) => race.people.map((person) => person.coverageEnd)));
  const source = KY_BALLOT_SOURCES[2];
  return {
    races,
    committees: topCommittees(outside, nominees),
    candidateAsOf: `Campaign totals reported to the FEC through ${coverageEnd ? dayLabel(coverageEnd) : "the latest stored report"}, retrieved ${dayLabel(KY_BALLOT_CHECKED)}.`,
    committeeAsOf: `Outside spending totals for the 2026 cycle, retrieved ${dayLabel(outsideDay)}.`,
    candidateSource: { name: source.name, url: source.url },
  };
}

function latest(values: readonly (string | null | undefined)[]): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted.at(-1) ?? null;
}
