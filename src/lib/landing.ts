import { FORM2_SCOPE_NOTE, houseCoverageForRaces } from "./data/coverage";
import { OFFICE_ORDER } from "./races";
import type { Race } from "./types";

const RACE_ID =
  /^(\d{4})-(president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})$/;

const MAX_RACE_IDS = 80;

/**
 * Up to three contests for a year: President when one is stored, then the
 * Senate and House races with the newest `updatedAt`. Remaining spots use
 * the same newest-update order. This is a reading order, not a ranking.
 */
export function spotlightRaces(races: readonly Race[]): Race[] {
  const picks: Race[] = [];
  const president = freshest(races.filter((race) => race.office === "president"));
  const senate = freshest(races.filter((race) => race.office === "senate"));
  const house = freshest(races.filter((race) => race.office === "house"));
  if (president) picks.push(president);
  if (senate) picks.push(senate);
  if (house) picks.push(house);
  if (picks.length >= 3) return picks.slice(0, 3);

  const used = new Set(picks.map((race) => race.raceId));
  const rest = [...races].filter((race) => !used.has(race.raceId)).sort(byFreshest);
  for (const race of rest) {
    if (picks.length >= 3) break;
    picks.push(race);
  }
  return picks;
}

/**
 * Senate and House races stored for one state.
 * The presidential contest is national and is not part of this list.
 */
export function stateRaces(races: readonly Race[], postal: string): Race[] {
  return races
    .filter((race) => race.state === postal && race.office !== "president")
    .sort((a, b) => {
      const byOffice = OFFICE_ORDER.indexOf(a.office) - OFFICE_ORDER.indexOf(b.office);
      if (byOffice !== 0) return byOffice;
      const byDistrict = (a.district ?? "").localeCompare(b.district ?? "");
      if (byDistrict !== 0) return byDistrict;
      return a.raceId.localeCompare(b.raceId);
    });
}

/** Nationwide presidential contest for the races already loaded, if one is stored. */
export function presidentialRace(races: readonly Race[]): Race | null {
  const matches = races.filter((race) => race.office === "president");
  if (matches.length === 0) return null;
  return [...matches].sort(byFreshest)[0] ?? null;
}

export type StateCoverage = {
  /** No Senate row and no House district with a stored filing. */
  empty: boolean;
  lines: string[];
  scopeNote: string;
};

/** Counts already on the race index. `filingsSoFarOnly` is always true for Form 2. */
export type StateScoreboard = {
  senateFilings: number;
  districtsWithFilings: number;
  districtsTotal: number;
  filingsSoFarOnly: true;
};

/**
 * Senate rows already loaded, plus House districts with filings out of the
 * apportioned total. A zero total (no apportionment for the postal) stays
 * zero so the UI does not invent a denominator.
 */
export function stateScoreboard(
  races: readonly Race[],
  postal: string,
  cycle?: number,
): StateScoreboard {
  const local = stateRaces(races, postal);
  const senateFilings = local.filter((race) => race.office === "senate").length;
  const cycles =
    cycle != null
      ? [cycle]
      : [
          ...new Set(
            races.flatMap((race) => (race.cycle != null && race.cycle > 0 ? [race.cycle] : [])),
          ),
        ];
  const row = houseCoverageForRaces(races, cycles, postal).find((item) => item.state === postal);
  return {
    senateFilings,
    districtsWithFilings: row?.districtsWithFilings ?? 0,
    districtsTotal: row?.districtsTotal ?? 0,
    filingsSoFarOnly: true,
  };
}

/**
 * Senate rows already loaded, plus House "X of Y" from `houseCoverageForRaces`.
 * `districtsTotal` is the apportionment on that coverage row. A zero total
 * (no apportionment for the postal) does not invent a denominator.
 */
export function stateCoverage(races: readonly Race[], postal: string, cycle?: number): StateCoverage {
  const board = stateScoreboard(races, postal, cycle);
  const lines: string[] = [];
  if (board.senateFilings > 0) lines.push(`${countPhrase(board.senateFilings, "Senate")}.`);
  if (board.districtsTotal > 0) {
    lines.push(
      `${board.districtsWithFilings} of ${board.districtsTotal} House districts have filings.`,
    );
  } else if (board.districtsWithFilings > 0) {
    lines.push(`${countPhrase(board.districtsWithFilings, "House")}.`);
  }
  return {
    empty: board.senateFilings === 0 && board.districtsWithFilings === 0,
    lines,
    scopeNote: FORM2_SCOPE_NOTE,
  };
}

/** One readable coverage sentence for a state panel or a test. */
export function filingCoverageLabel(races: readonly Race[], postal: string, cycle?: number): string {
  const coverage = stateCoverage(races, postal, cycle);
  if (coverage.lines.length === 0) return `No filings yet. ${coverage.scopeNote}`;
  return `${coverage.lines.join(" ")} ${coverage.scopeNote}`;
}

/**
 * House line for a race page. `state` null uses the 50-state rollup
 * (`state: null` on the coverage row). Missing apportionment omits "of Y".
 */
export function houseCoverageLine(
  races: readonly Race[],
  cycle: number,
  state: string | null,
): string | null {
  const rows = houseCoverageForRaces(races, [cycle], state);
  const row = state ? rows.find((item) => item.state === state) : rows.find((item) => item.state === null);
  if (!row) return null;
  if (row.districtsTotal > 0) {
    return `${row.districtsWithFilings} of ${row.districtsTotal} House districts have filings.`;
  }
  if (row.districtsWithFilings > 0) return `${countPhrase(row.districtsWithFilings, "House")}.`;
  return null;
}

/** Postal codes that have a stored Senate or House race. */
export function statesWithRaces(races: readonly Race[]): string[] {
  return [
    ...new Set(
      races
        .map((race) => race.state)
        .filter((state): state is string => state != null && state.length > 0),
    ),
  ].sort();
}

export function parseRaceIds(
  values: readonly string[],
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (values.length === 0) return { ok: false, error: "No races were requested." };
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = value.trim();
    const match = RACE_ID.exec(id);
    if (!match) return { ok: false, error: "A race id was not recognized." };
    const year = Number(match[1]);
    if (year < 1980 || year > 2100) {
      return { ok: false, error: "A race id was not recognized." };
    }
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length > MAX_RACE_IDS) {
      return { ok: false, error: "Too many races were requested." };
    }
  }
  return { ok: true, ids };
}

function countPhrase(count: number, office: string): string {
  const noun = count === 1 ? "race" : "races";
  return `${count} ${office} ${noun} with filings`;
}

function freshest(races: readonly Race[]): Race | null {
  if (races.length === 0) return null;
  return [...races].sort(byFreshest)[0] ?? null;
}

/** Newest stored write first. `raceId` breaks ties so the pick is stable. */
function byFreshest(a: Race, b: Race): number {
  const byTime = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  if (byTime !== 0) return byTime;
  return a.raceId.localeCompare(b.raceId);
}
