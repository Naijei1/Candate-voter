import assert from "node:assert/strict";
import test from "node:test";
import fixture from "./fixtures/ky-sbe-certifications.json";
import { importResults, readSbeReports } from "../scripts/import-certified-results";
import { candidateElectionStatus, generalResult, KY_FEDERAL_RACES, primaryResults } from "../src/lib/site/certified-results";
import { currentKentuckyOfficeholders } from "../src/lib/site/ky-officeholders";
import { partyMark } from "../src/components/site/PersonMark";

const district4 = "2026-house-KY-04";

test("reconciles real SBE primary tables including repeated headers on continuation pages", () => {
  const { text, sourceUrl, retrievedAt } = fixture.primary;
  const { results, rejected } = importResults(text, "primary", null, sourceUrl, retrievedAt);
  assert.deepEqual(rejected, []);
  assert.equal(results.length, 2);
  assert.equal(results[0].countyCount, 35);
  assert.deepEqual(results[0].sourcePages, [2, 3]);
  assert.deepEqual(results[0].candidates.map((person) => person.votes), [77678, 5068, 2774, 2645]);
  assert.deepEqual(results[1].candidates, [
    { name: "Ed Gallrein", party: "Republican Party", candidateId: "H6KY04171", votes: 57822, winner: true },
    { name: "Thomas Massie", party: "Republican Party", candidateId: "H2KY04121", votes: 47539, winner: false },
  ]);
});

test("drops a primary contest with mismatched totals, duplicate counties, or shifted headers", () => {
  const { text, sourceUrl, retrievedAt } = fixture.primary;
  for (const [broken, reason] of [
    [text.replace("Total Votes 77,678", "Total Votes 77,679"), /County sums disagree/],
    [text.replace("\nAllen ", "\nAdair "), /Duplicate county/],
    [text.replace("Total Votes 77,678 5,068 2,774 2,645\nJames R.", "Total Votes 77,678 5,068 2,774 2,645\nJames"), /Candidate header changed/],
  ] as const) {
    const { results, rejected } = importResults(broken, "primary", null, sourceUrl, retrievedAt);
    assert.deepEqual(results.map((result) => result.raceId), [district4]);
    assert.equal(rejected.length, 1);
    assert.match(rejected[0], reason);
  }
});

test("reads the certified general layout including repeated write-in party columns", () => {
  const { verified, rejected } = readSbeReports(fixture.general.text, "general", 2024);
  assert.deepEqual(rejected, []);
  assert.equal(verified[0].countyCount, 1);
  assert.deepEqual(verified[0].candidates.map(({ name, party, votes }) => [name, party, votes]), [
    ["Morgan McGarvey", "Democratic Party", 203100],
    ["Mike Craven", "Republican Party", 124713],
    ["Daniel Cobble", "Write-in", 27],
    ["Jared Randall", "Write-in", 24],
  ]);
});

test("rejects historical and unofficial documents and requires a verified date for the general", () => {
  const source = fixture.general.sourceUrl;
  assert.throws(() => importResults(fixture.general.text, "general", "2026-11-23", source, "2026-11-23"), /official 2026 election/);
  assert.throws(() => importResults("Unofficial 2026 General Election Results", "general", "2026-11-23", source, "2026-11-23"), /official 2026 election/);
  assert.throws(() => importResults("Official 2026 General Election Results", "general", null, source, "2026-11-23"), /verified certification date/);
});

test("the published primary includes all reconciled tables and marks winners and losers", () => {
  const primary = KY_FEDERAL_RACES.flatMap(primaryResults);
  assert.equal(primary.length, 11);
  assert.equal(primary.flatMap((result) => result.candidates).length, 54);
  const senate = primaryResults("2026-senate-KY");
  assert.ok(senate.every((result) => result.countyCount === 120));
  assert.ok(senate.flatMap((result) => result.candidates).some((candidate) => candidate.name === "Michael James Faris"));
  assert.equal(candidateElectionStatus(district4, { id: "H2KY04121", name: "Thomas Massie", party: "Republican Party" }).primary, "lost");
  assert.equal(candidateElectionStatus(district4, { id: "H6KY04171", name: "Ed Gallrein", party: "Republican Party" }).primary, "won");
});

test("every Kentucky general race has a sourced results record and pending records contain no totals", () => {
  for (const race of KY_FEDERAL_RACES) {
    const result = generalResult(race);
    assert.ok(result?.sourceUrl.startsWith("https://"));
    if (result?.status !== "pending") continue;
    assert.equal(result.scheduledCertificationDate, "2026-11-23");
    assert.equal("candidates" in result, false);
    assert.equal(candidateElectionStatus(race, { name: "Andy Barr", party: "Republican Party" }).elected, false);
  }
});

test("the current delegation includes both senators and Massie through noon ET on January 3", () => {
  const current = currentKentuckyOfficeholders(new Date("2027-01-03T16:59:59Z"));
  assert.deepEqual(current.filter((member) => member.office === "senate").map((member) => member.name), ["Mitch McConnell", "Rand Paul"]);
  assert.deepEqual(current.filter((member) => member.office === "house").map((member) => member.district), [1, 2, 3, 4, 5, 6]);
  assert.equal(current.find((member) => member.district === 4)?.name, "Thomas Massie");
  assert.equal(currentKentuckyOfficeholders(new Date("2027-01-03T17:00:00Z")).some((member) => member.district === 4), false);
  assert.equal(partyMark("Kentucky Party").letter, "KP");
});
