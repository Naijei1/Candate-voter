import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentApiDocs } from "../src/components/AgentApiDocs";
import { llmsText } from "../src/lib/api/llms";
import { openApiDocument } from "../src/lib/api/openapi-document";
import {
  DEFAULT_HAIKU_MODEL_ID,
  DEFAULT_SONNET_MODEL_ID,
  chatModelId,
} from "../src/lib/chat/config";
import { postChat, type ChatDeps } from "../src/lib/chat/handler";
import { labelForRaceId, polishSources } from "../src/lib/chat/polish";
import { CHAT_SYSTEM_PROMPT } from "../src/lib/chat/prompt";
import { createRateLimiter } from "../src/lib/chat/rate-limit";
import { executeChatTool } from "../src/lib/chat/tools";
import type { ConverseFn, ConverseResponse } from "../src/lib/chat/types";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { amplifyServerEnvLines } from "../scripts/write-amplify-server-env.mjs";
import type { Candidate, Filing, IngestWatermark, Race } from "../src/lib/types";

const RACE_SLUG = /(?:19|20)\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})/;

function proseWithoutUrls(markdown: string): string {
  return markdown.replace(/https?:\/\/[^\s)]+/g, "");
}

const updatedAt = "2026-10-26T05:00:00.000Z";
const now = new Date("2026-10-26T12:00:00.000Z");
const ROOT = "https://voter.example";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: "CA",
    district: null,
    jurisdiction: "California",
    sourceUrl: "https://www.fec.gov/data/elections/senate/CA/2026/",
    updatedAt,
    ...partial,
  };
}

function candidate(
  partial: Pick<Candidate, "candidateId" | "displayName"> & Partial<Candidate>,
): Candidate {
  return {
    raceId: "2026-senate-CA",
    nameAsFiled: partial.displayName,
    office: "senate",
    partyAffiliation: "DEM",
    fecCandidateId: partial.candidateId,
    sourceUrl: `https://www.fec.gov/data/candidate/${partial.candidateId}/`,
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

function scripted(steps: ConverseResponse[]): ConverseFn & { calls: number } {
  let calls = 0;
  const fn = (async () => {
    const step = steps[calls];
    calls += 1;
    if (!step) throw new Error("unexpected converse call");
    return step;
  }) as ConverseFn & { calls: number };
  Object.defineProperty(fn, "calls", { get: () => calls });
  return fn;
}

function chatDeps(
  repo: MemoryVoterRepository,
  converse: ConverseFn,
  extra: Partial<ChatDeps> = {},
): ChatDeps {
  return {
    env: { CANDATE_CHAT_ENABLED: "true", CANDATE_API_KEY: "server-only-key" },
    now,
    repository: () => repo,
    converse,
    siteRoot: ROOT,
    rateLimiter: createRateLimiter({ limit: 20, windowMs: 60_000 }),
    ...extra,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://voter.example/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function toolUse(name: string, input: Record<string, unknown>): ConverseResponse {
  return {
    stopReason: "tool_use",
    message: {
      role: "assistant",
      content: [{ toolUse: { toolUseId: "tool-1", name, input } }],
    },
  };
}

function modelJson(value: unknown): ConverseResponse {
  return {
    stopReason: "end_turn",
    usage: { inputTokens: 10, outputTokens: 20 },
    message: {
      role: "assistant",
      content: [{ text: JSON.stringify(value) }],
    },
  };
}

test("chat request validation rejects a bad body", async () => {
  const repo = new MemoryVoterRepository();
  const converse = scripted([]);
  const deps = chatDeps(repo, converse);
  const cases: Array<{ body: unknown; raw?: string; message: string; headers?: Record<string, string> }> = [
    { body: "nope", raw: "nope", message: "Request body must be JSON" },
    { body: [], message: "Request body must be a JSON object" },
    { body: {}, message: "message must be a string from 1 to 2000 characters" },
    { body: { message: "  " }, message: "message must be a string from 1 to 2000 characters" },
    { body: { message: "a".repeat(2001) }, message: "message must be a string from 1 to 2000 characters" },
    { body: { message: "hello", cycle: "2026" }, message: "cycle must be an integer from 1980 to 2100" },
    { body: { message: "hello", cycle: 2026.5 }, message: "cycle must be an integer from 1980 to 2100" },
    { body: { message: "hello", raceId: "bad id" }, message: "raceId is invalid" },
    { body: { message: "hello", candidateId: "" }, message: "candidateId is invalid" },
    { body: { message: "hello", threadId: "has space" }, message: "threadId is invalid" },
  ];

  for (const item of cases) {
    const response = await postChat(
      item.raw
        ? post(item.raw)
        : post(item.body, item.headers),
      deps,
    );
    assert.equal(response.status, 400, item.message);
    const payload = (await response.json()) as { error: string; message: string };
    assert.equal(payload.error, "bad_request");
    assert.equal(payload.message, item.message);
  }
  assert.equal(converse.calls, 0);

  const huge = await postChat(
    post({ message: "hello" }, { "content-length": "20000" }),
    deps,
  );
  assert.equal(huge.status, 400);
});

test("voting advice is a 200 refusal and does not call the model", async () => {
  let called = false;
  const response = await postChat(
    post({ message: "Who should I vote for in the California Senate race?" }),
    chatDeps(new MemoryVoterRepository(), async () => {
      called = true;
      throw new Error("model should not be called");
    }),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    refused: boolean;
    answer_markdown: string;
    sources: unknown[];
    threadId: string;
  };
  assert.equal(payload.refused, true);
  assert.match(payload.answer_markdown, /who to vote for/i);
  assert.deepEqual(payload.sources, []);
  assert.match(payload.threadId, /^[0-9a-f-]{36}$/);
  assert.equal(called, false);
  assert.equal(JSON.stringify(payload).includes("server-only-key"), false);
});

test("a grounded answer repairs sources when the model omits them", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
    }),
  );
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Lovelace" }),
  );
  const converse = scripted([
    toolUse("get_race", { raceId: "2026-senate-CA" }),
    modelJson({
      answer_markdown: "California has a Senate contest stored for 2026 (2026-senate-CA).",
      sources: [],
      refused: false,
    }),
  ]);
  const response = await postChat(
    post({
      message: "What Senate race is stored for California in 2026?",
      cycle: 2026,
      threadId: "thread-1",
    }),
    chatDeps(repo, converse),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    answer_markdown: string;
    refused: boolean;
    threadId: string;
    sources: Array<{ title: string; url: string; as_of: string }>;
  };
  assert.equal(payload.refused, false);
  assert.equal(payload.threadId, "thread-1");
  assert.match(payload.answer_markdown, /U\.S\. Senate, California/);
  assert.equal(RACE_SLUG.test(proseWithoutUrls(payload.answer_markdown)), false);
  assert.ok(payload.sources.length >= 1);
  for (const source of payload.sources) {
    assert.equal(typeof source.title, "string");
    assert.ok(source.title.length > 0);
    assert.equal(typeof source.url, "string");
    assert.match(source.url, /^https:\/\//);
    assert.equal(typeof source.as_of, "string");
    assert.ok(source.as_of.length > 0);
  }
  assert.ok(
    payload.sources.some(
      (source) =>
        source.url === "https://voter.example/races/2026-senate-CA" &&
        source.as_of === updatedAt,
    ),
  );
  assert.equal(JSON.stringify(payload).includes("server-only-key"), false);
  assert.equal(converse.calls, 2);
});

test("model sources are kept only when the tool returned that url", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
    }),
  );
  const response = await postChat(
    post({ message: "Show the stored California Senate race." }),
    chatDeps(
      repo,
      scripted([
        toolUse("get_race", { raceId: "2026-senate-CA" }),
        modelJson({
          answer_markdown: "The stored race is 2026-senate-CA.",
          sources: [
            {
              title: "Senate page",
              url: "https://voter.example/races/2026-senate-CA",
              as_of: updatedAt,
            },
            {
              title: "Invented",
              url: "https://evil.example/candidate",
              as_of: updatedAt,
            },
          ],
          refused: false,
        }),
      ]),
    ),
  );
  const payload = (await response.json()) as {
    sources: Array<{ url: string; title: string }>;
  };
  assert.deepEqual(
    payload.sources.map((source) => source.url),
    ["https://voter.example/races/2026-senate-CA"],
  );
  assert.equal(payload.sources[0]?.title, "Senate page");
});

test("an empty tool result refuses instead of keeping an invented candidate", async () => {
  const response = await postChat(
    post({ message: "Who filed in 2026-senate-WY?" }),
    chatDeps(
      new MemoryVoterRepository(),
      scripted([
        toolUse("get_race", { raceId: "2026-senate-WY" }),
        modelJson({
          answer_markdown: "S0WY00999 filed for that race. See https://evil.example/x",
          sources: [{ title: "Nope", url: "https://evil.example/x", as_of: "2020" }],
          refused: false,
        }),
      ]),
    ),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    refused: boolean;
    answer_markdown: string;
    sources: unknown[];
  };
  assert.equal(payload.refused, true);
  assert.match(payload.answer_markdown, /will not invent/i);
  assert.equal(payload.answer_markdown.includes("S0WY00999"), false);
  assert.equal(payload.answer_markdown.includes("evil.example"), false);
  assert.deepEqual(payload.sources, []);
});

test("a table failure is 503 and a model failure does not leak secrets", async () => {
  const repo = new MemoryVoterRepository();
  repo.getRace = async () => {
    throw new Error("dynamo down");
  };
  const storage = await postChat(
    post({ message: "Look up 2026-senate-CA." }),
    chatDeps(repo, scripted([toolUse("get_race", { raceId: "2026-senate-CA" })])),
  );
  assert.equal(storage.status, 503);
  const storageBody = (await storage.json()) as { error: string; message: string };
  assert.equal(storageBody.error, "unavailable");
  assert.match(storageBody.message, /unavailable/i);

  const model = await postChat(
    post({ message: "What is a Form 2 filing?" }),
    chatDeps(new MemoryVoterRepository(), async () => {
      throw new Error("AccessDenied CANDATE_API_KEY=server-only-key");
    }),
  );
  assert.equal(model.status, 503);
  const text = await model.text();
  assert.match(text, /The model is unavailable/);
  assert.equal(text.includes("CANDATE_API_KEY"), false);
  assert.equal(text.includes("server-only-key"), false);
});

test("chat stays disabled until the flag is set", async () => {
  let called = false;
  const response = await postChat(
    post({ message: "Which races are stored?" }),
    chatDeps(new MemoryVoterRepository(), async () => {
      called = true;
      throw new Error("should not run");
    }, {
      env: { CANDATE_CHAT_ENABLED: "false" },
    }),
  );
  assert.equal(response.status, 503);
  const payload = (await response.json()) as { message: string };
  assert.equal(payload.message, "Chat is disabled");
  assert.equal(called, false);
});

test("the rate limit returns 429 and Retry-After seconds", async () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
  const deps = chatDeps(new MemoryVoterRepository(), async () => {
    throw new Error("voting advice should not call the model");
  }, { rateLimiter: limiter });
  const first = await postChat(
    post({ message: "Who should I vote for?" }),
    deps,
  );
  assert.equal(first.status, 200);

  const second = await postChat(
    post({ message: "Who should I vote for?" }),
    deps,
  );
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("retry-after"), "60");
  const payload = (await second.json()) as { error: string };
  assert.equal(payload.error, "rate_limited");

  const otherAddress = await postChat(
    post({ message: "Who should I vote for?" }, { "x-forwarded-for": "203.0.113.11" }),
    deps,
  );
  assert.equal(otherAddress.status, 200);
});

test("tools read the repository and do not invent a missing candidate", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
    }),
  );
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Lovelace" }),
  );
  await repo.upsertFiling(filing({ filingId: "100", fecLoadTimestamp: "2026-10-01 00:00:00" }));
  await repo.upsertFiling(filing({ filingId: "200", fecLoadTimestamp: "2026-10-20 00:00:00" }));
  const ctx = {
    repo,
    env: {},
    now,
    root: ROOT,
  };
  const found = await executeChatTool(
    "search_candidates",
    { query: "lovelace", cycle: 2026, state: "CA", office: "senate" },
    ctx,
  );
  assert.equal(found.ok, true);
  if (!found.ok) return;
  assert.equal(found.records, 1);
  assert.match(JSON.stringify(found.content), /Ada Lovelace/);

  const filings = await executeChatTool("list_filings", { candidateId: "S0CA00123" }, ctx);
  assert.equal(filings.ok, true);
  if (!filings.ok) return;
  const rows = filings.content.filings as Array<{ filingId: string }>;
  assert.deepEqual(rows.map((row) => row.filingId), ["200", "100"]);

  const missing = await executeChatTool("get_candidate", { candidateId: "S0WY00999" }, ctx);
  assert.equal(missing.ok, true);
  if (!missing.ok) return;
  assert.equal(missing.records, 0);

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
  const freshness = await executeChatTool("get_freshness", {}, ctx);
  assert.equal(freshness.ok, true);
  if (!freshness.ok) return;
  assert.equal(freshness.sources[0]?.url, `${ROOT}/agent`);
  assert.equal(freshness.sources[0]?.as_of, updatedAt);
});

test("Haiku 5.5 is the default Bedrock model and Sonnet is opt-in", () => {
  assert.equal(chatModelId({}), DEFAULT_HAIKU_MODEL_ID);
  assert.equal(DEFAULT_HAIKU_MODEL_ID, "us.anthropic.claude-haiku-5-5");
  assert.equal(
    chatModelId({ CANDATE_CHAT_MODEL: "sonnet" }),
    DEFAULT_SONNET_MODEL_ID,
  );
  assert.equal(DEFAULT_SONNET_MODEL_ID, "us.anthropic.claude-sonnet-5-5");
  assert.equal(chatModelId({ BEDROCK_MODEL_ID: "custom-haiku" }), "custom-haiku");
  assert.match(CHAT_SYSTEM_PROMPT, /nonpartisan/i);
  assert.match(CHAT_SYSTEM_PROMPT, /voting advice/i);
  assert.match(CHAT_SYSTEM_PROMPT, /Never invent/i);
  assert.match(CHAT_SYSTEM_PROMPT, /midterm/i);
  assert.match(CHAT_SYSTEM_PROMPT, /out-of-cycle/i);
});

test("Amplify env copy includes chat settings and not a public model key", () => {
  const lines = amplifyServerEnvLines({
    CANDATE_CHAT_ENABLED: "true",
    BEDROCK_MODEL_ID: "us.anthropic.claude-haiku-5-5",
    BEDROCK_SONNET_MODEL_ID: "us.anthropic.claude-sonnet-5-5",
    FEC_API_KEY: "should-not-be-written",
    NEXT_PUBLIC_BASE_PATH: "",
  });
  assert.ok(lines.includes("CANDATE_CHAT_ENABLED=true"));
  assert.ok(lines.includes("BEDROCK_MODEL_ID=us.anthropic.claude-haiku-5-5"));
  assert.equal(lines.some((line) => line.startsWith("NEXT_PUBLIC_BEDROCK")), false);
  assert.equal(lines.some((line) => line.includes("FEC_API_KEY")), false);
  assert.equal(lines.some((line) => line.includes("should-not-be-written")), false);
});

test("openapi, llms.txt, and /agent document the browser chat route", () => {
  const spec = openApiDocument("https://voter.example");
  const chat = spec.slice(spec.indexOf("  /api/chat:"));
  assert.match(chat, /operationId: postChat/);
  assert.match(chat, /security: \[\]/);
  assert.match(chat, /Retry-After/);
  assert.match(chat, /answer_markdown/);
  assert.match(chat, /mode:/);
  assert.match(spec, /alignment/);
  assert.match(spec, /partyLabel/);
  assert.match(spec, /multiFilingNote/);
  assert.match(spec, /alternateFilings/);
  assert.match(spec, /districtsWithFilings/);
  assert.match(spec, /page-level data-refreshed/);
  assert.equal(spec.includes("FEC_API_KEY"), false);

  const text = llmsText({ origin: "https://voter.example", basePath: "" });
  assert.match(text, /refreshedAt/);
  assert.match(text, /POST https:\/\/voter\.example\/api\/chat/);
  assert.match(text, /does not use the API key/);
  assert.match(text, /multiFilingNote/);
  assert.match(text, /out-of-cycle/);

  const html = renderToStaticMarkup(
    createElement(AgentApiDocs, {
      origin: "https://voter.example",
      basePath: "",
      freshness: { ok: true, watermark: null },
    }),
  );
  assert.match(html, /POST \/api\/chat/);
  assert.match(html, /https:\/\/voter\.example\/api\/chat/);
  assert.match(html, /No API key/);
  assert.match(html, /alignment/);
  assert.match(html, /Form 2/);
});

test("a vague who-is-running question asks for a race and does not call the model", async () => {
  let called = false;
  for (const message of ["Who's running", "Whos running"]) {
    const response = await postChat(
      post({ message }),
      chatDeps(new MemoryVoterRepository(), async () => {
        called = true;
        throw new Error("model should not be called");
      }),
    );
    assert.equal(response.status, 200, message);
    const payload = (await response.json()) as {
      answer_markdown: string;
      refused: boolean;
      mode: string;
      sources: unknown[];
    };
    assert.equal(payload.refused, false);
    assert.equal(payload.mode, "factual");
    assert.match(payload.answer_markdown, /which state or race/i);
    assert.equal(payload.answer_markdown.includes("Alabama"), false);
    assert.equal(/50 states/i.test(payload.answer_markdown), false);
    assert.equal(/every state/i.test(payload.answer_markdown), false);
    assert.deepEqual(payload.sources, []);
  }
  assert.equal(called, false);
});

test("who is running with a raceId stays on that race", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
    }),
  );
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Lovelace", partyAffiliation: "DEM" }),
  );
  const response = await postChat(
    post({ message: "Who's running", raceId: "2026-senate-CA" }),
    chatDeps(
      repo,
      scripted([
        toolUse("get_race", { raceId: "2026-senate-CA" }),
        modelJson({
          answer_markdown:
            "**Ada Lovelace** (Democratic) has a Form 2 filing for [California Senate](https://voter.example/races/2026-senate-CA).",
          sources: [
            {
              title: "U.S. Senate, California",
              url: "https://voter.example/races/2026-senate-CA",
              as_of: updatedAt,
            },
          ],
          refused: false,
          mode: "factual",
        }),
      ]),
    ),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    answer_markdown: string;
    mode: string;
    refused: boolean;
    sources: Array<{ url: string }>;
  };
  assert.equal(payload.mode, "factual");
  assert.equal(payload.refused, false);
  assert.match(payload.answer_markdown, /Ada Lovelace/);
  assert.match(payload.answer_markdown, /\*\*Ada Lovelace\*\*/);
  assert.equal(
    payload.sources.some((source) => source.url === "https://voter.example/races/2026-senate-CA"),
    true,
  );
});

test("an explicit alignment question sets mode and does not recommend a vote", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      cycle: 2026,
      title: "U.S. Senate, California",
    }),
  );
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Lovelace", partyAffiliation: "DEM" }),
  );
  let called = false;
  const response = await postChat(
    post({
      message: "Whose views align with mine?",
      raceId: "2026-senate-CA",
    }),
    chatDeps(repo, async () => {
      called = true;
      throw new Error("model should not invent positions");
    }),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    answer_markdown: string;
    mode: string;
    refused: boolean;
    sources: Array<{ url: string; title: string; as_of: string }>;
  };
  assert.equal(called, false);
  assert.equal(payload.mode, "alignment");
  assert.equal(payload.refused, false);
  assert.match(payload.answer_markdown, /Form 2/i);
  assert.match(payload.answer_markdown, /cannot compare|can't compare/i);
  assert.equal(/\bvote for\b/i.test(payload.answer_markdown), false);
  assert.match(payload.answer_markdown, /Ada Lovelace/);
  assert.equal(
    payload.sources.some((source) => source.url === "https://voter.example/races/2026-senate-CA"),
    true,
  );
  for (const source of payload.sources) {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.title.length > 0);
    assert.ok(source.as_of.length > 0);
  }
});

test("alignment without a race still refuses to invent positions", async () => {
  let called = false;
  const response = await postChat(
    post({ message: "Whose views align with mine?" }),
    chatDeps(new MemoryVoterRepository(), async () => {
      called = true;
      throw new Error("model should not be called");
    }),
  );
  const payload = (await response.json()) as {
    mode: string;
    refused: boolean;
    answer_markdown: string;
    sources: unknown[];
  };
  assert.equal(called, false);
  assert.equal(response.status, 200);
  assert.equal(payload.mode, "alignment");
  assert.equal(payload.refused, false);
  assert.match(payload.answer_markdown, /Form 2/i);
  assert.equal(/\bvote for\b/i.test(payload.answer_markdown), false);
  assert.deepEqual(payload.sources, []);
});

test("2026 coming-up answers lead with the midterm ballot, not a presidential general", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-president",
      office: "president",
      cycle: 2026,
      state: null,
      title: "President",
      jurisdiction: "United States",
      sourceUrl: "https://www.fec.gov/data/candidates/?office=P&election_year=2026",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-senate-NY",
      office: "senate",
      cycle: 2026,
      state: "NY",
      title: "U.S. Senate, New York",
      jurisdiction: "New York",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2028-president",
      office: "president",
      cycle: 2028,
      state: null,
      title: "President",
      jurisdiction: "United States",
    }),
  );

  let called = false;
  const response = await postChat(
    post({ message: "What elections are coming up", cycle: 2026 }),
    chatDeps(repo, async () => {
      called = true;
      throw new Error("model should not be called");
    }),
  );
  assert.equal(called, false);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    answer_markdown: string;
    mode: string;
    refreshedAt: string | null;
    sources: Array<{ title: string; url: string }>;
  };
  assert.equal(payload.mode, "factual");
  assert.match(payload.answer_markdown, /^\*\*2026 is a midterm year\.\*\*/);
  assert.match(payload.answer_markdown, /U\.S\. Senate and U\.S\. House/);
  assert.match(payload.answer_markdown, /no presidential general election/i);
  assert.doesNotMatch(payload.answer_markdown, /one national presidential/i);
  const senateAt = payload.answer_markdown.indexOf("U.S. Senate");
  const filingAt = payload.answer_markdown.search(/out-of-cycle/i);
  assert.equal(senateAt >= 0 && filingAt > senateAt, true);
  assert.match(payload.answer_markdown, /2026 U\.S\. presidential filings/);
  assert.equal(RACE_SLUG.test(proseWithoutUrls(payload.answer_markdown)), false);
  assert.equal(payload.answer_markdown.match(/is a midterm year/gi)?.length, 1);
  assert.equal(payload.answer_markdown.match(/not a full ballot/gi)?.length, 1);
  assert.equal(payload.answer_markdown.match(/no presidential general election/gi)?.length, 1);
  assert.equal(payload.refreshedAt, null);
  assert.equal(new Set(payload.sources.map((source) => source.url)).size, payload.sources.length);
  for (const source of payload.sources) {
    assert.equal(RACE_SLUG.test(source.title), false);
    assert.match(source.title, /2026 U\.S\. presidential filings/);
  }
  assert.equal(
    payload.sources.some((source) => source.url.includes("2026-senate-NY")),
    false,
  );

  const ny = await postChat(
    post({ message: "What elections are coming up in New York?", cycle: 2026 }),
    chatDeps(repo, async () => {
      throw new Error("model should not be called");
    }),
  );
  const nyBody = (await ny.json()) as {
    answer_markdown: string;
    sources: Array<{ title: string; url: string }>;
  };
  assert.match(nyBody.answer_markdown, /U\.S\. Senate, New York/);
  assert.match(nyBody.answer_markdown, /^\*\*2026 is a midterm year\.\*\*/);
  assert.equal(nyBody.answer_markdown.match(/is a midterm year/gi)?.length, 1);
  assert.equal(RACE_SLUG.test(proseWithoutUrls(nyBody.answer_markdown)), false);
  assert.equal(
    nyBody.sources.some((source) => source.title === "U.S. Senate, New York"),
    true,
  );
  for (const source of nyBody.sources) {
    assert.equal(RACE_SLUG.test(source.title), false);
  }

  const presidentialYear = await postChat(
    post({ message: "What elections are coming up", cycle: 2028 }),
    chatDeps(repo, async () => {
      throw new Error("model should not be called");
    }),
  );
  const yearBody = (await presidentialYear.json()) as { answer_markdown: string };
  assert.match(yearBody.answer_markdown, /^\*\*2028 is a presidential election year\.\*\*/);
  assert.match(yearBody.answer_markdown, /2028 U\.S\. presidential filings/);
  assert.equal(RACE_SLUG.test(proseWithoutUrls(yearBody.answer_markdown)), false);
  assert.equal(yearBody.answer_markdown.match(/is a presidential election year/gi)?.length, 1);

  const listed = await executeChatTool(
    "list_races",
    { office: "president", cycle: 2026 },
    { repo, env: {}, now, root: ROOT },
  );
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  const races = listed.content.races as Array<{ raceId: string; ballotRole: string; ballotNote: string }>;
  assert.equal(races[0]?.raceId, "2026-president");
  assert.equal(races[0]?.ballotRole, "out-of-cycle-presidential-filing");
  assert.match(races[0]?.ballotNote ?? "", /midterm/);
  const calendar = listed.content.cycleCalendar as Array<{ onBallot: string[]; midterm: boolean }>;
  assert.equal(calendar[0]?.midterm, true);
  assert.deepEqual(calendar[0]?.onBallot, ["senate", "house"]);
});

test("repeated midterm framing is said once, including when the question already said it", async () => {
  const repeated = await postChat(
    post({ message: "Summarize the 2026 federal calendar in one note." }),
    chatDeps(
      new MemoryVoterRepository(),
      scripted([
        modelJson({
          answer_markdown: [
            "**2026 is a midterm year.** Federal contests on the ballot are U.S. Senate and U.S. House. There is no presidential general election.",
            "2026 is a midterm year. There is no presidential general election. A stored presidential Form 2 for this cycle is an early or out-of-cycle filing, not the general election.",
            "Stored records are FEC Form 2 filings so far, not a full ballot.",
            "Stored records are FEC Form 2 filings so far, not a full ballot.",
          ].join("\n\n"),
          sources: [],
          refused: false,
        }),
      ]),
    ),
  );
  const body = (await repeated.json()) as { answer_markdown: string };
  assert.equal(body.answer_markdown.match(/is a midterm year/gi)?.length, 1);
  assert.equal(body.answer_markdown.match(/no presidential general election/gi)?.length, 1);
  assert.equal(body.answer_markdown.match(/not a full ballot/gi)?.length, 1);
  assert.match(body.answer_markdown, /early or out-of-cycle filing/i);

  const alreadySaid = await postChat(
    post({
      message:
        "What elections are coming up? 2026 is a midterm year. There is no presidential general election.",
      cycle: 2026,
    }),
    chatDeps(new MemoryVoterRepository(), async () => {
      throw new Error("model should not be called");
    }),
  );
  const said = (await alreadySaid.json()) as { answer_markdown: string };
  assert.equal(said.answer_markdown.match(/is a midterm year/gi)?.length ?? 0, 0);
  assert.equal(said.answer_markdown.match(/no presidential general election/gi)?.length ?? 0, 0);
  assert.match(said.answer_markdown, /U\.S\. Senate and U\.S\. House/);
});

test("source titles are human and equivalent urls collapse", async () => {
  assert.equal(labelForRaceId("2026-president"), "2026 U.S. presidential filings");
  assert.equal(labelForRaceId("2026-senate-KY"), "U.S. Senate, Kentucky");
  assert.equal(labelForRaceId("2026-house-KY-03"), "U.S. House, Kentucky District 3");

  const sources = polishSources([
    {
      title: "2026-senate-KY",
      url: "https://voter.example/races/2026-senate-KY",
      as_of: updatedAt,
    },
    {
      title: "U.S. Senate, Kentucky",
      url: "https://voter.example/races/2026-senate-KY/?utm_source=ask",
      as_of: updatedAt,
    },
    {
      title: "Form 2 100",
      url: "https://docquery.fec.gov/cgi-bin/fecimg/?1&utm_medium=email",
      as_of: updatedAt,
    },
    {
      title: "FEC Form 2 — Ada Klein",
      url: "https://docquery.fec.gov/cgi-bin/fecimg/?1",
      as_of: updatedAt,
    },
    {
      title: "S0KY00123",
      url: "https://www.fec.gov/data/candidates/?state=KY&office=S&election_year=2026",
      as_of: updatedAt,
    },
    {
      title: "U.S. Senate, Kentucky",
      url: "https://www.fec.gov/data/candidates/?election_year=2026&office=S&state=KY",
      as_of: updatedAt,
    },
  ]);
  assert.deepEqual(
    sources.map((source) => source.title),
    ["U.S. Senate, Kentucky", "FEC Form 2 — Ada Klein", "U.S. Senate, Kentucky"],
  );
  assert.equal(new Set(sources.map((source) => source.url)).size, sources.length);

  const repo = new MemoryVoterRepository();
  await repo.upsertCandidate(
    candidate({ candidateId: "S0CA00123", displayName: "Ada Klein" }),
  );
  await repo.upsertFiling(filing({ filingId: "100", fecLoadTimestamp: "2026-10-01 00:00:00" }));
  await repo.upsertFiling(
    filing({
      filingId: "200",
      fecLoadTimestamp: "2026-10-20 00:00:00",
      sourceUrl: "https://docquery.fec.gov/cgi-bin/forms/S0CA00123/1/?utm_source=fec",
    }),
  );
  const listed = await executeChatTool(
    "list_filings",
    { candidateId: "S0CA00123" },
    { repo, env: {}, now, root: ROOT },
  );
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  const titles = listed.sources.map((source) => source.title);
  assert.equal(titles.includes("FEC Form 2 — Ada Klein"), true);
  assert.equal(titles.some((title) => RACE_SLUG.test(title) || /^Form 2 \d/.test(title)), false);
  assert.equal(new Set(listed.sources.map((source) => source.url)).size, listed.sources.length);
});
