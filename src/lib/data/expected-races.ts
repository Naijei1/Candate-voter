import type { FederalOffice, Race } from "../types";
import { buildRaceId, fecContestSearchUrl } from "../fec/map-form2";
import {
  HOUSE_SEATS,
  canonicalRaceId,
  houseContestJurisdiction,
  houseContestTitle,
  houseDistrictCodes,
  isListedHouseDistrict,
} from "./at-large";
import { parseCycle } from "./cycles";
import { senateSeatUp } from "./senate-classes";
import { stateName } from "./states";

const HOUSE_ID = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/;
const SENATE_ID = /^(\d{4})-senate-([A-Z]{2})$/;

export type ExpectedRaceFilter = {
  state?: string | null;
  office?: FederalOffice | null;
};

/**
 * Stored races plus ballot stubs for contests that have no Form 2 row.
 * House: every apportioned district in an even year, including at-large
 * `00`. Senate: one race when that state's class is up. Odd years and
 * off-cycle Senate seats are left to stored rows (specials). Stubs are
 * not written to DynamoDB.
 */
export function appendExpectedRaces(
  races: readonly Race[],
  cycles: readonly number[],
  filter: ExpectedRaceFilter = {},
): Race[] {
  const byId = new Map<string, Race>();
  for (const race of races) {
    const raceId = canonicalRaceId(race.raceId);
    if (!listedHouseId(raceId)) continue;
    const current = byId.get(raceId);
    if (!current || (current.empty === true && race.empty !== true)) {
      byId.set(raceId, race);
    }
  }

  const office = filter.office ?? null;
  if (office !== "president") {
    const states = filter.state ? [filter.state] : Object.keys(HOUSE_SEATS).sort();
    for (const cycle of cycles) {
      if (!onHouseBallot(cycle)) continue;
      for (const state of states) {
        if (HOUSE_SEATS[state] == null) continue;
        if (office == null || office === "house") {
          for (const district of houseDistrictCodes(state)) {
            const raceId = buildRaceId({ office: "house", cycle, state, district });
            if (!byId.has(raceId)) byId.set(raceId, houseStub(cycle, state, district));
          }
        }
        if ((office == null || office === "senate") && senateSeatUp(state, cycle)) {
          const raceId = buildRaceId({
            office: "senate",
            cycle,
            state,
            district: null,
          });
          if (!byId.has(raceId)) byId.set(raceId, senateStub(cycle, state));
        }
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.raceId.localeCompare(b.raceId));
}

/**
 * Stub for a well-formed contest id that is on the ballot and not stored.
 * Legacy at-large ids (`…-01`) resolve to district `00`. Off-cycle and
 * unknown districts return null.
 */
export function expectedRaceById(raceId: string): Race | null {
  const canonical = canonicalRaceId(raceId);
  const house = HOUSE_ID.exec(canonical);
  if (house?.[1] && house[2] && house[3]) {
    const cycle = Number(house[1]);
    const state = house[2];
    const district = house[3];
    if (!onHouseBallot(cycle)) return null;
    if (!houseDistrictCodes(state).includes(district)) return null;
    return houseStub(cycle, state, district);
  }
  const senate = SENATE_ID.exec(canonical);
  if (senate?.[1] && senate[2]) {
    const cycle = Number(senate[1]);
    const state = senate[2];
    if (!senateSeatUp(state, cycle)) return null;
    return senateStub(cycle, state);
  }
  return null;
}

/** A stored multi-seat `00` row is not a contest. Single-seat `00` stays. */
function listedHouseId(raceId: string): boolean {
  const house = HOUSE_ID.exec(raceId);
  if (!house?.[2] || !house[3]) return true;
  return isListedHouseDistrict(house[2], house[3]);
}

function onHouseBallot(cycle: number): boolean {
  return parseCycle(String(cycle)) != null && cycle % 2 === 0;
}

function houseStub(cycle: number, state: string, district: string): Race {
  return {
    raceId: buildRaceId({ office: "house", cycle, state, district }),
    office: "house",
    cycle,
    state,
    district,
    title: houseContestTitle(state, district),
    jurisdiction: houseContestJurisdiction(state, district),
    sourceUrl: fecContestSearchUrl({ office: "house", cycle, state, district }),
    updatedAt: null,
    empty: true,
  };
}

function senateStub(cycle: number, state: string): Race {
  const name = stateName(state);
  return {
    raceId: buildRaceId({ office: "senate", cycle, state, district: null }),
    office: "senate",
    cycle,
    state,
    district: null,
    title: `U.S. Senate, ${name}`,
    jurisdiction: name,
    sourceUrl: fecContestSearchUrl({ office: "senate", cycle, state, district: null }),
    updatedAt: null,
    empty: true,
  };
}
