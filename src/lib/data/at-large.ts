import { stateName } from "./states";

/**
 * States and territories with one House seat (or one delegate / resident
 * commissioner). FEC sometimes files that seat as district 01. The race id
 * for that contest is district 00, "at-large".
 * Voting states here are the single-district states under the 2020 census
 * apportionment. Montana has two districts and is not in this set.
 */
export const SINGLE_SEAT_POSTALS = new Set([
  "AK",
  "AS",
  "DC",
  "DE",
  "GU",
  "MP",
  "ND",
  "PR",
  "SD",
  "VI",
  "VT",
  "WY",
]);

/** House seats by postal code. Totals follow the 2020 census apportionment. */
export const HOUSE_SEATS: Record<string, number> = {
  AL: 7,
  AK: 1,
  AZ: 9,
  AR: 4,
  CA: 52,
  CO: 8,
  CT: 5,
  DE: 1,
  FL: 28,
  GA: 14,
  HI: 2,
  ID: 2,
  IL: 17,
  IN: 9,
  IA: 4,
  KS: 4,
  KY: 6,
  LA: 6,
  ME: 2,
  MD: 8,
  MA: 9,
  MI: 13,
  MN: 8,
  MS: 4,
  MO: 8,
  MT: 2,
  NE: 3,
  NV: 4,
  NH: 2,
  NJ: 12,
  NM: 3,
  NY: 26,
  NC: 14,
  ND: 1,
  OH: 15,
  OK: 5,
  OR: 6,
  PA: 17,
  RI: 2,
  SC: 7,
  SD: 1,
  TN: 9,
  TX: 38,
  UT: 4,
  VT: 1,
  VA: 11,
  WA: 10,
  WV: 2,
  WI: 8,
  WY: 1,
};

export const HOUSE_SEATS_TOTAL = 435;

/**
 * District codes for one state's House seats under `HOUSE_SEATS`.
 * A one-seat state is at-large (`00`). Unknown postals, including
 * territories, return no codes.
 */
export function houseDistrictCodes(state: string): string[] {
  const seats = HOUSE_SEATS[state];
  if (seats == null || seats < 1) return [];
  if (seats === 1) return ["00"];
  const codes: string[] = [];
  for (let district = 1; district <= seats; district += 1) {
    codes.push(String(district).padStart(2, "0"));
  }
  return codes;
}

/**
 * Districts the race list, stubs, and ingest may emit.
 * `00` is at-large only for a single-seat state or delegate district.
 * A multi-seat state uses `01` through its apportioned count
 * (Texas is `01`–`38`, never `00`).
 */
export function isListedHouseDistrict(
  state: string | null | undefined,
  district: string | null | undefined,
): boolean {
  if (!state || !district) return false;
  if (houseDistrictCodes(state).includes(district)) return true;
  return isSingleSeat(state) && district === "00";
}

const HOUSE_RACE_ID = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/;

export function isSingleSeat(state: string | null | undefined): boolean {
  return state != null && SINGLE_SEAT_POSTALS.has(state);
}

/** District code stored on a race. Single-seat states always use `00`. */
export function canonicalDistrict(
  state: string | null | undefined,
  district: string | null | undefined,
): string | null {
  if (!district) return district ?? null;
  if (isSingleSeat(state)) return "00";
  return district;
}

export function canonicalRaceId(raceId: string): string {
  const match = HOUSE_RACE_ID.exec(raceId);
  if (!match) return raceId;
  const district = canonicalDistrict(match[2], match[3]);
  return `${match[1]}-house-${match[2]}-${district}`;
}

/**
 * Keys that should be read together. The canonical id is first.
 * District 01 is the legacy Wyoming (and other single-seat) key.
 */
export function raceIdAliases(raceId: string): string[] {
  const canonical = canonicalRaceId(raceId);
  const match = HOUSE_RACE_ID.exec(canonical);
  if (!match || !isSingleSeat(match[2]) || match[3] !== "00") return [canonical];
  const legacy = `${match[1]}-house-${match[2]}-01`;
  return canonical === legacy ? [canonical] : [canonical, legacy];
}

/**
 * District `00` on a state that elects more than one House member.
 * Texas `2026-house-TX-00` is this case. One-seat states (`WY-00`) are not.
 * A missing state with district 00 is not a real at-large seat either.
 */
export function isBogusAtLargeDistrict(
  state: string | null | undefined,
  district: string | null | undefined,
): boolean {
  return districtCode(district) === "00" && !isSingleSeat(state);
}

export function isBogusAtLargeRaceId(raceId: string): boolean {
  const match = HOUSE_RACE_ID.exec(raceId);
  if (!match?.[2] || !match[3]) return false;
  return isBogusAtLargeDistrict(match[2], match[3]);
}

/** Hide multi-district `*-house-{ST}-00` rows. Senate and real at-large seats stay. */
export function isBogusAtLargeContest(race: {
  raceId?: string | null;
  office?: string | null;
  state?: string | null;
  district?: string | null;
}): boolean {
  if (race.office != null && race.office !== "house") return false;
  if (race.raceId && isBogusAtLargeRaceId(race.raceId)) return true;
  return isBogusAtLargeDistrict(race.state, race.district);
}

function districtCode(district: string | null | undefined): string | null {
  if (!district) return null;
  const trimmed = district.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  return trimmed.padStart(2, "0");
}

export function houseContestTitle(state: string, district: string): string {
  const name = stateName(state);
  if (district === "00" && isSingleSeat(state)) return `U.S. House, ${name} at-large`;
  if (district === "00") return `U.S. House, ${name}`;
  return `U.S. House, ${name} District ${Number(district)}`;
}

export function houseContestJurisdiction(state: string, district: string): string {
  const name = stateName(state);
  if (district === "00" && isSingleSeat(state)) return `${name} at-large`;
  if (district === "00") return name;
  return `${name} District ${Number(district)}`;
}
