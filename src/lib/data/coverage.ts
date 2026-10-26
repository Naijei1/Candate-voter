import type { Race } from "../types";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL } from "./at-large";
import { visibleRaces } from "./view";

export const FORM2_SCOPE = "fec-efile-form2" as const;

export const FORM2_SCOPE_NOTE =
  "Counts are FEC Form 2 electronic filings stored so far, not a full ballot or a certified candidate list.";

export type HouseCoverageRow = {
  cycle: number;
  /** Postal state, or null for the 50-state House total. */
  state: string | null;
  districtsWithFilings: number;
  districtsTotal: number;
};

/**
 * House districts that have at least one stored Form 2 race.
 * `districtsTotal` is the 2020 census apportionment (435), including
 * single-seat states as one district. Territories are not in that total.
 */
export function houseCoverageForRaces(
  races: readonly Race[],
  cycles: readonly number[],
  state: string | null,
): HouseCoverageRow[] {
  const visible = visibleRaces(races);
  const rows: HouseCoverageRow[] = [];
  for (const cycle of cycles) {
    const house = visible.filter(
      (race) => race.office === "house" && race.cycle === cycle && race.state,
    );
    if (state) {
      rows.push({
        cycle,
        state,
        districtsWithFilings: house.filter((race) => race.state === state).length,
        districtsTotal: HOUSE_SEATS[state] ?? 0,
      });
      continue;
    }
    const byState = new Map<string, number>();
    for (const race of house) {
      if (!race.state || HOUSE_SEATS[race.state] == null) continue;
      byState.set(race.state, (byState.get(race.state) ?? 0) + 1);
    }
    let filed = 0;
    for (const count of byState.values()) filed += count;
    rows.push({
      cycle,
      state: null,
      districtsWithFilings: filed,
      districtsTotal: HOUSE_SEATS_TOTAL,
    });
    for (const postal of [...byState.keys()].sort()) {
      rows.push({
        cycle,
        state: postal,
        districtsWithFilings: byState.get(postal) ?? 0,
        districtsTotal: HOUSE_SEATS[postal] ?? 0,
      });
    }
  }
  return rows;
}
