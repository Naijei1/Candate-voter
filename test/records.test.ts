import assert from "node:assert/strict";
import test from "node:test";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL, canonicalRaceId } from "../src/lib/data/at-large";
import { consolidatePresidentialDuplicates } from "../src/lib/data/consolidate";
import { houseCoverageForRaces } from "../src/lib/data/coverage";
import { planPresidentialDuplicates } from "../src/lib/data/dedupe";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { normalizePersonName } from "../src/lib/data/names";
import { loadVisibleCandidates, loadVisibleRace, visibleRaces } from "../src/lib/data/view";
import { executeChatTool } from "../src/lib/chat/tools";
import type { Candidate, Filing, Race } from "../src/lib/types";

const updatedAt = "2026-10-26T05:00:00.000Z";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/candidates/?district=01",
    updatedAt,
    ...partial,
  };
}

function candidate(
  partial: Pick<Candidate, "candidateId" | "displayName" | "raceId" | "office"> &
    Partial<Candidate>,
): Candidate {
  return {
    nameAsFiled: partial.displayName,
    partyAffiliation: "REP",
    fecCandidateId: partial.candidateId,
    sourceUrl: null,
    sourceLoadedAt: "2026-10-01 00:00:00",
    updatedAt,
    ...partial,
  };
}

test("name normalization drops n/a and keeps initials", () => {
  assert.equal(normalizePersonName("CYRUS SAJNA"), "Cyrus Sajna");
  assert.equal(normalizePersonName("James n/a Athans"), "James Athans");
  assert.equal(normalizePersonName("N/A"), null);
  assert.equal(normalizePersonName("JJ JOHNSON"), "JJ Johnson");
  assert.equal(normalizePersonName("Byron D.A. Ivey"), "Byron D.A. Ivey");
  assert.equal(normalizePersonName("Deja Maria Golden"), "Deja Maria Golden");
  assert.equal(normalizePersonName("O'BRIEN"), "O'Brien");
});

test("house seat totals and Wyoming aliases", () => {
  const total = Object.values(HOUSE_SEATS).reduce((sum, seats) => sum + seats, 0);
  assert.equal(total, HOUSE_SEATS_TOTAL);
  assert.equal(HOUSE_SEATS_TOTAL, 435);
  assert.equal(canonicalRaceId("2026-house-WY-01"), "2026-house-WY-00");
  assert.equal(canonicalRaceId("2026-house-MT-01"), "2026-house-MT-01");
  assert.equal(canonicalRaceId("2026-senate-WY"), "2026-senate-WY");
});

test("visible races fold Wyoming district 1 into at-large and count it once", async () => {
  const races = visibleRaces([
    race({
      raceId: "2026-house-WY-01",
      office: "house",
      cycle: 2026,
      state: "WY",
      district: "01",
      title: "U.S. House, Wyoming District 1",
      jurisdiction: "Wyoming District 1",
    }),
    race({
      raceId: "2026-house-WY-00",
      office: "house",
      cycle: 2026,
      state: "WY",
      district: "00",
      title: "U.S. House, Wyoming at-large",
      jurisdiction: "Wyoming at-large",
      sourceUrl: "https://www.fec.gov/data/candidates/?district=00",
    }),
    race({
      raceId: "2026-house-CA-07",
      office: "house",
      cycle: 2026,
      state: "CA",
      district: "07",
      title: "U.S. House, California District 7",
    }),
  ]);
  assert.deepEqual(
    races.map((item) => item.raceId),
    ["2026-house-CA-07", "2026-house-WY-00"],
  );
  assert.equal(races.find((item) => item.state === "WY")?.title, "U.S. House, Wyoming at-large");

  const coverage = houseCoverageForRaces(races, [2026], "WY");
  assert.deepEqual(coverage, [
    { cycle: 2026, state: "WY", districtsWithFilings: 1, districtsTotal: 1 },
  ]);

  const repo = new MemoryVoterRepository();
  for (const item of [
    race({
      raceId: "2026-house-WY-01",
      office: "house",
      cycle: 2026,
      state: "WY",
      district: "01",
      title: "U.S. House, Wyoming District 1",
    }),
  ]) {
    await repo.upsertRace(item);
  }
  await repo.upsertCandidate(
    candidate({
      candidateId: "H6WY01181",
      displayName: "Richard L Dodson",
      raceId: "2026-house-WY-01",
      office: "house",
    }),
  );
  const visible = await loadVisibleRace(repo, "2026-house-WY-01");
  assert.equal(visible?.raceId, "2026-house-WY-00");
  assert.equal(visible?.title, "U.S. House, Wyoming at-large");
  const filers = await loadVisibleCandidates(repo, "2026-house-WY-00");
  assert.deepEqual(
    filers.map((item) => item.displayName),
    ["Richard L Dodson"],
  );
});

test("presidential duplicates collapse on read and consolidate copies filings", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({ raceId: "2028-president", office: "president", cycle: 2028, title: "President" }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "P80009640",
      displayName: "Cyrus Sajna",
      raceId: "2028-president",
      office: "president",
    }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "P00006890",
      displayName: "CYRUS SAJNA",
      raceId: "2028-president",
      office: "president",
    }),
  );
  const filing = (id: string, candidateId: string): Filing => ({
    filingId: id,
    candidateId,
    raceId: "2028-president",
    formType: "F2",
    fecFilingId: id,
    imageNumber: null,
    filedAt: null,
    fecLoadTimestamp: "2026-05-01 00:00:00",
    sourceUrl: "https://docquery.fec.gov/cgi-bin/fecimg/?1",
    retrievedAt: updatedAt,
    updatedAt,
  });
  await repo.upsertFiling(filing("1", "P80009640"));
  await repo.upsertFiling(filing("2", "P00006890"));

  const plans = planPresidentialDuplicates(await repo.listCandidatesForRace("2028-president"));
  assert.equal(plans.length, 1);
  assert.equal(plans[0]?.keep, "P00006890");
  assert.deepEqual(plans[0]?.drop, ["P80009640"]);

  const visible = await loadVisibleCandidates(repo, "2028-president");
  assert.deepEqual(
    visible.map((item) => item.candidateId),
    ["P00006890"],
  );
  assert.equal(visible[0]?.displayName, "Cyrus Sajna");

  const dry = await consolidatePresidentialDuplicates(repo, [2028], { apply: false });
  assert.equal(dry.dryRun, true);
  assert.equal(dry.copiedFilings, 0);
  assert.equal((await repo.listCandidatesForRace("2028-president")).length, 2);

  const applied = await consolidatePresidentialDuplicates(repo, [2028], { apply: true });
  assert.equal(applied.copiedFilings, 1);
  assert.equal(await repo.getCandidate("P80009640"), null);
  const kept = await repo.listFilingsForCandidate("P00006890");
  assert.deepEqual(
    kept.map((item) => item.filingId).sort(),
    ["1", "2"],
  );
});

test("chat coverage tool reports filings so far", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-house-WY-00",
      office: "house",
      cycle: 2026,
      state: "WY",
      district: "00",
      title: "U.S. House, Wyoming at-large",
    }),
  );
  const result = await executeChatTool(
    "get_coverage",
    { cycle: 2026, state: "WY" },
    { repo, env: {}, now: new Date("2026-10-26T12:00:00.000Z"), root: "https://voter.example" },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.content.filingsSoFarOnly, true);
  assert.deepEqual(result.content.house, [
    { cycle: 2026, state: "WY", districtsWithFilings: 1, districtsTotal: 1 },
  ]);

  const blocked = await executeChatTool(
    "list_races",
    { office: "senate", cycle: 2026 },
    { repo, env: {}, now: new Date("2026-10-26T12:00:00.000Z"), root: "https://voter.example" },
  );
  assert.equal(blocked.ok, false);
  if (blocked.ok) return;
  assert.match(blocked.message, /state/i);
});
