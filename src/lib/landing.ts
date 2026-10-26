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

/** President for the year, plus Senate and House races in one state. */
export function stateRaces(races: readonly Race[], postal: string): Race[] {
  return races
    .filter((race) => race.office === "president" || race.state === postal)
    .sort((a, b) => {
      const byOffice = OFFICE_ORDER.indexOf(a.office) - OFFICE_ORDER.indexOf(b.office);
      if (byOffice !== 0) return byOffice;
      const byDistrict = (a.district ?? "").localeCompare(b.district ?? "");
      if (byDistrict !== 0) return byDistrict;
      return a.raceId.localeCompare(b.raceId);
    });
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
