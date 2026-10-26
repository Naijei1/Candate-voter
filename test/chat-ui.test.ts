import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatComposer } from "../src/components/chat/ChatComposer";
import { ChatMessageList } from "../src/components/chat/ChatMessageList";
import type { ChatTurn } from "../src/components/chat/useChat";
import { postChatMessage } from "../src/lib/chat/browser";
import {
  buildChatRequestBody,
  chatPageHref,
  citationLink,
  classifyChatStatus,
  contextFromLocation,
  contextLabel,
  errorCopy,
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
  });
  assert.equal("sources" in built.body, false);
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
  assert.equal(contextLabel(chat), "Candidate H0AK00123 · 2026");
  assert.equal(
    chatPageHref({ raceId: "2026-senate-AK", cycle: 2026 }, "Who filed?"),
    "/chat?raceId=2026-senate-AK&year=2026&q=Who+filed%3F",
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
  assert.equal(parsed.threadId, "thread-1");
  assert.deepEqual(parsed.sources, [
    { title: "Alaska Senate", url: "/races/2026-senate-AK", as_of: "2026-10-26T17:00:00Z" },
  ]);

  const refused = parseChatSuccess({
    answer_markdown: "I can't recommend a candidate.",
    sources: [],
    refused: true,
  });
  assert.equal(refused.ok, true);
  if (!refused.ok) return;
  assert.equal(refused.refused, true);
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
  assert.match(formatAsOf("2026-10-26T17:00:00Z"), /As of Oct 26, 2026, 1:00 PM EDT/);
  assert.equal(formatAsOf("Oct 25, 2026"), "As of Oct 25, 2026");
  assert.equal(formatAsOf("unknown"), "As of unknown");
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
        threadId: "abc",
      });
    },
  });
  assert.equal(done.ok, true);
  if (!done.ok) return;
  assert.equal(done.refused, false);
  assert.equal(done.sources.length, 1);

  const refused = await postChatMessage({
    body: { message: "Who should I vote for?" },
    fetchImpl: async () =>
      jsonResponse({
        answer_markdown: "I can't recommend a candidate.",
        sources: [],
        refused: true,
      }),
  });
  assert.equal(refused.ok && refused.refused, true);

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

test("message states render sources only after a successful answer", () => {
  const empty = render(React.createElement(ChatMessageList, baseList({ turns: [] })));
  assert.match(empty, /Ask factual questions/);
  assert.match(empty, /does not rank candidates or give voting advice/);
  assert.match(empty, /Who filed in Alaska Senate/);

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
            markdown: "I can't recommend a candidate.",
            sources: [{ title: "FEC", url: "https://www.fec.gov/data/", as_of: "unknown" }],
          },
        ],
      }),
    ),
  );
  assert.match(refused, /role="status"/);
  assert.match(refused, /Where to look/);
  assert.doesNotMatch(refused, /Retry/);

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
            markdown: "One **filing** is stored.",
            sources: [{ title: "Alaska Senate", url: "/races/2026-senate-AK", as_of: "2026-10-26T17:00:00Z" }],
          },
        ],
      }),
    ),
  );
  assert.match(done, /Sources/);
  assert.match(done, /Alaska Senate/);
  assert.match(done, /href="\/races\/2026-senate-AK"/);
  assert.doesNotMatch(done, /target="_blank"/);

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
