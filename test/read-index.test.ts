import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import {
  listRacesForCycles,
  racesByOffice,
  sortCandidates,
  sortFilings,
} from "../src/lib/data/read";
import type { Candidate, Filing, Race } from "../src/lib/types";

const updatedAt = "2026-10-26T05:00:00.000Z";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/candidates/",
    updatedAt,
    ...partial,
  };
}

function candidate(partial: Pick<Candidate, "candidateId" | "displayName" | "partyAffiliation">): Candidate {
  return {
    raceId: "2026-senate-CA",
    nameAsFiled: null,
    office: "senate",
    fecCandidateId: partial.candidateId,
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt,
    ...partial,
  };
}

test("listRacesForCycles fills even-year ballots and omits empty odd years", async () => {
  const repo = new MemoryVoterRepository();
  const bare = await listRacesForCycles(repo, [2026, 2027, 2028]);
  assert.deepEqual(
    bare.map((group) => group.cycle),
    [2026, 2028],
  );
  assert.equal(
    bare[0]?.races.some((item) => item.raceId === "2026-senate-NY"),
    false,
  );

  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
      state: "CA",
      jurisdiction: "California",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2028-president",
      office: "president",
      cycle: 2028,
      title: "President",
    }),
  );

  const groups = await listRacesForCycles(repo, [2026, 2027, 2028]);
  assert.deepEqual(
    groups.map((group) => group.cycle),
    [2026, 2028],
  );
  assert.deepEqual(
    racesByOffice(groups[0]?.races ?? []).map((group) => group.office),
    ["senate", "house"],
  );
  const storedSenate = groups[0]?.races.find((item) => item.raceId === "2026-senate-CA");
  assert.equal(storedSenate?.empty, undefined);
  assert.equal(
    groups[1]?.races.some((item) => item.raceId === "2028-president" && item.empty !== true),
    true,
  );
});

test("candidates sort by display name and filings by load time, not by party", () => {
  const sorted = sortCandidates([
    candidate({ candidateId: "S8CA00002", displayName: "Zoe Nguyen", partyAffiliation: "DEM" }),
    candidate({ candidateId: "S8CA00001", displayName: "Ada Klein", partyAffiliation: "REP" }),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.displayName),
    ["Ada Klein", "Zoe Nguyen"],
  );

  const filings: Filing[] = [
    {
      filingId: "1",
      candidateId: "S8CA00001",
      raceId: "2026-senate-CA",
      formType: "F2",
      fecFilingId: "1",
      imageNumber: null,
      filedAt: null,
      fecLoadTimestamp: "2026-10-01 00:00:00",
      sourceUrl: "https://docquery.fec.gov/cgi-bin/fecimg/?1",
      retrievedAt: updatedAt,
      updatedAt,
    },
    {
      filingId: "2",
      candidateId: "S8CA00001",
      raceId: "2026-senate-CA",
      formType: "F2",
      fecFilingId: "2",
      imageNumber: null,
      filedAt: "2026-10-02T00:00:00.000Z",
      fecLoadTimestamp: "2026-10-02 00:00:00",
      sourceUrl: "https://docquery.fec.gov/cgi-bin/fecimg/?2",
      retrievedAt: updatedAt,
      updatedAt,
    },
  ];
  assert.deepEqual(
    sortFilings(filings).map((filing) => filing.filingId),
    ["2", "1"],
  );
  assert.equal(filings[0]?.filedAt, null);
});

test("production pages do not import placeholders", () => {
  const pages = [
    "src/app/page.tsx",
    "src/app/races/[raceId]/page.tsx",
    "src/app/candidates/[candidateId]/page.tsx",
    "src/components/SiteFooter.tsx",
    "src/components/SiteHeader.tsx",
  ];
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.equal(source.includes("placeholders"), false, page);
    assert.equal(source.includes("generateStaticParams"), false, page);
    assert.equal(source.includes("SampleBanner"), false, page);
  }
  const readers = readFileSync("src/lib/data/read.ts", "utf8");
  assert.match(readers, /createDynamoRepository\(/);
});
