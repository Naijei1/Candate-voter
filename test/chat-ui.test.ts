import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatComposer } from "../src/components/chat/ChatComposer";
import { ChatMessageList, loadingStatus } from "../src/components/chat/ChatMessageList";
import { MarkdownAnswer } from "../src/components/chat/MarkdownAnswer";
import { applyAskBinding, prepareRetry, settleAssistantTurn, type ChatTurn } from "../src/components/chat/useChat";
import { CHAT_TIMEOUT_MS, ChatCancelled, postChatMessage } from "../src/lib/chat/browser";
import {
  buildChatRequestBody,
  chatPageHref,
  citationLink,
  classifyChatStatus,
  contextFromLocation,
  contextLabel,
  presentedAskContext,
  errorCopy,
  citationAsOf,
  formatAsOf,
  parseChatSuccess,
  parseMarkdown,
  parseRetryAfterSeconds,
  plainText,
  rateLimitRemainingSeconds,
  suggestedPrompts,
  type InlineNode,
} from "../src/lib/chat/ui";

const NEUTRAL = /rank|endorse|should vote|best candidate|worst candidate|vote for/i;

test("request body keeps the locked fields and drops an invalid thread id", () => {
  const built = buildChatRequestBody({
    message: "  Who filed in Alaska Senate?  ",
    raceId: "2026-senate-AK",
    cycle: 2026,
    threadId: "not valid",
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.deepEqual(built.body, {
    message: "Who filed in Alaska Senate?",
    raceId: "2026-senate-AK",
    cycle: 2026,
    year: 2026,
  });
  assert.equal("sources" in built.body, false);
  assert.equal(built.body.year, built.body.cycle);
  assert.equal(CHAT_TIMEOUT_MS, 25_000);
});

test("context comes from the route and the year control", () => {
  const params = new URLSearchParams("year=2026");
  const race = contextFromLocation({
    pathname: "/races/2026-senate-AK",
    searchParams: params,
    cycles: [2026, 2028],
  });
  assert.equal(race.panel, true);
  assert.equal(race.raceId, "2026-senate-AK");
  assert.equal(race.cycle, 2026);
  assert.equal(contextLabel(race), "AK Senate · 2026");

  const chat = contextFromLocation({
    pathname: "/chat",
    searchParams: new URLSearchParams("candidateId=H0AK00123&year=2026"),
    cycles: [2026],
  });
  assert.equal(chat.panel, false);
  assert.equal(chat.candidateId, "H0AK00123");
  assert.equal(contextLabel(chat), "This candidate · 2026");
  assert.equal(
    chatPageHref({ raceId: "2026-senate-AK", cycle: 2026 }, "Who filed?"),
    "/chat?raceId=2026-senate-AK&year=2026&q=Who+filed%3F",
  );

  const home = contextFromLocation({
    pathname: "/",
    searchParams: new URLSearchParams("year=2026&state=tx&zip=78701-1234"),
    cycles: [2026, 2028],
  });
  assert.equal(home.panel, true);
  assert.equal(home.state, "TX");
  assert.equal(home.zip, "78701");
  assert.equal(home.cycle, 2026);
  assert.equal(contextLabel(home), "Texas · 2026");
  const zipBody = buildChatRequestBody({
    message: "Who's running?",
    state: home.state,
    zip: home.zip,
    cycle: home.cycle,
  });
  assert.equal(zipBody.ok, true);
  if (!zipBody.ok) return;
  assert.deepEqual(zipBody.body, {
    message: "Who's running?",
    state: "TX",
    zip: "78701",
    cycle: 2026,
    year: 2026,
  });
  assert.equal(
    chatPageHref({ state: "TX", zip: "78701", cycle: 2026 }),
    "/chat?year=2026&state=TX&zip=78701",
  );
});

test("suggested prompts and error copy stay factual", () => {
  for (const prompt of suggestedPrompts({})) {
    assert.equal(NEUTRAL.test(prompt), false);
  }
  for (const prompt of suggestedPrompts({ raceId: "2026-senate-AK", candidateId: "H0AK00123" })) {
    assert.equal(NEUTRAL.test(prompt), false);
  }
  assert.equal(NEUTRAL.test(errorCopy("bad_request", null)), false);
  assert.equal(NEUTRAL.test(errorCopy("rate_limit", 12)), false);
  assert.equal(NEUTRAL.test(errorCopy("unavailable", null)), false);
  assert.equal(NEUTRAL.test(errorCopy("network", null)), false);
  assert.equal(NEUTRAL.test(errorCopy("timeout", null)), false);
  assert.equal(NEUTRAL.test(errorCopy("incomplete", null)), false);
  assert.equal(NEUTRAL.test(errorCopy("model_unavailable", null)), false);
  assert.equal(
    errorCopy("timeout", null),
    "This stopped before an answer came back. Retry asks the same question again.",
  );
  assert.equal(errorCopy("incomplete", null), "The answer was incomplete. Try one race at a time.");
  assert.equal(errorCopy("model_unavailable", null), "The model is unavailable.");
  assert.match(errorCopy("rate_limit", 12), /12 seconds/);
  assert.match(errorCopy("rate_limit", 0), /You can retry/);
  assert.match(errorCopy("rate_limit", null), /wait a minute/);
  assert.match(errorCopy("bad_request", null), /2,000/);
});

test("Retry-After accepts delta-seconds and an HTTP-date", () => {
  assert.equal(parseRetryAfterSeconds("12", 0), 12);
  assert.equal(parseRetryAfterSeconds(null, 0), null);
  const now = Date.parse("2026-10-26T17:00:00Z");
  assert.equal(parseRetryAfterSeconds("Mon, 26 Oct 2026 17:00:30 GMT", now), 30);
  assert.equal(rateLimitRemainingSeconds(now + 1500, now), 2);
  assert.equal(rateLimitRemainingSeconds(null, now), 0);
  assert.equal(classifyChatStatus(400), "bad_request");
  assert.equal(classifyChatStatus(429), "rate_limit");
  assert.equal(classifyChatStatus(503), "unavailable");
});

test("success parsing keeps refused and drops malformed sources", () => {
  const parsed = parseChatSuccess({
    answer_markdown: "Two candidates filed.",
    refused: false,
    mode: "factual",
    threadId: "thread-1",
    sources: [
      { title: "Alaska Senate", url: "/races/2026-senate-AK", as_of: "2026-10-26T17:00:00Z" },
      { title: "", url: "/nope", as_of: "unknown" },
      { note: "invented" },
    ],
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.refused, false);
  assert.equal(parsed.mode, "factual");
  assert.equal(parsed.threadId, "thread-1");
  assert.deepEqual(parsed.sources, [
    { title: "Alaska Senate", url: "/races/2026-senate-AK", as_of: "2026-10-26T17:00:00Z" },
  ]);

  const refused = parseChatSuccess({
    answer_markdown: "I can't recommend a candidate.",
    sources: [],
    refused: true,
    mode: "alignment",
  });
  assert.equal(refused.ok, true);
  if (!refused.ok) return;
  assert.equal(refused.refused, true);
  assert.equal(refused.mode, "alignment");
  assert.deepEqual(refused.sources, []);
  assert.equal(parseChatSuccess({ sources: [] }).ok, false);
});

test("markdown allows paragraphs, lists, bold, and safe links", () => {
  const blocks = parseMarkdown(
    "See **FEC filings** for [Alaska Senate](/races/2026-senate-AK) and [FEC](https://www.fec.gov/data/).\n\n- Filed Mar 4\n- Filed May 12\n\n<script>alert(1)</script>",
    { origin: "https://voter.naijei.com" },
  );
  assert.equal(blocks[0]?.type, "p");
  assert.equal(blocks[1]?.type, "ul");
  assert.equal(blocks[2]?.type, "p");
  const paragraph = blocks[0];
  if (paragraph?.type !== "p") return;
  const nodes = paragraph.lines[0] ?? [];
  assert.equal(nodes.some((node) => node.type === "bold"), true);
  const links = nodes.filter((node) => node.type === "link");
  assert.equal(links[0]?.type === "link" && links[0].external, false);
  assert.equal(links[1]?.type === "link" && links[1].external, true);
  assert.match(plainText(nodes), /FEC filings/);
  const script = blocks[2];
  if (script?.type !== "p") return;
  assert.match(plainText(script.lines[0] ?? []), /<script>alert\(1\)<\/script>/);
  assert.equal(collectHrefs(nodes).includes("javascript:alert(1)"), false);
});

test("citations stay in-app for Candate paths and open FEC in a new tab", () => {
  assert.deepEqual(citationLink("/races/2026-senate-AK"), {
    href: "/races/2026-senate-AK",
    external: false,
  });
  assert.deepEqual(
    citationLink("https://voter.naijei.com/voter/candidates/H0AK00123", {
      origin: "https://voter.naijei.com",
      basePath: "/voter",
    }),
    { href: "/candidates/H0AK00123", external: false },
  );
  const fec = citationLink("https://www.fec.gov/data/elections/senate/AK/2026/");
  assert.equal(fec?.external, true);
  assert.equal(citationLink("javascript:alert(1)"), null);
  assert.match(formatAsOf("2026-10-26T17:00:00Z"), /As of Oct 26, 2026, 1:00\sPM ET/);
  assert.equal(formatAsOf("Oct 25, 2026"), "As of Oct 25, 2026");
  assert.equal(formatAsOf("unknown"), "As of unknown");
  assert.match(citationAsOf("2026-10-26T17:00:00Z", "2026-10-26T18:48:47.307Z"), /1:00\sPM ET/);
  assert.doesNotMatch(citationAsOf("2026-10-26T17:00:00Z", "2026-10-26T18:48:47.307Z"), /2:48/);
  assert.match(citationAsOf("unknown", "2026-10-26T18:48:47.307Z"), /2:48\sPM ET/);
  assert.equal(citationAsOf("unknown", null), "As of unknown");
});

test("POST /api/chat maps 200, refused, 400, 429, 503, and network", async () => {
  const done = await postChatMessage({
    body: { message: "Who filed?" },
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "/api/chat");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(Object.keys(body), ["message"]);
      return jsonResponse({
        answer_markdown: "One filing.",
        sources: [{ title: "Race", url: "/races/2026-senate-AK", as_of: "unknown" }],
        refused: false,
        mode: "factual",
        threadId: "abc",
      });
    },
  });
  assert.equal(done.ok, true);
  if (!done.ok) return;
  assert.equal(done.refused, false);
  assert.equal(done.mode, "factual");
  assert.equal(done.sources.length, 1);

  const refused = await postChatMessage({
    body: { message: "Who should I vote for?" },
    fetchImpl: async () =>
      jsonResponse({
        answer_markdown: "I can't recommend a candidate.",
        sources: [],
        refused: true,
        mode: "factual",
      }),
  });
  assert.equal(refused.ok && refused.refused, true);
  assert.equal(refused.ok && refused.mode, "factual");

  const bad = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "bad_request" }, 400),
  });
  assert.deepEqual(bad, { ok: false, kind: "bad_request", retryAfterSeconds: null });

  const limited = await postChatMessage({
    body: { message: "x" },
    nowMs: () => 1_000,
    fetchImpl: async () => jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "15" }),
  });
  assert.deepEqual(limited, { ok: false, kind: "rate_limit", retryAfterSeconds: 15 });

  const down = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "unavailable" }, 503),
  });
  assert.equal(down.ok, false);
  if (down.ok) return;
  assert.equal(down.kind, "unavailable");
  assert.equal(down.retryAfterSeconds, null);

  const offline = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => {
      throw new TypeError("failed");
    },
  });
  assert.deepEqual(offline, { ok: false, kind: "network", retryAfterSeconds: null });

  const broken = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ sources: [{ title: "Invented", url: "https://example.com", as_of: "now" }] }),
  });
  assert.equal(broken.ok, false);
  if (broken.ok) return;
  assert.equal("sources" in broken, false);
});

test("chat client timeout settles when fetch never resolves", async () => {
  const started = Date.now();
  const result = await postChatMessage({
    body: { message: "Who filed?", raceId: "2026-senate-KY", cycle: 2026 },
    timeoutMs: 40,
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.raceId, "2026-senate-KY");
      assert.equal(body.cycle, 2026);
      assert.equal(body.message, "Who filed?");
      return new Promise(() => {});
    },
  });
  assert.deepEqual(result, { ok: false, kind: "timeout", retryAfterSeconds: null });
  assert.ok(Date.now() - started < 1_000);
});

test("caller abort cancels even when fetch ignores the signal", async () => {
  const controller = new AbortController();
  const pending = postChatMessage({
    body: { message: "Who filed?", raceId: "2026-senate-KY", cycle: 2026 },
    signal: controller.signal,
    timeoutMs: 5_000,
    fetchImpl: () => new Promise(() => {}),
  });
  controller.abort();
  await assert.rejects(pending, (error: unknown) => error instanceof ChatCancelled);
});

test("503 code picks the visitor sentence and a missing code stays on status", async () => {
  const timed = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "unavailable", message: "slow", code: "timeout" }, 503),
  });
  assert.deepEqual(timed, { ok: false, kind: "timeout", retryAfterSeconds: null });

  const model = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "unavailable", code: "model_unavailable" }, 503),
  });
  assert.deepEqual(model, { ok: false, kind: "model_unavailable", retryAfterSeconds: null });

  const incomplete = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "unavailable", code: "incomplete" }, 503),
  });
  assert.deepEqual(incomplete, { ok: false, kind: "incomplete", retryAfterSeconds: null });

  const plain = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "unavailable", message: "down" }, 503),
  });
  assert.deepEqual(plain, { ok: false, kind: "unavailable", retryAfterSeconds: null });
});

test("504 maps to the retryable unavailable error", async () => {
  const gateway = await postChatMessage({
    body: { message: "x" },
    fetchImpl: async () => jsonResponse({ error: "timeout" }, 504),
  });
  assert.deepEqual(gateway, { ok: false, kind: "unavailable", retryAfterSeconds: null });
});

test("a settled answer or timeout replaces the loading row", () => {
  const loading: ChatTurn[] = [
    { id: "u", role: "user", text: "Who filed?" },
    { id: "a", role: "assistant", status: "loading" },
  ];
  const done = settleAssistantTurn(
    loading,
    "a",
    {
      ok: true,
      refused: false,
      answer_markdown: "Two candidates filed.",
      sources: [],
      mode: "factual",
    },
    0,
  );
  assert.equal(done[1]?.role === "assistant" && done[1].status, "done");

  const timedOut = settleAssistantTurn(loading, "missing", {
    ok: false,
    kind: "network",
    retryAfterSeconds: null,
  }, 0);
  assert.equal(timedOut[1]?.role === "assistant" && timedOut[1].status, "error");
  if (timedOut[1]?.role !== "assistant" || timedOut[1].status !== "error") return;
  assert.equal(timedOut[1].kind, "network");

  const markup = render(
    React.createElement(
      ChatMessageList,
      baseList({
        turns: timedOut,
      }),
    ),
  );
  assert.match(markup, /Check your connection and try again/);
  assert.match(markup, /Retry/);
  assert.doesNotMatch(markup, /Looking up public records/);
});

test("message states render sources only after a successful answer", () => {
  const empty = render(React.createElement(ChatMessageList, baseList({ turns: [] })));
  assert.match(empty, /Ask factual questions/);
  assert.doesNotMatch(empty, /voting advice/);
  assert.doesNotMatch(empty, /Who filed in Alaska Senate/);
  assert.doesNotMatch(empty, /Suggested prompts/);
  assert.doesNotMatch(empty, /<button/);

  const refused = render(
    React.createElement(
      ChatMessageList,
      baseList({
        turns: [
          user("Who should I vote for?"),
          {
            id: "a",
            role: "assistant",
            status: "refused",
            mode: "factual",
            markdown: "I can't recommend a candidate.",
            sources: [{ title: "FEC", url: "https://www.fec.gov/data/", as_of: "unknown" }],
          },
        ],
      }),
    ),
  );
  assert.match(refused, /role="status"/);
  assert.match(refused, /Where to look/);
  assert.match(refused, /recommend a candidate/);
  assert.doesNotMatch(refused, /Retry/);
  assert.doesNotMatch(refused, /Who filed in Alaska Senate/);
  assert.doesNotMatch(refused, /Viewpoint similarity uses public records only/);

  const aligned = render(
    React.createElement(
      ChatMessageList,
      baseList({
        turns: [
          user("Whose views are similar to mine?"),
          {
            id: "align",
            role: "assistant",
            status: "done",
            mode: "alignment",
            markdown: "Two stored filers discuss housing.",
            sources: [],
          },
        ],
      }),
    ),
  );
  assert.match(aligned, /Viewpoint similarity uses public records only/);
  assert.match(aligned, /This is not a voting recommendation/);
  assert.doesNotMatch(aligned, /Retry/);

  const limited = render(
    React.createElement(
      ChatMessageList,
      baseList({
        now: 1_000,
        turns: [
          user("Who filed?"),
          {
            id: "e",
            role: "assistant",
            status: "error",
            kind: "rate_limit",
            retryAt: 13_000,
            retryAfterSeconds: 12,
            hadRetryAfter: true,
          },
        ],
      }),
    ),
  );
  assert.match(limited, /role="alert"/);
  assert.match(limited, /wait 12 seconds/);
  assert.match(limited, /Retry in 12s/);
  assert.match(limited, /disabled=""/);
  assert.doesNotMatch(limited, /Sources/);
  assert.doesNotMatch(limited, /fec\.gov/);

  const bad = render(
    React.createElement(
      ChatMessageList,
      baseList({
        turns: [
          user("x"),
          {
            id: "b",
            role: "assistant",
            status: "error",
            kind: "bad_request",
            retryAt: null,
            retryAfterSeconds: null,
            hadRetryAfter: false,
          },
        ],
      }),
    ),
  );
  assert.match(bad, /2,000 characters/);
  assert.doesNotMatch(bad, /Retry/);

  const done = render(
    React.createElement(
      ChatMessageList,
      baseList({
        turns: [
          user("Who filed?"),
          {
            id: "d",
            role: "assistant",
            status: "done",
            mode: "factual",
            markdown: "One **filing** is stored.",
            sources: [{ title: "Alaska Senate", url: "/races/2026-senate-AK", as_of: "2026-10-26T17:00:00Z" }],
          },
        ],
      }),
    ),
  );
  assert.match(done, /Sources/);
  assert.match(done, /Alaska Senate/);
  assert.match(done, /As of/);
  assert.match(done, /href="\/races\/2026-senate-AK"/);
  assert.doesNotMatch(done, /target="_blank"/);

  const leaked = render(
    React.createElement(MarkdownAnswer, {
      markdown:
        'See partyLabel: "Republican" in this site\'s database. [https://www.fec.gov/data/](https://www.fec.gov/data/) [2026-house-KY-01](/races/2026-house-KY-01)',
    }),
  );
  assert.doesNotMatch(leaked, /partyLabel/);
  assert.doesNotMatch(leaked, /database/i);
  assert.match(leaked, /Republican/);
  assert.match(leaked, /public FEC records/);
  assert.match(leaked, /U\.S\. House, Kentucky District 1/);
  assert.doesNotMatch(leaked, />https:\/\/www\.fec\.gov/);

  const composer = render(
    React.createElement(ChatComposer, {
      value: "",
      pending: false,
      sendLocked: false,
      onChange() {},
      onSend() {},
      onCancel() {},
    }),
  );
  assert.match(composer, /aria-label="Ask about races or candidates"/);
  assert.match(composer, /disabled=""/);
});

test("Ask context year follows the year control and stale threads stay stored", () => {
  const located = contextFromLocation({
    pathname: "/races/2026-senate-CA",
    searchParams: new URLSearchParams("year=2028&state=CA"),
    cycles: [2026, 2028],
  });
  assert.equal(located.cycle, 2028);
  assert.equal(located.raceId, undefined);
  const shown = presentedAskContext(located, {
    cycle: 2026,
    raceId: "2026-senate-CA",
    state: "CA",
    label: "U.S. Senate, California · 2026",
    messagePrefix: "Page context: browsing California · 2026. Stored Senate and House race ids: 2026-senate-CA, 2026-house-CA-11.",
  });
  assert.equal(shown.cycle, 2028);
  assert.equal(shown.raceId, undefined);
  assert.equal(shown.label, undefined);
  assert.equal(shown.messagePrefix, undefined);
  assert.equal(contextLabel(shown), "California · 2028");

  const matched = presentedAskContext(
    contextFromLocation({
      pathname: "/races/2026-senate-CA",
      searchParams: new URLSearchParams("year=2026&state=CA"),
      cycles: [2026, 2028],
    }),
    {
      cycle: 2026,
      raceId: "2026-senate-CA",
      state: "CA",
      label: "U.S. Senate, California · 2026",
    },
  );
  assert.equal(matched.raceId, "2026-senate-CA");
  assert.equal(matched.cycle, 2026);
  assert.equal(contextLabel(matched), "U.S. Senate, California · 2026");

  const empty = { bindingKey: null, historyScope: null, draft: "", turns: [] as ChatTurn[] };
  const stored = {
    bindingKey: "2026|CA|2026-senate-CA||mixed",
    historyScope: "mixed" as const,
    threadId: "thread-house",
    draft: "old",
    turns: [{ id: "u", role: "user" as const, text: "Who is running?" }],
  };
  const opened = applyAskBinding(empty, "2026|CA|2026-senate-CA||senate", stored);
  assert.equal(opened.restore, false);
  assert.equal(opened.state.turns.length, 0);
  assert.equal(opened.state.threadId, undefined);

  const again = applyAskBinding(empty, stored.bindingKey, stored);
  assert.equal(again.restore, true);
  assert.equal(again.state.threadId, "thread-house");

  const switched = applyAskBinding(again.state, "2028|CA|2026-senate-CA||senate", stored);
  assert.equal(switched.clear, true);
  assert.equal(switched.state.turns.length, 0);
  assert.equal(switched.state.draft, "");
  assert.equal(switched.state.threadId, undefined);

  const provisional = applyAskBinding(empty, "2026||||open", stored);
  assert.equal(provisional.restore, false);
  const settled = applyAskBinding(provisional.state, stored.bindingKey, stored);
  assert.equal(settled.restore, true);
  assert.equal(settled.state.turns.length, 1);
});

test("Ask wait copy warns before the 25s abort", () => {
  assert.equal(loadingStatus(0), "Looking up public records…");
  assert.equal(loadingStatus(3_000), "Looking up public records…");
  assert.equal(loadingStatus(4_000), "Still looking up public records… You can cancel. This has not stopped.");
  assert.match(loadingStatus(8_000), /Still looking up public records \(8s\)/);
  assert.match(loadingStatus(8_000), /25 seconds/);
  assert.doesNotMatch(loadingStatus(8_000), /narrower question/);
  assert.match(loadingStatus(16_000), /This stops at 25 seconds/);
  assert.match(loadingStatus(16_000), /Retry then asks the same question again/);
  assert.match(loadingStatus(16_000), /16s/);
  assert.equal(CHAT_TIMEOUT_MS, 25_000);
});

test("a long Ask list keeps the count and collapses the rest", () => {
  const lines = Array.from({ length: 10 }, (_, index) => `- Filer ${String(index + 1).padStart(2, "0")}`).join("\n");
  const html = render(
    React.createElement(MarkdownAnswer, {
      markdown: `**10** candidates have FEC Form 2 filings.\n\n${lines}`,
    }),
  );
  assert.match(html, /10/);
  assert.match(html, /Filer 01/);
  assert.match(html, /Filer 06/);
  assert.doesNotMatch(html, /Filer 07/);
  assert.match(html, /Show all 10/);
  assert.match(html, /aria-expanded="false"/);
});

test("retry clears an abort and resends the same question", () => {
  const turns: ChatTurn[] = [
    { id: "u", role: "user", text: "Who is running for Senate?" },
    {
      id: "a",
      role: "assistant",
      status: "error",
      kind: "timeout",
      retryAt: null,
      retryAfterSeconds: null,
      hadRetryAfter: false,
    },
  ];
  const prepared = prepareRetry(turns);
  assert.ok(prepared);
  assert.equal(prepared.message, "Who is running for Senate?");
  assert.equal(prepared.assistantId, "a");
  assert.equal(prepared.turns[0]?.role === "user" && prepared.turns[0].text, "Who is running for Senate?");
  assert.equal(prepared.turns[1]?.role === "assistant" && prepared.turns[1].status, "loading");
  assert.equal(
    prepareRetry([
      { id: "u", role: "user", text: "x" },
      {
        id: "b",
        role: "assistant",
        status: "error",
        kind: "bad_request",
        retryAt: null,
        retryAfterSeconds: null,
        hadRetryAfter: false,
      },
    ]),
    null,
  );
});

test("deadline abort stays a timeout when fetch rejects AbortError", async () => {
  const result = await postChatMessage({
    body: { message: "Who is running for Senate?" },
    timeoutMs: 30,
    fetchImpl: (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("missing signal"));
          return;
        }
        signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });
  assert.deepEqual(result, { ok: false, kind: "timeout", retryAfterSeconds: null });
});

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

function user(text: string): ChatTurn {
  return { id: "u", role: "user", text };
}

function baseList(overrides: { turns: ChatTurn[]; now?: number }) {
  return {
    turns: overrides.turns,
    prompts: ["Who filed in Alaska Senate?"],
    pending: false,
    now: overrides.now ?? 0,
    onPick() {},
    onRetry() {},
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function collectHrefs(nodes: InlineNode[]): string[] {
  const hrefs: string[] = [];
  for (const node of nodes) {
    if (node.type === "link") hrefs.push(node.href);
    if (node.type !== "text") hrefs.push(...collectHrefs(node.children));
  }
  return hrefs;
}
