import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { seatLabel } from "../src/components/site/CandidateCard";
import { sharedRefusal } from "../src/components/home/CompareSection";
import { createRateLimiter, trustedClientAddress } from "../src/lib/chat/rate-limit";
import { CHAT_SYSTEM_PROMPT } from "../src/lib/chat/prompt";
import { compareBasis, compareOption, COMPARE_RACE_IDS, REFUSALS } from "../src/lib/compare/evidence";
import { AI_CACHE_MS, createCompareService, FALLBACK_CACHE_MS } from "../src/lib/compare/service";
import { recordsOnlySummary, type CompareSummary } from "../src/lib/compare/summarize";
import type { FinanceOutside } from "../src/lib/finance/model";
import { targetLines, topCommittees } from "../src/lib/site/money-charts";
import { formatOrgName } from "../src/lib/site/org-name";

test("committee names read naturally: acronyms, Mc names, small words, ordinals", () => {
  assert.equal(formatOrgName("KEEP AMERICA GREAT PAC, INC."), "Keep America Great PAC, Inc.");
  assert.equal(formatOrgName("RJC VICTORY FUND"), "RJC Victory Fund");
  assert.equal(formatOrgName("MORGAN MCGARVEY FOR CONGRESS"), "Morgan McGarvey for Congress");
  assert.equal(formatOrgName("KENTUCKY 4TH PAC"), "Kentucky 4th PAC");
  assert.equal(formatOrgName("MIKE FARIS FOR U.S. SENATE"), "Mike Faris for U.S. Senate");
  assert.equal(formatOrgName("THE AMERICAN MISSION"), "The American Mission");
  assert.equal(formatOrgName("AFL-CIO WORKERS VOICE PAC"), "AFL-CIO Workers Voice PAC");
  assert.equal(formatOrgName("TURNING POINT PAC INC."), "Turning Point PAC Inc.");
  // Already mixed case: left alone.
  assert.equal(formatOrgName("Kentucky 4th PAC"), "Kentucky 4th PAC");
});

test("outside-groups chart says who each group supported or opposed, from FEC rows only", () => {
  const row = (committeeId: string, candidateId: string, support: "support" | "oppose", total: number): FinanceOutside => ({
    candidateId,
    raceId: null,
    candidateName: null,
    committeeId,
    committeeName: "KENTUCKY 4TH PAC",
    support,
    cycle: 2026,
    total,
    count: 1,
    sourceUrl: "https://www.fec.gov/",
    sourceLabel: "FEC independent expenditures",
    updatedAt: "2026-11-01T00:00:00Z",
  });
  const nominees = new Map([
    ["H1", "Ed Gallrein"],
    ["H2", "Melissa Strange"],
  ]);
  const [group] = topCommittees([row("C1", "H1", "oppose", 6_698_000), row("C1", "H2", "support", 10_000), row("C1", "H1", "oppose", 2)], nominees);
  assert.ok(group);
  assert.equal(group.name, "Kentucky 4th PAC");
  assert.deepEqual(group.targets, [
    { name: "Ed Gallrein", support: 0, oppose: 6_698_002 },
    { name: "Melissa Strange", support: 10_000, oppose: 0 },
  ]);
  assert.deepEqual(
    targetLines(group).map((line) => [line.label, line.amount, line.direction]),
    [
      ["Opposed Ed Gallrein", 6_698_002, "oppose"],
      ["Supported Melissa Strange", 10_000, "support"],
    ],
  );
  const chart = readFileSync("src/components/site/MoneyCharts.tsx", "utf8");
  assert.match(chart, /targetLines\(row\)/);
  assert.equal(/row\.candidates\.join/.test(chart), false, "no bare candidate name next to a total");
});

test("chart tables scroll by keyboard", () => {
  const chart = readFileSync("src/components/site/MoneyCharts.tsx", "utf8");
  const regions = chart.match(/className="table-scroll" tabIndex=\{0\} role="region" aria-label=/g) ?? [];
  assert.equal(regions.length, 2);
});

function summary(mode: "ai" | "records"): CompareSummary {
  const basis = compareBasis("2026-senate-KY");
  assert.ok(basis);
  return { ...recordsOnlySummary(basis, null), mode };
}

test("compare service caches answers, caches failures briefly, and caps model calls", async () => {
  let clock = 1_000_000;
  let calls = 0;
  let mode: "ai" | "records" = "records";
  const service = createCompareService({
    now: () => clock,
    limiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    globalLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }),
    summarize: async () => {
      calls += 1;
      return summary(mode);
    },
  });
  assert.equal(await service.handle("2026-house-CA-01", "a"), null);

  // A failure (records-only) is reused for five minutes, not retried per visitor.
  for (let i = 0; i < 5; i += 1) assert.equal((await service.handle("2026-senate-KY", `visitor-${i}`))?.status, 200);
  assert.equal(calls, 1);
  clock += FALLBACK_CACHE_MS + 1;
  mode = "ai";
  await service.handle("2026-senate-KY", "a");
  assert.equal(calls, 2);
  // A model answer is reused for an hour.
  clock += FALLBACK_CACHE_MS * 2;
  await service.handle("2026-senate-KY", "b");
  assert.equal(calls, 2);
  clock += AI_CACHE_MS;

  // The global cap holds no matter how many addresses ask.
  await service.handle("2026-house-KY-01", "c");
  await service.handle("2026-house-KY-02", "d");
  const capped = await service.handle("2026-house-KY-03", "e");
  assert.equal(capped?.status, 429);
  assert.ok(capped?.headers?.["retry-after"]);
  assert.equal(calls, 4);
});

test("rate-limit address comes from the last proxy hop, not the visitor's own header", () => {
  const req = (xff: string) => new Request("https://example.com/api/compare", { headers: { "x-forwarded-for": xff } });
  assert.equal(trustedClientAddress(req("6.6.6.6, 203.0.113.9")), "203.0.113.9");
  assert.equal(trustedClientAddress(req("1.1.1.1, 2.2.2.2, 203.0.113.9")), "203.0.113.9");
  assert.equal(trustedClientAddress(req("203.0.113.9")), "203.0.113.9");
  assert.equal(trustedClientAddress(new Request("https://example.com/")), "unknown");
  assert.equal(trustedClientAddress(req("1.1.1.1, <script>")), "unknown");
  assert.match(readFileSync("src/app/api/compare/route.ts", "utf8"), /trustedClientAddress\(request\)/);
});

test("the AI-unavailable message appears once, and the live region is a short status line", () => {
  assert.equal(sharedRefusal(null, true), REFUSALS.unavailable);
  assert.equal(sharedRefusal(null, false), null);
  assert.equal(sharedRefusal(summary("records"), false), REFUSALS.unavailable);
  const ai = { ...summary("ai"), differ: [{ text: "x", cites: ["E1"] }], differRefusal: null, agreeRefusal: REFUSALS.agree };
  assert.equal(sharedRefusal(ai, false), null);
  const source = readFileSync("src/components/home/CompareSection.tsx", "utf8");
  assert.equal((source.match(/aria-live/g) ?? []).length, 1);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.equal(/<div className="compare-cols" aria-live/.test(source), false);
  assert.match(source, /withBasePath\(`\/races\/\$\{option\.raceId\}\/compare`\)/);
});

test("home page sends only race titles and ballot facts; candidate records load per race", () => {
  for (const id of COMPARE_RACE_IDS) {
    const basis = compareBasis(id);
    assert.ok(basis);
    const option = compareOption(basis);
    assert.equal(option.ballot.every((row) => !row.personId), true);
    assert.equal("evidence" in option, false);
    for (const claim of option.know) for (const cite of claim.cites) assert.ok(option.ballot.some((row) => row.id === cite));
  }
  const records = summary("records");
  assert.ok(records.evidence.length > 0);
  assert.equal(records.evidence.every((row) => row.personId), true);
  const page = readFileSync("src/app/page.tsx", "utf8");
  assert.match(page, /<CompareSection options=\{compareOptions\} \/>/);
});

test("plain seat labels: Current officeholder, and Write-in only once", () => {
  assert.equal(seatLabel({ holdsOffice: true, openSeat: false, writeIn: false }), "Current officeholder");
  assert.equal(seatLabel({ holdsOffice: false, openSeat: true, writeIn: true, party: "Write-in" }), null);
  assert.equal(seatLabel({ holdsOffice: false, openSeat: true, writeIn: true, party: "Independent" }), "Write-in");
  assert.equal(/"Incumbent"/.test(readFileSync("src/components/site/CandidateCard.tsx", "utf8")), false);
  assert.match(readFileSync("src/components/site/PersonFace.tsx", "utf8"), /rawStatus === badge\.label \? null/);
});

test("candidate photos fill the same box on every screen", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const base = /\n\.cand-photo img \{([^}]*)\}/.exec(css)?.[1] ?? "";
  assert.match(base, /position: absolute/);
  assert.match(base, /inset: 0/);
  assert.match(base, /object-fit: cover/);
});

test("Ask stays Kentucky only and the map tabs say what they show", () => {
  assert.match(CHAT_SYSTEM_PROMPT, /Kentucky's U\.S\. Senate and U\.S\. House races/);
  assert.equal(/President, Senate, and House races/.test(CHAT_SYSTEM_PROMPT), false);
  assert.equal(/ask which state or race/i.test(CHAT_SYSTEM_PROMPT), false);
  const map = readFileSync("src/components/home/HomeMap.tsx", "utf8");
  assert.match(map, /label: "District map"/);
  assert.match(map, /label: "Statewide officeholders"/);
});
