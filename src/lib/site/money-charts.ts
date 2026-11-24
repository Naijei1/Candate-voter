import { dayLabel } from "@/lib/format";
export { dayLabel } from "@/lib/format";
import { orgLabel } from "@/components/site/FinanceLists";
import type { FinanceOutside } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { FINANCE_SNAPSHOT_RETRIEVED_AT, snapshotFinance } from "@/lib/finance/snapshot";
import { KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";
import { shownName } from "@/lib/site/ky-officeholders";
import { campaignFinanceChecked, candidateOutsideSpending } from "./fec-reports";
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
  headline?: {
    name: string;
    raised: number;
    coverageEnd: string;
    sourceUrl: string;
    outsideSourceUrl: string;
    outside: Array<{ side: "for" | "against"; amount: number }>;
  };
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
  updatedAt: string | null;
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
        missing.push(shownName(person.name, person.id));
        continue;
      }
      people.push({
        id: person.id,
        name: shownName(person.name, person.id),
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

export async function loadMoneyCharts(): Promise<MoneyChartData> {
  const nominees = nomineeNames();
  const bundle = await loadFinance(2026);
  const live = bundle.outside.some((row) => nominees.has(row.candidateId));
  const outside = live ? bundle.outside : snapshotFinance().outside;
  const outsideDay = live
    ? (bundle.retrievedAt ?? latest(bundle.outside.map((row) => row.updatedAt)) ?? FINANCE_SNAPSHOT_RETRIEVED_AT)
    : FINANCE_SNAPSHOT_RETRIEVED_AT;
  const races = chartRaces();
  for (const race of races) {
    const leader = race.people[0];
    if (!leader) continue;
    const person = kyBallot(race.raceId)?.people.find((person) => person.id === leader.id);
    const ids = new Set([person?.fecCandidateId, ...(person?.alsoFecIds ?? [])]);
    const rows = outside.filter((row) => ids.has(row.candidateId));
    const verified = candidateOutsideSpending.find((row) => ids.has(row.candidateId));
    const newer = rows.some((row) => !verified || row.updatedAt.slice(0, 10) > verified.retrievedAt);
    race.headline = {
      name: leader.name,
      raised: leader.raised,
      coverageEnd: leader.coverageEnd,
      sourceUrl: leader.sourceUrl,
      outsideSourceUrl: verified?.sourceUrl ?? "https://www.fec.gov/data/independent-expenditures/",
      outside: (["support", "oppose"] as const).flatMap((type) => {
        const matched = rows.filter((row) => row.support === type);
        const amount = verified && !newer ? verified[type] : matched.length ? matched.reduce((sum, row) => sum + row.total, 0) : null;
        return amount != null ? [{ side: type === "support" ? "for" : "against", amount }] : [];
      }),
    };
  }
  const coverageEnd = latest(races.flatMap((race) => race.people.map((person) => person.coverageEnd)));
  const source = KY_BALLOT_SOURCES[2];
  return {
    races,
    committees: topCommittees(outside, nominees),
    candidateAsOf: coverageEnd ? `, through ${dayLabel(coverageEnd)}` : "",
    committeeAsOf: ` · ${dayLabel(outsideDay)}`,
    candidateSource: { name: source.name, url: source.url },
    updatedAt: latest([campaignFinanceChecked, outsideDay, bundle.retrievedAt, ...bundle.direct.filter((row) => nominees.has(row.candidateId)).map((row) => row.updatedAt)]),
  };
}

function latest(values: readonly (string | null | undefined)[]): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted.at(-1) ?? null;
}
