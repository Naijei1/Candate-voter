import assert from "node:assert/strict";
import test from "node:test";
import { FecApiError, FecClient } from "../src/lib/fec/client";

const API_KEY = "super-secret-key";

test("pages Form 2 filings and pauses between calls", async () => {
  const urls: string[] = [];
  const sleeps: number[] = [];
  const client = new FecClient({
    apiKey: API_KEY,
    minDelayMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    fetch: async (input) => {
      const url = String(input);
      urls.push(url);
      const page = new URL(url).searchParams.get("page");
      const body =
        page === "1"
          ? {
              pagination: { page: 1, pages: 2, per_page: 1 },
              results: [{ file_number: 1 }],
            }
          : {
              pagination: { page: 2, pages: 2, per_page: 1 },
              results: [],
            };
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });

  const pages = [];
  for await (const page of client.iterateForm2({ perPage: 1, maxPages: 5 })) {
    pages.push(page);
  }

  assert.equal(pages.length, 1);
  assert.equal(pages[0]?.results[0]?.file_number, 1);
  assert.equal(sleeps.length, 1);
  const first = new URL(urls[0] ?? "");
  assert.equal(first.pathname, "/v1/efile/form2/");
  assert.equal(first.searchParams.get("api_key"), API_KEY);
  assert.deepEqual(first.searchParams.getAll("candidate_office"), ["H", "S", "P"]);
  assert.equal(first.searchParams.get("sort"), "load_timestamp");
  assert.equal(urls[1]?.includes("page=2"), true);
});

test("sends min_load_timestamp as a calendar date", () => {
  const client = new FecClient({ apiKey: API_KEY, fetch: async () => new Response("{}") });
  const url = client.buildForm2Url({
    minLoadTimestamp: "2026-10-25 18:29:15",
    page: 1,
  });
  assert.equal(url.searchParams.get("min_load_timestamp"), "2026-10-25");
  assert.equal(url.search.includes("18:29:15"), false);
});

test("retries 429 using Retry-After and keeps the key out of errors", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const client = new FecClient({
    apiKey: API_KEY,
    random: () => 0,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    fetch: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("{}", {
          status: 429,
          headers: { "retry-after": "1" },
        });
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    },
  });

  const body = await client.getForm2Page({ page: 1, perPage: 20 });
  assert.deepEqual(body.results, []);
  assert.deepEqual(sleeps, [1000]);
});

test("refuses to sleep through a long rate-limit window", async () => {
  const client = new FecClient({
    apiKey: API_KEY,
    random: () => 0,
    sleep: async () => {
      throw new Error("should not sleep");
    },
    fetch: async () =>
      new Response("{}", {
        status: 429,
        headers: { "retry-after": "3600" },
      }),
  });

  await assert.rejects(
    () => client.getForm2Page({ page: 1 }),
    (error: unknown) => {
      assert.ok(error instanceof FecApiError);
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes(API_KEY), false);
      assert.match(error.message, /rate limit window/);
      return true;
    },
  );
});

test("a non-retryable HTTP error redacts the api key", async () => {
  const client = new FecClient({
    apiKey: API_KEY,
    fetch: async () => new Response("nope", { status: 400 }),
  });
  await assert.rejects(
    () => client.getForm2Page({ page: 1 }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(API_KEY), false);
      assert.match(error.message, /HTTP 400/);
      assert.match(error.message, /api_key=redacted/);
      return true;
    },
  );
});
