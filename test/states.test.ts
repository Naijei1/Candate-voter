import assert from "node:assert/strict";
import test from "node:test";
import { KY_FEDERAL_RACES, KY_RESULTS_SOURCE } from "../src/lib/site/certified-results";
import { KY_RESULTS_LINKS, kentuckyResultsPhase } from "../src/lib/site/ky-results";
import { isKentuckyFederalRaceId } from "../src/lib/site/ky-race-id";
import { followReturnPath } from "../src/lib/auth/return-path";
import { DEFAULT_STATE, enabledStates, federalRaceIds, houseDistrictCodes, isStateCode, stateConfig, statePath } from "../src/lib/states";

test("Kentucky is the only enabled state and the default", () => {
  assert.equal(DEFAULT_STATE, "KY");
  assert.deepEqual(enabledStates().map((state) => state.code), ["KY"]);
  assert.equal(isStateCode("KY"), true);
  assert.equal(isStateCode("OH"), false);
  assert.equal(statePath(stateConfig()), "/states/ky");
});

test("registry reproduces the Kentucky race ids and results links", () => {
  assert.deepEqual([...KY_FEDERAL_RACES], [
    "2026-senate-KY", "2026-house-KY-01", "2026-house-KY-02", "2026-house-KY-03",
    "2026-house-KY-04", "2026-house-KY-05", "2026-house-KY-06",
  ]);
  assert.equal(KY_RESULTS_SOURCE, "KY State Board of Elections");
  assert.equal(KY_RESULTS_LINKS[1].href, "https://elect.ky.gov/results/2020-2029/Pages/2026.aspx");
  assert.equal(KY_RESULTS_LINKS[0].href, "https://vrsws.sos.ky.gov/liveresults/");
});

test("race id check keeps the Kentucky district range", () => {
  for (const id of ["2026-senate-KY", "2026-house-KY-01", "2026-house-KY-06", "2024-house-KY-03"]) assert.equal(isKentuckyFederalRaceId(id), true, id);
  for (const id of ["2026-house-KY-07", "2026-house-KY-00", "2026-senate-OH", "2026-house-OH-01", "26-senate-KY", "2026-house-KY-1"]) assert.equal(isKentuckyFederalRaceId(id), false, id);
});

test("at-large states use district 00", () => {
  const atLarge = { ...stateConfig(), houseDistricts: 1 };
  assert.deepEqual(houseDistrictCodes(atLarge), ["00"]);
  assert.deepEqual(federalRaceIds(atLarge, 2028), ["2028-senate-KY", "2028-house-KY-00"]);
});

test("poll closing follows both Kentucky time zones", () => {
  assert.equal(kentuckyResultsPhase(new Date("2026-11-03T22:30:00Z")), "before");
  assert.equal(kentuckyResultsPhase(new Date("2026-11-03T23:30:00Z")), "partial");
  assert.equal(kentuckyResultsPhase(new Date("2026-11-04T00:30:00Z")), "closed");
});

test("follow return paths come from enabled states", () => {
  assert.equal(followReturnPath("/states/ky"), "/states/ky");
  assert.equal(followReturnPath("/states/oh"), null);
});
