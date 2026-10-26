import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FORM2_SCOPE_NOTE } from "../src/lib/data/coverage";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { AgentApiDocs } from "../src/components/AgentApiDocs";
import { timingSafeStringEqual } from "../src/lib/api/auth";
import type { ApiDeps } from "../src/lib/api/deps";
import {
  getCandidate,
  getCandidateFilings,
  getFreshness,
  getRace,
  getRaces,
} from "../src/lib/api/handlers";
import { llmsText } from "../src/lib/api/llms";
import { openApiDocument } from "../src/lib/api/openapi-document";
import { originFromHost } from "../src/lib/api/public-origin";
import {
  amplifyServerEnvLines,
  mergeEnvFile,
  quoteEnvValue,
} from "../scripts/write-amplify-server-env.mjs";
import type { Candidate, Filing, IngestWatermark, Race } from "../src/lib/types";

const KEY = "test-key";

function freshnessBody(watermark: IngestWatermark | null) {
  return {
    watermark,
    scope: "fec-efile-form2",
    filingsSoFarOnly: true,
    scopeNote: FORM2_SCOPE_NOTE,
    refreshedAt: watermark?.updatedAt ?? null,
  };
}
const updatedAt = "2026-10-26T05:00:00.000Z";
const now = new Date("2026-10-26T12:00:00.000Z");

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
  partial: Pick<Candidate, "candidateId" | "displayName"> & Partial<Candidate>,
): Candidate {
  return {
    raceId: "2026-senate-CA",
    nameAsFiled: null,
    office: "senate",
    partyAffiliation: "DEM",
    fecCandidateId: partial.candidateId,
    sourceUrl: "https://www.fec.gov/data/candidate/S0CA00123/",
    sourceLoadedAt: "2026-10-26 04:00:00",
    updatedAt,
    ...partial,
  };
}

function filing(partial: Pick<Filing, "filingId" | "fecLoadTimestamp"> & Partial<Filing>): Filing {
  return {
    candidateId: "S0CA00123",
    raceId: "2026-senate-CA",
    formType: "F2",
    fecFilingId: partial.filingId,
    imageNumber: null,
    filedAt: null,
    sourceUrl: "https://docquery.fec.gov/cgi-bin/forms/S0CA00123/1/",
    retrievedAt: updatedAt,
    updatedAt,
    ...partial,
  };
}

function deps(repo: MemoryVoterRepository, env: Record<string, string | undefined> = {}): ApiDeps {
  return {
    env: { CANDATE_API_KEY: KEY, ...env },
    now,
    repository: () => repo,
  };
}

function authed(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    headers: { authorization: `Bearer ${KEY}`, ...headers },
  });
}

async function seed(repo: MemoryVoterRepository): Promise<void> {
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      state: "CA",
      title: "U.S. Senate, California",
      jurisdiction: "California",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-house-CA-07",
      office: "house",
      cycle: 2026,
      state: "CA",
      district: "07",
      title: "U.S. House California 07",
      jurisdiction: "California 7",
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
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Klein", partyAffiliation: "REP" }),
  );
  await repo.upsertCandidate(
    candidate({
      candidateId: "S0CA00999",
      displayName: "Zoe Nguyen",
      partyAffiliation: "DEM",
    }),
  );
  await repo.upsertFiling(filing({ filingId: "100", fecLoadTimestamp: "2026-10-01 00:00:00" }));
  await repo.upsertFiling(filing({ filingId: "200", fecLoadTimestamp: "2026-10-20 00:00:00" }));
}

test("timing-safe compare covers equal values and different lengths", () => {
  assert.equal(timingSafeStringEqual("abc", "abc"), true);
  assert.equal(timingSafeStringEqual("abc", "abd"), false);
  assert.equal(timingSafeStringEqual("abc", "abcd"), false);
  assert.equal(timingSafeStringEqual("", "x"), false);
});

test("api routes return 401 without a key and do not read the repository", async () => {
  const calls = deps(new MemoryVoterRepository(), { CANDATE_API_KEY: KEY });
  calls.repository = () => {
    throw new Error("repository should not be called");
  };
  const fresh = await getFreshness(new Request("https://voter.example/api/v1/freshness"), calls);
  const list = await getRaces(new Request("https://voter.example/api/v1/races"), calls);
  const race = await getRace(new Request("https://voter.example/api/v1/races/2026-senate-CA"), "2026-senate-CA", calls);
  const person = await getCandidate(new Request("https://voter.example/api/v1/candidates/S0CA00123"), "S0CA00123", calls);
  const filings = await getCandidateFilings(
    new Request("https://voter.example/api/v1/candidates/S0CA00123/filings"),
    "S0CA00123",
    calls,
  );
  for (const response of [fresh, list, race, person, filings]) {
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("www-authenticate"), 'Bearer realm="candate"');
    assert.deepEqual(await response.json(), { error: "unauthorized" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("a wrong key, a non-bearer scheme, and a missing server key are 401", async () => {
  const repo = new MemoryVoterRepository();
  const wrong = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { authorization: "Bearer other-key" },
    }),
    deps(repo),
  );
  assert.equal(wrong.status, 401);

  const header = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { "x-api-key": "other-key" },
    }),
    deps(repo),
  );
  assert.equal(header.status, 401);

  const basic = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { authorization: "Basic abc", "x-api-key": KEY },
    }),
    deps(repo),
  );
  assert.equal(basic.status, 401);

  const mismatch = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { authorization: `Bearer ${KEY}`, "x-api-key": "other-key" },
    }),
    deps(repo),
  );
  assert.equal(mismatch.status, 401);

  const unset = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { authorization: "Bearer test-key" },
    }),
    deps(repo, { CANDATE_API_KEY: "  " }),
  );
  assert.equal(unset.status, 401);
});

test("bearer and x-api-key both authorize a freshness read", async () => {
  const repo = new MemoryVoterRepository();
  const watermark: IngestWatermark = {
    source: "fec-efile-form2",
    lastLoadTimestamp: "2026-10-26 04:12:03",
    lastRunAt: updatedAt,
    lastStatus: "success",
    lastError: null,
    pagesFetched: 3,
    filingsUpserted: 12,
    skipped: 1,
    updatedAt,
  };
  await repo.saveWatermark(watermark);

  const bearer = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { authorization: `bearer ${KEY}` },
    }),
    deps(repo),
  );
  assert.equal(bearer.status, 200);
  assert.deepEqual(await bearer.json(), freshnessBody(watermark));

  const apiKey = await getFreshness(
    new Request("https://voter.example/api/v1/freshness", {
      headers: { "x-api-key": KEY },
    }),
    deps(repo),
  );
  assert.equal(apiKey.status, 200);
  assert.deepEqual(await apiKey.json(), freshnessBody(watermark));

  const empty = await getFreshness(authed("https://voter.example/api/v1/freshness"), deps(new MemoryVoterRepository()));
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), freshnessBody(null));
});

test("race list filters, paginates, and keeps domain fields", async () => {
  const repo = new MemoryVoterRepository();
  await seed(repo);

  const filtered = await getRaces(
    authed("https://voter.example/api/v1/races?cycle=2026&state=ca&office=Senate"),
    deps(repo),
  );
  assert.equal(filtered.status, 200);
  const body = await filtered.json();
  assert.deepEqual(body.cycles, [2026]);
  assert.deepEqual(
    body.races.map((item: Race) => item.raceId),
    ["2026-senate-CA"],
  );
  assert.equal(body.races[0].sourceUrl, "https://www.fec.gov/data/elections/");
  assert.equal(body.races[0].updatedAt, updatedAt);
  assert.equal(body.nextCursor, null);
  assert.equal(body.refreshedAt, null);
  assert.equal(body.coverage.refreshedAt, null);
  assert.equal(body.coverage.scope, "fec-efile-form2");
  assert.equal(body.coverage.filingsSoFarOnly, true);
  assert.deepEqual(body.coverage.house, [
    {
      cycle: 2026,
      state: "CA",
      districtsWithFilings: 1,
      districtsTotal: 52,
    },
  ]);

  const page = await getRaces(
    authed("https://voter.example/api/v1/races?cycle=2026&limit=1"),
    deps(repo),
  );
  const first = await page.json();
  assert.deepEqual(
    first.races.map((item: Race) => item.raceId),
    ["2026-house-CA-07"],
  );
  assert.equal(first.nextCursor, "2026-house-CA-07");

  const next = await getRaces(
    authed(`https://voter.example/api/v1/races?cycle=2026&limit=1&cursor=${first.nextCursor}`),
    deps(repo),
  );
  const second = await next.json();
  assert.deepEqual(
    second.races.map((item: Race) => item.raceId),
    ["2026-senate-CA"],
  );
  assert.equal(second.nextCursor, null);

  const bad = await getRaces(
    authed("https://voter.example/api/v1/races?office=mayor"),
    deps(repo),
  );
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), {
    error: "bad_request",
    message: "office must be president, senate, or house",
  });
});

test("default race years follow the public index window", async () => {
  const repo = new MemoryVoterRepository();
  await seed(repo);
  const response = await getRaces(authed("https://voter.example/api/v1/races"), deps(repo));
  const body = await response.json();
  assert.deepEqual(body.cycles, [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]);
  assert.deepEqual(
    body.races.map((item: Race) => item.raceId),
    ["2026-house-CA-07", "2026-senate-CA", "2028-president"],
  );
});

test("race, candidate, and filing routes return stored shapes", async () => {
  const repo = new MemoryVoterRepository();
  await seed(repo);

  const raceResponse = await getRace(
    authed("https://voter.example/api/v1/races/2026-senate-CA"),
    "2026-senate-CA",
    deps(repo),
  );
  assert.equal(raceResponse.status, 200);
  const raceBody = await raceResponse.json();
  assert.equal(raceBody.race.raceId, "2026-senate-CA");
  assert.deepEqual(
    raceBody.candidates.map((item: Candidate) => item.displayName),
    ["Ada Klein", "Zoe Nguyen"],
  );
  assert.deepEqual(
    raceBody.candidates.map((item: Candidate) => item.partyAffiliation),
    ["REP", "DEM"],
  );
  assert.deepEqual(
    raceBody.candidates.map((item: { partyCode: string; partyLabel: string }) => [
      item.partyCode,
      item.partyLabel,
    ]),
    [
      ["REP", "Republican"],
      ["DEM", "Democratic"],
    ],
  );
  assert.equal(raceBody.coverage.filingsSoFarOnly, true);
  assert.equal(raceBody.refreshedAt, null);
  assert.equal(raceBody.coverage.refreshedAt, null);
  assert.equal(raceBody.candidates[0].multiFilingNote, null);
  assert.deepEqual(raceBody.candidates[0].alternateFilings, []);

  const missingRace = await getRace(
    authed("https://voter.example/api/v1/races/2026-senate-WY"),
    "2026-senate-WY",
    deps(repo),
  );
  assert.equal(missingRace.status, 404);

  const candidateResponse = await getCandidate(
    authed("https://voter.example/api/v1/candidates/S0CA00123"),
    "S0CA00123",
    deps(repo),
  );
  const candidateBody = await candidateResponse.json();
  assert.equal(candidateBody.candidate.displayName, "Ada Klein");
  assert.equal(candidateBody.candidate.partyAffiliation, "REP");
  assert.equal(candidateBody.race.raceId, "2026-senate-CA");

  const filingsResponse = await getCandidateFilings(
    authed("https://voter.example/api/v1/candidates/S0CA00123/filings"),
    "S0CA00123",
    deps(repo),
  );
  const filingsBody = await filingsResponse.json();
  assert.deepEqual(
    filingsBody.filings.map((item: Filing) => item.filingId),
    ["200", "100"],
  );
  assert.equal(filingsBody.filings[0].formType, "F2");
  assert.equal(filingsBody.filings[0].fecLoadTimestamp, "2026-10-20 00:00:00");
  assert.equal(filingsBody.filings[0].sourceUrl.startsWith("https://"), true);

  const missingFilings = await getCandidateFilings(
    authed("https://voter.example/api/v1/candidates/S0CA00000/filings"),
    "S0CA00000",
    deps(repo),
  );
  assert.equal(missingFilings.status, 404);

  const badId = await getCandidate(
    authed("https://voter.example/api/v1/candidates/not%20an%20id"),
    "not an id",
    deps(repo),
  );
  assert.equal(badId.status, 404);
});

test("a table failure returns 503", async () => {
  const response = await getFreshness(authed("https://voter.example/api/v1/freshness"), {
    env: { CANDATE_API_KEY: KEY },
    repository: () => {
      throw new Error("dynamo down");
    },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "unavailable" });
});

test("route modules require a key before touching the table", async () => {
  const previous = process.env.CANDATE_API_KEY;
  delete process.env.CANDATE_API_KEY;
  try {
    const routes = [
      "../src/app/api/v1/freshness/route.ts",
      "../src/app/api/v1/races/route.ts",
    ];
    for (const path of routes) {
      const routeModule = await import(path);
      const response = await routeModule.GET(new Request("https://voter.example/api/v1/freshness"));
      assert.equal(response.status, 401);
      assert.equal(routeModule.runtime, "nodejs");
    }

    const raceRoute = await import("../src/app/api/v1/races/[raceId]/route.ts");
    const raceResponse = await raceRoute.GET(
      new Request("https://voter.example/api/v1/races/2026-senate-CA"),
      { params: Promise.resolve({ raceId: "2026-senate-CA" }) },
    );
    assert.equal(raceResponse.status, 401);

    const candidateRoute = await import("../src/app/api/v1/candidates/[candidateId]/route.ts");
    const candidateResponse = await candidateRoute.GET(
      new Request("https://voter.example/api/v1/candidates/S0CA00123"),
      { params: Promise.resolve({ candidateId: "S0CA00123" }) },
    );
    assert.equal(candidateResponse.status, 401);

    const filingsRoute = await import(
      "../src/app/api/v1/candidates/[candidateId]/filings/route.ts"
    );
    const filingsResponse = await filingsRoute.GET(
      new Request("https://voter.example/api/v1/candidates/S0CA00123/filings"),
      { params: Promise.resolve({ candidateId: "S0CA00123" }) },
    );
    assert.equal(filingsResponse.status, 401);
  } finally {
    if (previous == null) delete process.env.CANDATE_API_KEY;
    else process.env.CANDATE_API_KEY = previous;
  }
});

test("race index, state filter, and race detail share top-level refreshedAt", async () => {
  const repo = new MemoryVoterRepository();
  await seed(repo);
  const watermark: IngestWatermark = {
    source: "fec-efile-form2",
    lastLoadTimestamp: "2026-10-26 04:12:03",
    lastRunAt: updatedAt,
    lastStatus: "success",
    lastError: null,
    pagesFetched: 1,
    filingsUpserted: 2,
    skipped: 0,
    updatedAt,
  };
  await repo.saveWatermark(watermark);

  const index = await getRaces(authed("https://voter.example/api/v1/races?cycle=2026"), deps(repo));
  const indexBody = await index.json();
  assert.equal(indexBody.refreshedAt, updatedAt);
  assert.equal(indexBody.coverage.refreshedAt, updatedAt);

  const state = await getRaces(
    authed("https://voter.example/api/v1/races?cycle=2026&state=CA"),
    deps(repo),
  );
  const stateBody = await state.json();
  assert.equal(stateBody.refreshedAt, updatedAt);
  assert.equal(stateBody.coverage.refreshedAt, updatedAt);
  assert.deepEqual(
    stateBody.races.map((item: Race) => item.raceId),
    ["2026-house-CA-07", "2026-senate-CA"],
  );

  const raceResponse = await getRace(
    authed("https://voter.example/api/v1/races/2026-senate-CA"),
    "2026-senate-CA",
    deps(repo),
  );
  const raceBody = await raceResponse.json();
  assert.equal(raceBody.refreshedAt, updatedAt);
  assert.equal(raceBody.coverage.refreshedAt, updatedAt);
});

test("openapi and llms.txt describe the public read surface", () => {
  const spec = openApiDocument("https://voter.example");
  assert.match(spec, /servers:\n {2}- url: https:\/\/voter\.example/);
  for (const path of [
    "/api/v1/races:",
    "/api/v1/races/{raceId}:",
    "/api/v1/candidates/{candidateId}:",
    "/api/v1/candidates/{candidateId}/filings:",
    "/api/v1/freshness:",
    "/api/chat:",
  ]) {
    assert.equal(spec.includes(path), true, path);
  }
  assert.match(spec, /YOUR_API_KEY/);
  assert.match(spec, /page-level data-refreshed/);
  assert.match(spec, /required: \[cycles, races, nextCursor, refreshedAt\]/);
  assert.match(spec, /required: \[race, candidates, refreshedAt\]/);
  assert.equal(spec.includes("FEC_API_KEY"), false);
  assert.equal(spec.includes("__SERVER_URL__"), false);

  const text = llmsText({ origin: "https://voter.example", basePath: "" });
  assert.match(text, /https:\/\/voter\.example\/agent/);
  assert.match(text, /https:\/\/voter\.example\/openapi\.yaml/);
  assert.match(text, /https:\/\/voter\.example\/api\/v1\/freshness/);
  assert.match(text, /YOUR_API_KEY/);
});

test("agent docs render the watermark and keep the key out of the page", () => {
  const html = renderToStaticMarkup(
    createElement(AgentApiDocs, {
      origin: "https://voter.example",
      basePath: "",
      freshness: {
        ok: true,
        watermark: {
          source: "fec-efile-form2",
          lastLoadTimestamp: "2026-10-26 04:12:03",
          lastRunAt: updatedAt,
          lastStatus: "success",
          lastError: null,
          pagesFetched: 3,
          filingsUpserted: 12,
          skipped: 1,
          updatedAt,
        },
      },
    }),
  );
  for (const field of [
    "lastLoadTimestamp",
    "lastRunAt",
    "lastStatus",
    "2026-10-26 04:12:03",
    "success",
  ]) {
    assert.equal(html.includes(field), true, field);
  }
  assert.match(html, /YOUR_API_KEY/);
  assert.equal(html.includes(KEY), false);
  assert.match(html, /href="\/openapi\.yaml"/);

  const page = readFileSync(new URL("../src/app/agent/page.tsx", import.meta.url), "utf8");
  assert.match(page, /readWatermark/);
  assert.doesNotMatch(page, /CANDATE_API_KEY/);
  assert.doesNotMatch(page, /use client/);

  const empty = renderToStaticMarkup(
    createElement(AgentApiDocs, {
      origin: "https://voter.example",
      basePath: "/voter",
      freshness: { ok: true, watermark: null },
    }),
  );
  assert.match(empty, /No fec-efile-form2 watermark is stored yet/);
  assert.match(empty, /https:\/\/voter\.example\/voter\/api\/v1\/freshness/);
});

test("public origin falls back when the host header is unusable", () => {
  assert.equal(
    originFromHost({ host: "voter.example:443", proto: "https" }),
    "https://voter.example:443",
  );
  assert.equal(
    originFromHost({ host: "localhost:3000", proto: null }),
    "http://localhost:3000",
  );
  assert.equal(
    originFromHost({ host: "evil host", proto: "https" }),
    "https://voter.naijei.com",
  );
});

test("amplify server env copy allowlists the API key and drops the FEC key", () => {
  assert.deepEqual(
    amplifyServerEnvLines({
      CANDATE_TABLE_NAME: "candate-voter",
      CANDATE_API_KEY: "test-key-#1",
      CANDATE_CYCLES: "",
      AWS_REGION: "us-east-1",
      NEXT_PUBLIC_BASE_PATH: "/voter",
      FEC_API_KEY: "should-not-be-written",
      PATH: "/usr/bin",
    }),
    [
      "CANDATE_TABLE_NAME=candate-voter",
      'CANDATE_API_KEY="test-key-#1"',
      "AWS_REGION=us-east-1",
      "NEXT_PUBLIC_BASE_PATH=/voter",
    ],
  );
  assert.equal(quoteEnvValue("ab$cd"), '"ab\\$cd"');
  assert.throws(() => amplifyServerEnvLines({ CANDATE_API_KEY: "line\nbreak" }), /single-line/);

  const merged = mergeEnvFile(
    'OTHER=kept\nNEXT_PUBLIC_BASE_PATH="/stale"\nCANDATE_API_KEY="old"\nFEC_API_KEY="secret"\n',
    [
      "CANDATE_TABLE_NAME=candate-voter",
      'CANDATE_API_KEY="new"',
      "NEXT_PUBLIC_BASE_PATH=/voter",
    ],
  );
  assert.match(merged, /^OTHER=kept$/m);
  assert.match(merged, /^NEXT_PUBLIC_BASE_PATH=\/voter$/m);
  assert.equal(merged.includes("stale"), false);
  assert.match(merged, /CANDATE_API_KEY="new"/);
  assert.equal(merged.includes("old"), false);
  assert.equal(merged.includes("FEC_API_KEY"), false);
  assert.equal(merged.includes("secret"), false);

  const spec = readFileSync(new URL("../amplify.yml", import.meta.url), "utf8");
  assert.match(spec, /node scripts\/write-amplify-server-env\.mjs/);
  assert.match(spec, /rm -f \.env\.production/);
  assert.equal(spec.includes("grep"), false);
  assert.match(spec, /CANDATE_TABLE_NAME/);
  assert.match(spec, /CANDATE_API_KEY/);
  assert.match(spec, /AWS_REGION/);
});

test("the amplify env script writes .env.production without copying FEC_API_KEY", () => {
  const dir = mkdtempSync(join(tmpdir(), "candate-env-"));
  writeFileSync(
    join(dir, ".env.production"),
    'NEXT_PUBLIC_BASE_PATH="/stale"\nFEC_API_KEY="keep"\n',
  );
  const result = spawnSync(
    process.execPath,
    [join(process.cwd(), "scripts/write-amplify-server-env.mjs")],
    {
      cwd: dir,
      env: {
        ...process.env,
        CANDATE_TABLE_NAME: "candate-voter",
        CANDATE_API_KEY: "local-test-key",
        AWS_REGION: "us-east-1",
        NEXT_PUBLIC_BASE_PATH: "/voter",
        FEC_API_KEY: "should-not-be-written",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(join(dir, ".env.production"), "utf8");
  assert.match(text, /^CANDATE_TABLE_NAME=candate-voter$/m);
  assert.match(text, /^CANDATE_API_KEY=local-test-key$/m);
  assert.match(text, /^AWS_REGION=us-east-1$/m);
  assert.match(text, /^NEXT_PUBLIC_BASE_PATH=\/voter$/m);
  assert.equal(text.includes("stale"), false);
  assert.equal(text.includes("FEC_API_KEY"), false);
  assert.equal(text.includes("should-not-be-written"), false);
  assert.equal(text.includes("keep"), false);
  assert.equal(/^PATH=/m.test(text), false);
});
