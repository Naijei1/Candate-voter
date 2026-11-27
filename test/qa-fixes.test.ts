import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createCompareService } from "../src/lib/compare/service";
import { summarizeRace } from "../src/lib/compare/summarize";
import { postChat, type ChatDeps } from "../src/lib/chat/handler";
import { activityCards } from "../src/lib/site/news-activity";
import type { TodayCard } from "../src/lib/site/today";
import { createRateLimiter } from "../src/lib/chat/rate-limit";
import type { ConverseFn } from "../src/lib/chat/types";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { certificationPhrase } from "../src/lib/site/certified-results";
import { compareBasis } from "../src/lib/compare/evidence";
import { shownName } from "../src/lib/site/ky-officeholders";

const now = new Date("2026-11-24T18:00:00Z");

test("certification copy follows the calendar day and does not name a winner", () => {
  assert.equal(certificationPhrase("2026-11-23", now), "Certification was due Nov 23.");
  assert.equal(certificationPhrase("2026-11-24", now), "Certification is due Nov 24.");
  assert.equal(certificationPhrase("2026-11-25", now), "Certification due Nov 25.");
  const basis = compareBasis("2026-senate-KY");
  assert.ok(basis?.know.some((claim) => claim.text.includes("was not a candidate")));
  assert.equal(basis?.know.some((claim) => /is not a candidate/.test(claim.text)), false);
});

test("public names use the shorter officeholder form when it is the same person", () => {
  assert.equal(shownName("James R. Comer", "H6KY01110"), "James Comer");
  assert.equal(shownName("S. Brett Guthrie", "H8KY02031"), "Brett Guthrie");
  assert.equal(shownName("Hal Rogers", "H0KY05015"), "Hal Rogers");
  assert.equal(shownName("Jay J Bowman", "H6KY06234"), "Jay J Bowman");
});

test("dead campaign and X links are not stored", () => {
  const profiles = readFileSync("data/ky-profiles.json", "utf8");
  const filings = readFileSync("src/content/fec/2026-senate-ky.json", "utf8");
  for (const url of ["campbell4congress.info", "x.com/barrforsenate", "x.com/Bowman2026_KY", "NATEMORRIS.COM", "natemorris.com"]) {
    assert.equal(profiles.includes(url), false, url);
    assert.equal(filings.includes(url), false, url);
  }
  assert.match(profiles, /barrforsenate\.com/);
});

test("the hero opens on the public-domain voting excerpt", () => {
  const film = JSON.parse(readFileSync("data/ky-hero-film.json", "utf8")) as { title: string; license: string }[];
  assert.equal(film[0]?.title, "Tuesday in November");
  assert.match(film[0]?.license ?? "", /Public domain/);
  assert.match(readFileSync("src/app/layout.tsx", "utf8"), /Voters marking ballots/);
});

test("news and finance can be cached, and unknown routes are real 404s", () => {
  const news = readFileSync("src/app/news/page.tsx", "utf8");
  const finance = readFileSync("src/app/finance/page.tsx", "utf8");
  assert.match(news, /export const revalidate = 3600/);
  assert.match(finance, /export const revalidate = 3600/);
  assert.equal(news.includes("force-dynamic"), false);
  assert.equal(finance.includes("force-dynamic"), false);
  assert.equal(news.includes("searchParams"), false);
  assert.equal(finance.includes("searchParams"), false);
  assert.equal(existsSync("src/app/loading.tsx"), false);
  assert.equal(existsSync("src/app/about/page.tsx"), false);
  const middleware = readFileSync("src/middleware.ts", "utf8");
  assert.match(middleware, /pathname = "\/news"/);
  assert.match(middleware, /hash = "map"/);
  // v12: the county guide replaces the stepped GuideFlow; write-ins are labeled in the shared person view.
  assert.match(readFileSync("src/components/tv/client/Guide.tsx", "utf8"), /Pick the one on your voter card/);
  assert.match(readFileSync("src/lib/tv/people.ts", "utf8"), /person\.role === "write-in" \? "Write-in" : person\.party/);
});

test("Ask answers the six ballot questions from stored Kentucky records", async () => {
  const repo = new MemoryVoterRepository();
  let calls = 0;
  const converse: ConverseFn = async () => {
    calls += 1;
    throw new Error("model should not be called");
  };
  const compare = createCompareService({
    limiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    globalLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    async summarize(basis) {
      const cites = basis.people.map((person) => basis.evidence.find((row) => row.personId === person.id)?.id);
      const result = JSON.stringify({
        differ: [{ text: "Barr and Booker addressed the cost of living in different ways.", cites }],
        agree: [{ text: "Both candidates discussed costs.", cites }],
      });
      return summarizeRace(basis, {
        modelId: "test",
        converse: async () => ({
          stopReason: "end_turn",
          message: { role: "assistant", content: [{ text: result }] },
        }),
      });
    },
  });
  const deps: ChatDeps = {
    env: { CANDATE_CHAT_ENABLED: "true" },
    now,
    repository: () => repo,
    converse,
    siteRoot: "https://voter.example",
    dailyLimiter: { take: () => ({ ok: true }) },
    rateLimiter: createRateLimiter({ limit: 20, windowMs: 60_000 }),
    compare,
  };
  async function ask(message: string, raceId?: string) {
    const response = await postChat(new Request("https://voter.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      body: JSON.stringify({ message, cycle: 2026, state: "KY", ...(raceId ? { raceId } : {}) }),
    }), deps);
    const body = await response.json() as { answer_markdown?: string; error?: string; message?: string };
    assert.equal(response.status, 200, `${message} ${body.message ?? ""}`);
    return body.answer_markdown ?? "";
  }

  const senate = await ask("Who is on the ballot for U.S. Senate?", "2026-senate-KY");
  assert.match(senate, /Andy Barr/);
  assert.match(senate, /Charles Booker/);
  assert.match(senate, /Christopher Campbell/);
  assert.match(senate, /Thomas Michael Murphy/);
  assert.doesNotMatch(senate, /Nate Morris/);

  const fromSenate = await ask("How much has Morgan McGarvey raised?", "2026-senate-KY");
  assert.match(fromSenate, /Morgan McGarvey/);
  assert.match(fromSenate, /1,998,328/);
  assert.match(fromSenate, /District 3/);
  assert.doesNotMatch(fromSenate, /couldn't find|not in the stored/i);

  const won = await ask("Who won the U.S. Senate race in Kentucky?", "2026-senate-KY");
  assert.match(won, /not certified yet/);
  assert.match(won, /Certification was due Nov 23/);
  assert.match(won, /See official results/);
  assert.doesNotMatch(won, /was elected/);

  const due = await ask("When will Kentucky certify the November results?", "2026-senate-KY");
  assert.match(due, /Certification was due Nov 23, 2026/);
  assert.match(due, /See official results/);

  const fromHouse = await ask("How much has Morgan McGarvey raised?", "2026-house-KY-03");
  assert.match(fromHouse, /Morgan McGarvey/);
  assert.match(fromHouse, /1,998,328/);

  const compared = await ask("Where do Barr and Booker differ and agree?");
  assert.match(compared, /Where they differ/);
  assert.match(compared, /Where they agree/);
  assert.equal(calls, 0);
});

test("money, primary, and other-year questions stay on the matching stored record", async () => {
  const repo = new MemoryVoterRepository();
  let calls = 0;
  const converse: ConverseFn = async () => {
    calls += 1;
    return { stopReason: "end_turn", message: { role: "assistant", content: [{ text: "Looked up the other year." }] } };
  };
  const deps: ChatDeps = {
    env: { CANDATE_CHAT_ENABLED: "true" },
    now,
    repository: () => repo,
    converse,
    siteRoot: "https://voter.example",
    dailyLimiter: { take: () => ({ ok: true }) },
    rateLimiter: createRateLimiter({ limit: 20, windowMs: 60_000 }),
  };
  async function ask(message: string, extra: { raceId?: string; cycle?: number } = {}) {
    const response = await postChat(new Request("https://voter.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
      body: JSON.stringify({ message, cycle: extra.cycle ?? 2026, state: "KY", ...(extra.raceId ? { raceId: extra.raceId } : {}) }),
    }), deps);
    const body = await response.json() as { answer_markdown?: string; message?: string };
    assert.equal(response.status, 200, `${message} ${body.message ?? ""}`);
    return body.answer_markdown ?? "";
  }

  const spent = await ask("How much has Morgan McGarvey spent?", { raceId: "2026-senate-KY" });
  assert.match(spent, /spent \$1,327,899\.66/);
  assert.doesNotMatch(spent, /raised \$1,998,328/);

  const primary = await ask("Who won the Republican Senate primary?", { raceId: "2026-senate-KY" });
  assert.match(primary, /Andy Barr/);
  assert.match(primary, /Republican Party primary/);
  assert.doesNotMatch(primary, /not certified yet/);

  const both = await ask("Who won the Republican primary and Democratic primary for Senate?", { raceId: "2026-senate-KY" });
  assert.match(both, /Andy Barr/);
  assert.match(both, /Charles Booker/);
  assert.match(both, /Republican Party primary/);
  assert.match(both, /Democratic Party primary/);

  const campaign = await ask("How much has Andy Barr spent?", { raceId: "2026-senate-KY" });
  assert.match(campaign, /spent \$14,615,968\.43/);

  const outside = await ask("What was outside spending against Andy Barr?", { raceId: "2026-senate-KY" });
  assert.doesNotMatch(outside, /spent \$14,615,968\.43/);

  const older = await ask("Who won the 2022 Kentucky Senate race?", { raceId: "2026-senate-KY" });
  assert.doesNotMatch(older, /not certified yet/);
  assert.doesNotMatch(older, /Certification was due/);
  assert.doesNotMatch(older, /was elected/);

  const page = await ask("Who is on the ballot for U.S. Senate?", { raceId: "2024-senate-KY", cycle: 2024 });
  assert.match(page, /2024|Looked up the other year/);
  assert.doesNotMatch(page, /Andy Barr/);
  assert.doesNotMatch(page, /November 3, 2026/);
  assert.ok(calls <= 2);
});

test("activity keeps receipts and spending when filings already fill a page", () => {
  const card = (id: string, personId: string): TodayCard => ({
    id, title: id, text: id, date: "2026-11-01", when: "Nov 1", sourceName: "FEC", sourceUrl: "https://www.fec.gov",
    personId, personName: personId, group: personId,
  });
  const cards = activityCards({
    filings: Array.from({ length: 13 }, (_, index) => card(`filing-${index}`, "filer")),
    receipts: [card("receipt-1", "raiser")],
    spending: [card("spend-1", "spender")],
  }, "");
  assert.equal(cards.filter((item) => item.id.startsWith("filing")).length, 12);
  assert.ok(cards.some((item) => item.id === "receipt-1"));
  assert.ok(cards.some((item) => item.id === "spend-1"));
});
