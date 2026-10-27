import assert from "node:assert/strict";
import test from "node:test";
import type { ApiDeps } from "../src/lib/api/deps";
import { getCandidate, getCandidateFilings, getRace, getRaces } from "../src/lib/api/handlers";
import { openApiDocument } from "../src/lib/api/openapi-document";
import {
  CHAT_INCOMPLETE_MESSAGE,
  CHAT_TIMEOUT_MESSAGE,
} from "../src/lib/chat/errors";
import { postChat, type ChatDeps } from "../src/lib/chat/handler";
import { createRateLimiter } from "../src/lib/chat/rate-limit";
import { executeChatTool } from "../src/lib/chat/tools";
import type { ConverseFn, ConverseResponse } from "../src/lib/chat/types";
import { raceHasCandidates, signalRace } from "../src/lib/data/candidate-signal";
import { houseCoverageForRaces } from "../src/lib/data/coverage";
import { appendExpectedRaces } from "../src/lib/data/expected-races";
import { collapseIdenticalFilings } from "../src/lib/data/filings";
import { districtHasCandidates, raceForDistrict } from "../src/lib/geo/cd119";
import { stateScoreboard, statesWithRaces } from "../src/lib/landing";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import type { Candidate, Filing, Race } from "../src/lib/types";

const KEY = "test-key";
const updatedAt = "2026-10-26T05:00:00.000Z";
const now = new Date("2026-10-26T12:00:00.000Z");
const ROOT = "https://voter.example";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/elections/",
    updatedAt,
    ...partial,
  };
}

function candidate(
  partial: Pick<Candidate, "candidateId" | "displayName" | "raceId" | "office"> & Partial<Candidate>,
): Candidate {
  return {
    nameAsFiled: partial.displayName,
    partyAffiliation: "DEM",
    fecCandidateId: partial.candidateId,
    sourceUrl: `https://www.fec.gov/data/candidate/${partial.candidateId}/`,
    sourceLoadedAt: "2026-10-01 00:00:00",
    updatedAt,
    ...partial,
  };
}

function filing(partial: Pick<Filing, "filingId" | "fecLoadTimestamp"> & Partial<Filing>): Filing {
  return {
    candidateId: "H6TX00001",
    raceId: "2026-senate-TX",
    formType: "F2",
    fecFilingId: partial.filingId,
    imageNumber: null,
    filedAt: "2026-03-01",
    sourceUrl: "https://docquery.fec.gov/cgi-bin/forms/H6TX00001/1/",
    retrievedAt: updatedAt,
    updatedAt,
    ...partial,
  };
}

function deps(repo: MemoryVoterRepository): ApiDeps {
  return {
    env: { CANDATE_API_KEY: KEY },
    now,
    repository: () => repo,
  };
}

function authed(url: string): Request {
  return new Request(url, { headers: { authorization: `Bearer ${KEY}` } });
}

function chatDeps(repo: MemoryVoterRepository, converse: ConverseFn, extra: Partial<ChatDeps> = {}): ChatDeps {
  return {
    env: { CANDATE_CHAT_ENABLED: "true" },
    now,
    repository: () => repo,
    converse,
    siteRoot: ROOT,
    rateLimiter: createRateLimiter({ limit: 20, windowMs: 60_000 }),
    ...extra,
  };
}

function post(body: unknown): Request {
  return new Request("https://voter.example/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.44" },
    body: JSON.stringify(body),
  });
}

function scripted(steps: ConverseResponse[]): ConverseFn & { calls: number } {
  let calls = 0;
  const fn = (async () => {
    const step = steps[calls];
    calls += 1;
    if (!step) throw new Error("unexpected converse call");
    return step;
  }) as unknown as ConverseFn & { calls: number };
  Object.defineProperty(fn, "calls", { get: () => calls });
  return fn;
}

test("Idaho empty stubs are not a has-candidates signal", () => {
  const stubs = appendExpectedRaces([], [2026], { state: "ID" }).map(signalRace);
  assert.equal(stubs.length > 0, true);
  assert.equal(stubs.every((item) => item.empty === true && item.hasCandidates === false), true);
  assert.equal(statesWithRaces(stubs).includes("ID"), false);
  for (const district of ["01", "02"]) {
    assert.equal(districtHasCandidates(raceForDistrict(stubs, "ID", district)), false);
  }
  const board = stateScoreboard(stubs, "ID", 2026);
  assert.equal(board.senateFilings, 0);
  assert.equal(board.districtsWithFilings, 0);
  const coverage = houseCoverageForRaces(stubs, [2026], "ID");
  assert.equal(coverage[0]?.districtsWithFilings, 0);
  assert.equal(coverage[0]?.districtsTotal, 2);

  const joined = race({
    raceId: "2026-house-ID-01",
    office: "house",
    cycle: 2026,
    state: "ID",
    district: "01",
    title: "U.S. House, Idaho District 1",
    hasCandidates: false,
  });
  const withEmptyList = { ...joined, empty: undefined, candidates: [] as unknown[] };
  assert.equal(raceHasCandidates(withEmptyList), false);
  assert.equal(statesWithRaces([withEmptyList]).includes("ID"), false);
  assert.equal(districtHasCandidates(withEmptyList), false);
});

test("Solomon write-ins stay visible across Senate and House with filing metadata", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-TX",
      office: "senate",
      cycle: 2026,
      state: "TX",
      title: "U.S. Senate, Texas",
      jurisdiction: "Texas",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-house-TX-01",
      office: "house",
      cycle: 2026,
      state: "TX",
      district: "01",
      title: "U.S. House, Texas District 1",
      jurisdiction: "Texas District 1",
    }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "S6TX00644",
      displayName: "Gavin Solomon",
      raceId: "2026-senate-TX",
      office: "senate",
      partyAffiliation: "WRI",
    }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "S6TX00693",
      displayName: "Gavin Solomon",
      raceId: "2026-house-TX-01",
      office: "house",
      partyAffiliation: "W",
    }),
  );

  const senate = await getRace(authed("https://voter.example/api/v1/races/2026-senate-TX"), "2026-senate-TX", deps(repo));
  const senateBody = await senate.json();
  assert.equal(senateBody.candidates.length, 1);
  const senateRow = senateBody.candidates[0];
  assert.equal(senateRow.candidateId, "S6TX00644");
  assert.equal(senateRow.writeIn, true);
  assert.equal(senateRow.multiFiling, true);
  const fecIds = senateRow.filings.map((item: { fecId: string }) => item.fecId).sort();
  assert.deepEqual(fecIds, ["S6TX00644", "S6TX00693"]);
  const raceIds = senateRow.filings.map((item: { raceId: string }) => item.raceId).sort();
  assert.deepEqual(raceIds, ["2026-house-TX-01", "2026-senate-TX"]);
  const houseFiling = senateRow.filings.find((item: { raceId: string }) => item.raceId === "2026-house-TX-01");
  assert.equal(houseFiling.office, "house");
  assert.equal(houseFiling.district, "01");
  assert.equal(houseFiling.writeIn, true);

  const house = await getRace(authed("https://voter.example/api/v1/races/2026-house-TX-01"), "2026-house-TX-01", deps(repo));
  const houseBody = await house.json();
  assert.equal(houseBody.candidates.length, 1);
  assert.equal(houseBody.candidates[0].candidateId, "S6TX00693");
  assert.equal(houseBody.candidates[0].multiFiling, true);
  assert.equal(houseBody.candidates[0].writeIn, true);

  const direct = await getCandidate(
    authed("https://voter.example/api/v1/candidates/S6TX00644"),
    "S6TX00644",
    deps(repo),
  );
  const directBody = await direct.json();
  assert.deepEqual(directBody.candidate.alternateFilings, []);
  assert.equal(directBody.candidate.filings.length, 2);
  assert.equal(directBody.candidate.multiFiling, true);
});

test("identical Form 2 rows collapse and distinct timestamps stay", async () => {
  const sameImage = collapseIdenticalFilings([
    filing({ filingId: "old", fecLoadTimestamp: "2026-01-01 00:00:00", imageNumber: "IMG9" }),
    filing({ filingId: "new", fecLoadTimestamp: "2026-06-01 00:00:00", imageNumber: "IMG9" }),
  ]);
  assert.deepEqual(sameImage.map((item) => item.filingId), ["new"]);

  const distinctTimes = collapseIdenticalFilings([
    filing({
      filingId: "100",
      fecLoadTimestamp: "2026-01-01 00:00:00",
      sourceUrl: "https://docquery.fec.gov/cgi-bin/forms/H6TX00001/100/",
    }),
    filing({
      filingId: "200",
      fecLoadTimestamp: "2026-06-01 00:00:00",
      sourceUrl: "https://docquery.fec.gov/cgi-bin/forms/H6TX00001/100/",
    }),
  ]);
  assert.deepEqual(distinctTimes.map((item) => item.filingId), ["200", "100"]);

  const repo = new MemoryVoterRepository();
  await repo.upsertCandidate(
    candidate({
      candidateId: "H6TX00001",
      displayName: "James Talarico",
      raceId: "2026-senate-TX",
      office: "senate",
    }),
  );
  await repo.upsertFiling(
    filing({ filingId: "1", fecLoadTimestamp: "2026-01-01 00:00:00", imageNumber: "IMG1" }),
  );
  await repo.upsertFiling(
    filing({ filingId: "2", fecLoadTimestamp: "2026-02-01 00:00:00", imageNumber: "IMG1" }),
  );
  await repo.upsertFiling(
    filing({ filingId: "3", fecLoadTimestamp: "2026-03-01 00:00:00", imageNumber: "IMG2" }),
  );
  const response = await getCandidateFilings(
    authed("https://voter.example/api/v1/candidates/H6TX00001/filings"),
    "H6TX00001",
    deps(repo),
  );
  const body = await response.json();
  assert.deepEqual(
    body.filings.map((item: Filing) => item.filingId),
    ["3", "2"],
  );
});

test("year selects the race list and a mismatched race id is omitted", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2024-senate-KY",
      office: "senate",
      cycle: 2024,
      state: "KY",
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-senate-KY",
      office: "senate",
      cycle: 2026,
      state: "KY",
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2024-house-ID-01",
      office: "house",
      cycle: 2026,
      state: "ID",
      district: "01",
      title: "wrong year id",
      jurisdiction: "Idaho District 1",
    }),
  );

  const y2024 = await getRaces(
    authed("https://voter.example/api/v1/races?year=2024&state=KY&office=senate"),
    deps(repo),
  );
  const body2024 = await y2024.json();
  assert.deepEqual(body2024.cycles, [2024]);
  assert.deepEqual(
    body2024.races.map((item: Race) => item.raceId),
    ["2024-senate-KY"],
  );

  const y2026 = await getRaces(
    authed("https://voter.example/api/v1/races?year=2026&state=KY&office=senate"),
    deps(repo),
  );
  const body2026 = await y2026.json();
  assert.deepEqual(
    body2026.races.map((item: Race) => item.raceId),
    ["2026-senate-KY"],
  );
  assert.equal(body2026.races[0].hasCandidates, true);

  const mismatch = await getRaces(
    authed("https://voter.example/api/v1/races?year=2026&cycle=2024"),
    deps(repo),
  );
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).message, "year and cycle must match");

  const idaho = await getRaces(
    authed("https://voter.example/api/v1/races?year=2026&state=ID&office=house"),
    deps(repo),
  );
  const idahoBody = await idaho.json();
  assert.equal(
    idahoBody.races.some((item: Race) => item.raceId === "2024-house-ID-01"),
    false,
  );
  assert.equal(idahoBody.races.every((item: Race) => item.raceId.startsWith("2026-")), true);

  const tool = await executeChatTool(
    "list_races",
    { state: "KY", office: "senate" },
    { repo, env: {}, now, root: ROOT, cycle: 2024 },
  );
  assert.equal(tool.ok, true);
  if (!tool.ok) return;
  const listed = tool.content.races as Array<{ raceId: string }>;
  assert.deepEqual(tool.content.cycles, [2024]);
  assert.deepEqual(listed.map((item) => item.raceId), ["2024-senate-KY"]);

  const explicit = await executeChatTool(
    "list_races",
    { state: "KY", office: "senate", year: 2026 },
    { repo, env: {}, now, root: ROOT, cycle: 2024 },
  );
  assert.equal(explicit.ok, true);
  if (!explicit.ok) return;
  assert.deepEqual(explicit.content.cycles, [2026]);
});

test("Ask year is an alias, novice questions skip the model, and failures carry a code", async () => {
  const quiet = scripted([]);
  const primary = await postChat(
    post({
      message: "What is the difference between a primary and a general election?",
      year: 2026,
      state: "KY",
    }),
    chatDeps(new MemoryVoterRepository(), quiet),
  );
  assert.equal(primary.status, 200);
  const primaryBody = await primary.json();
  assert.equal(primaryBody.refused, false);
  assert.match(primaryBody.answer_markdown, /primary/i);
  assert.match(primaryBody.answer_markdown, /general election/i);
  assert.equal(quiet.calls, 0);

  const writeIn = await postChat(
    post({ message: "What is a write-in candidate?" }),
    chatDeps(new MemoryVoterRepository(), quiet),
  );
  const writeBody = await writeIn.json();
  assert.equal(writeIn.status, 200);
  assert.equal(writeBody.refused, false);
  assert.match(writeBody.answer_markdown, /write-in/i);
  assert.equal(quiet.calls, 0);

  const form = await postChat(
    post({ message: "What is a Form 2 filing?" }),
    chatDeps(new MemoryVoterRepository(), quiet),
  );
  const formBody = await form.json();
  assert.equal(form.status, 200);
  assert.equal(formBody.refused, false);
  assert.match(formBody.answer_markdown, /Form 2/i);

  const mismatch = await postChat(
    post({ message: "Who filed?", year: 2026, cycle: 2024 }),
    chatDeps(new MemoryVoterRepository(), quiet),
  );
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).message, "year and cycle must match");

  const raceYear = await postChat(
    post({ message: "Who filed in this race?", raceId: "2026-senate-KY", year: 2024 }),
    chatDeps(new MemoryVoterRepository(), quiet),
  );
  assert.equal(raceYear.status, 400);
  assert.equal((await raceYear.json()).message, "raceId year must match year");

  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-KY",
      office: "senate",
      cycle: 2026,
      state: "KY",
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-house-KY-01",
      office: "house",
      cycle: 2026,
      state: "KY",
      district: "01",
      title: "U.S. House, Kentucky District 1",
      jurisdiction: "Kentucky District 1",
    }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "S6KY00001",
      displayName: "Charles Booker",
      raceId: "2026-senate-KY",
      office: "senate",
    }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "H6KY01001",
      displayName: "Ada House",
      raceId: "2026-house-KY-01",
      office: "house",
    }),
  );
  const roster = await postChat(
    post({
      message: "Compare all House and Senate candidates in Kentucky for 2026.",
      year: 2026,
    }),
    chatDeps(repo, quiet),
  );
  assert.equal(roster.status, 200);
  const rosterBody = await roster.json();
  assert.equal(rosterBody.refused, false);
  assert.match(rosterBody.answer_markdown, /Charles Booker/);
  assert.match(rosterBody.answer_markdown, /Ada House/);
  assert.equal(quiet.calls, 0);

  const hung = (async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      stopReason: "end_turn",
      message: { role: "assistant" as const, content: [{ text: "late" }] },
    };
  }) as ConverseFn;
  const timed = await postChat(
    post({ message: "Summarize the California Senate race." }),
    chatDeps(new MemoryVoterRepository(), hung, { budgetMs: 30 }),
  );
  assert.equal(timed.status, 503);
  const timedBody = await timed.json();
  assert.equal(timedBody.error, "unavailable");
  assert.equal(timedBody.code, "timeout");
  assert.equal(timedBody.message, CHAT_TIMEOUT_MESSAGE);

  const incomplete = await postChat(
    post({ message: "Summarize the California Senate race." }),
    chatDeps(
      new MemoryVoterRepository(),
      async () => ({
        stopReason: "max_tokens",
        message: { role: "assistant", content: [{ text: "partial" }] },
      }),
    ),
  );
  assert.equal(incomplete.status, 503);
  const incompleteBody = await incomplete.json();
  assert.equal(incompleteBody.error, "unavailable");
  assert.equal(incompleteBody.code, "incomplete");
  assert.equal(incompleteBody.message, CHAT_INCOMPLETE_MESSAGE);

  const spec = openApiDocument("https://voter.example");
  assert.match(spec, /timeout/);
  assert.match(spec, /model_unavailable/);
  assert.match(spec, /hasCandidates/);
  assert.match(spec, /multiFiling/);
});
