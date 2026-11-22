import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generalCertificateFixture } from "./fixtures/ky-2026-general-certificate";
import fixture from "./fixtures/ky-sbe-certifications.json";
import { importResults, readSbeReports, replaceCertifiedResults } from "../scripts/import-certified-results";
import { candidateElectionStatus, generalResult, KY_FEDERAL_RACES, primaryResults } from "../src/lib/site/certified-results";
import { kyBallot } from "../src/lib/site/ky-ballot";
import { currentKentuckyOfficeholders } from "../src/lib/site/ky-officeholders";
import { partyMark } from "../src/components/site/PersonMark";

const district4 = "2026-house-KY-04";

test("reconciles real SBE primary tables including repeated headers on continuation pages", () => {
  const { verified: results, rejected } = readSbeReports(fixture.primary.text, "primary");
  assert.deepEqual(rejected, []);
  assert.equal(results.length, 2);
  assert.equal(results[0].countyCount, 35);
  assert.deepEqual(results[0].pages, [2, 3]);
  assert.deepEqual(results[0].candidates.map((person) => person.votes), [77678, 5068, 2774, 2645]);
  assert.deepEqual(results[1].candidates, [
    { name: "Ed Gallrein", party: "Republican Party", candidateId: "H6KY04171", votes: 57822, winner: true },
    { name: "Thomas Massie", party: "Republican Party", candidateId: "H2KY04121", votes: 47539, winner: false },
  ]);
});

test("rejects a primary import with mismatched totals, duplicate counties, or shifted headers", () => {
  const { text, sourceUrl, retrievedAt } = fixture.primary;
  for (const [broken, reason] of [
    [text.replace("Total Votes 77,678", "Total Votes 77,679"), /County sums disagree/],
    [text.replace("\nAllen ", "\nAdair "), /Duplicate county/],
    [text.replace("Total Votes 77,678 5,068 2,774 2,645\nJames R.", "Total Votes 77,678 5,068 2,774 2,645\nJames"), /Candidate header changed/],
  ] as const) {
    assert.throws(() => importResults(broken, "primary", null, sourceUrl, retrievedAt), reason);
  }
});

test("replaces results only after every expected contest reconciles", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "ky-certified-import-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = "ky-certified-results.json";
  const output = join(dir, filename);
  const existing = await readFile(new URL(`../data/${filename}`, import.meta.url), "utf8");
  await writeFile(output, existing);
  const { text, sourceUrl, retrievedAt } = fixture.primary;
  for (const [certificate, reason] of [
    [text.replace("Total Votes 77,678", "Total Votes 77,679"), /County sums disagree/],
    [text, /Missing certified primary contests: .*2026-house-KY-04:Democratic Party/],
  ] as const) {
    await assert.rejects(replaceCertifiedResults(output, certificate, "primary", null, sourceUrl, retrievedAt), reason);
    assert.equal(await readFile(output, "utf8"), existing);
    assert.deepEqual(await readdir(dir), [filename]);
  }

  const date = "2026-11-23";
  const generalInput = [generalCertificateFixture(), "general", date, fixture.general.sourceUrl, date] as const;
  const { results } = importResults(...generalInput);
  assert.equal(await replaceCertifiedResults(output, ...generalInput), 7);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), [...KY_FEDERAL_RACES.flatMap(primaryResults), ...results]);
  assert.deepEqual(await readdir(dir), [filename]);
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

test("imports all seven general contests with ballot names and a verified certification date", () => {
  const text = generalCertificateFixture();
  const source = fixture.general.sourceUrl;
  const date = "2026-11-23";
  const retrievedAt = "2026-11-24";
  const { results, rejected } = importResults(text, "general", date, source, retrievedAt);
  assert.deepEqual(rejected, []);
  assert.deepEqual(results.map(({ raceId }) => raceId), [...KY_FEDERAL_RACES]);
  for (const result of results) {
    assert.equal(result.election, "general");
    assert.equal(result.certificationDate, date);
    assert.deepEqual(
      result.candidates.map(({ name, candidateId }) => [name, candidateId]),
      kyBallot(result.raceId)!.people.filter(({ role }) => role === "nominee").map(({ name, id }) => [name, id]),
    );
  }
  for (const invalidDate of [null, "2026-11-02", "2026-11-25", "2026-11-31"]) {
    assert.throws(() => importResults(text, "general", invalidDate, source, retrievedAt), /verified certification date/);
  }
});

test("rejects a general certificate missing a contest or a ballot nominee", () => {
  const date = "2026-11-23";
  const source = fixture.general.sourceUrl;
  const missingContest = generalCertificateFixture().split("\f").slice(0, -1).join("\f");
  assert.throws(() => importResults(missingContest, "general", date, source, date), /Missing certified general contests: 2026-house-KY-06/);
  const missingCandidate = generalCertificateFixture("Jeremy Todd");
  assert.throws(() => importResults(missingCandidate, "general", date, source, date), /Verify omitted ballot candidates for 2026-house-KY-04: Jeremy Todd/);
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
