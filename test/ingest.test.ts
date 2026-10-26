import assert from "node:assert/strict";
import test from "node:test";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { runIngest } from "../src/lib/ingest/run";
import type { FetchedForm2Page } from "../src/lib/fec/client";
import type { FecForm2Filing } from "../src/lib/fec/types";

const older: FecForm2Filing = {
  candidate_id: "H4CA12019",
  candidate_first_name: "Jane",
  candidate_last_name: "Doe",
  candidate_office: "H",
  candidate_party: "DEM",
  candidate_district: "12",
  election_state: "CA",
  election_year: "2026",
  file_number: 1,
  load_timestamp: "2026-01-01 00:00:00",
  pdf_url: "https://docquery.fec.gov/pdf/1.pdf",
};

const newer: FecForm2Filing = {
  ...older,
  candidate_first_name: "Janet",
  candidate_party: "IND",
  file_number: 2,
  load_timestamp: "2026-02-01 00:00:00",
};

function client(pages: FetchedForm2Page[]) {
  return {
    async *iterateForm2() {
      for (const page of pages) yield page;
    },
  };
}

test("upserts filings idempotently and does not regress a newer candidate", async () => {
  const repo = new MemoryVoterRepository();
  const now = new Date("2026-10-26T05:00:00.000Z");
  const pages: FetchedForm2Page[] = [
    { page: 1, pages: 1, perPage: 100, results: [older, newer] },
  ];

  const first = await runIngest({
    repo,
    fec: client(pages),
    now: () => now,
    dryRun: true,
  });
  assert.equal(first.filingsUpserted, 2);
  assert.equal(first.candidatesApplied, 2);
  assert.equal(first.racesTouched, 1);
  assert.deepEqual(first.cyclesTouched, [2026]);
  assert.equal(first.watermark, "2026-02-01 00:00:00");

  const candidate = await repo.getCandidate("H4CA12019");
  assert.equal(candidate?.displayName, "Janet Doe");
  assert.equal(candidate?.partyAffiliation, "IND");
  const filings = await repo.listFilingsForCandidate("H4CA12019");
  assert.deepEqual(
    filings.map((filing) => filing.filingId),
    ["1", "2"],
  );
  const races = await repo.listRacesByCycle(2026);
  assert.equal(races[0]?.raceId, "2026-house-CA-12");
  assert.equal(races[0]?.sourceUrl?.includes("fec.gov"), true);

  const second = await runIngest({
    repo,
    fec: client([{ page: 1, pages: 1, perPage: 100, results: [older] }]),
    now: () => now,
    minLoadTimestamp: "2026-01-01 00:00:00",
  });
  assert.equal(second.candidatesApplied, 0);
  assert.equal(second.candidatesKeptNewer, 1);
  assert.equal(second.filingsUpserted, 1);
  const after = await repo.getCandidate("H4CA12019");
  assert.equal(after?.displayName, "Janet Doe");
  assert.equal(after?.partyAffiliation, "IND");
  assert.equal((await repo.listFilingsForCandidate("H4CA12019")).length, 2);
  assert.equal((await repo.getWatermark())?.lastLoadTimestamp, "2026-02-01 00:00:00");
});

test("presidential filings for the same person share one candidate id", async () => {
  const repo = new MemoryVoterRepository();
  const base = {
    candidate_office: "P",
    candidate_party: "REP",
    election_year: 2028,
    load_timestamp: "2026-05-01 00:00:00",
  };
  await runIngest({
    repo,
    fec: client([
      {
        page: 1,
        pages: 1,
        perPage: 100,
        results: [
          {
            ...base,
            candidate_id: "P80009640",
            candidate_first_name: "CYRUS",
            candidate_last_name: "SAJNA",
            file_number: 11,
          },
          {
            ...base,
            candidate_id: "P00006890",
            candidate_name: "SAJNA, CYRUS",
            file_number: 12,
            load_timestamp: "2026-05-02 00:00:00",
          },
        ],
      },
    ]),
    now: () => new Date("2026-10-26T05:00:00.000Z"),
  });
  const candidates = await repo.listCandidatesForRace("2028-president");
  assert.deepEqual(
    candidates.map((candidate) => candidate.candidateId),
    ["P80009640"],
  );
  assert.equal(candidates[0]?.displayName, "Cyrus Sajna");
  const filings = await repo.listFilingsForCandidate("P80009640");
  assert.deepEqual(
    filings.map((filing) => filing.filingId).sort(),
    ["11", "12"],
  );
  assert.equal(await repo.getCandidate("P00006890"), null);
});

test("records a skip and still advances the cursor past it", async () => {
  const repo = new MemoryVoterRepository();
  const summary = await runIngest({
    repo,
    fec: client([
      {
        page: 1,
        pages: 1,
        perPage: 100,
        results: [
          { file_number: 5, load_timestamp: "2026-04-01 00:00:00", candidate_office: "X" },
        ],
      },
    ]),
    now: () => new Date("2026-10-26T05:00:00.000Z"),
  });
  assert.equal(summary.skipped, 1);
  assert.equal(summary.skipReasons["unsupported-office"], 1);
  assert.equal(summary.filingsUpserted, 0);
  assert.equal(summary.watermark, "2026-04-01 00:00:00");
  const watermark = await repo.getWatermark();
  assert.equal(watermark?.lastStatus, "success");
  assert.equal(watermark?.source, "fec-efile-form2");
  assert.equal(watermark?.updatedAt, "2026-10-26T05:00:00.000Z");
});
