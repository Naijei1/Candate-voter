import assert from "node:assert/strict";
import test from "node:test";
import { KY_FEDERAL_RACES, KY_RESULTS_SOURCE } from "../src/lib/site/certified-results";
import { KY_RESULTS_LINKS, kentuckyResultsPhase } from "../src/lib/site/ky-results";
import { isKentuckyFederalRaceId } from "../src/lib/site/ky-race-id";
import { followReturnPath } from "../src/lib/auth/return-path";
import { ASK_INTRO } from "../src/lib/chat/scope";
import { CLARIFY_RACE_MARKDOWN } from "../src/lib/chat/intent";
import { CHAT_SYSTEM_PROMPT, VOTING_ADVICE_MARKDOWN } from "../src/lib/chat/prompt";
import { askSampleQuestions } from "../src/lib/chat/state-copy";
import { DEFAULT_STATE, enabledStates, federalRaceIds, houseDistrictCodes, isStateCode, mentionedHouseDistrict, stateConfig, statePath } from "../src/lib/states";

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
  assert.deepEqual([...KY_FEDERAL_RACES], federalRaceIds(stateConfig("KY")));
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

test("Ask copy and the district check still read as Kentucky", () => {
  assert.equal(ASK_INTRO, "Ask about Kentucky’s races.");
  assert.equal(CLARIFY_RACE_MARKDOWN, "This guide covers Kentucky. Which race should I look at?\n\nI can list who officially filed to run. For example, U.S. Senate or U.S. House District 3.");
  assert.equal(VOTING_ADVICE_MARKDOWN, "I can't tell you who to vote for. I can show who filed for each Kentucky race and what they've reported.");
  assert.match(CHAT_SYSTEM_PROMPT, /guide to Kentucky's U\.S\. Senate and U\.S\. House races/);
  assert.match(CHAT_SYSTEM_PROMPT, /answer for Kentucky: its U\.S\. Senate race and its six U\.S\. House districts/);
  assert.deepEqual(askSampleQuestions(), [
    "Who is running for U.S. Senate in Kentucky?",
    "Who is running in District 3?",
    "What did Kentucky candidates say about health care?",
  ]);
  assert.equal(mentionedHouseDistrict("Who is running in District 3?"), "3");
  assert.equal(mentionedHouseDistrict("district 03"), "3");
  assert.equal(mentionedHouseDistrict("District 6"), "6");
  assert.equal(mentionedHouseDistrict("District 7"), null);
  assert.equal(mentionedHouseDistrict("District 10"), null);
});

test("follow return paths come from enabled states", () => {
  assert.equal(followReturnPath("/states/ky"), "/states/ky");
  assert.equal(followReturnPath("/states/oh"), null);
});
