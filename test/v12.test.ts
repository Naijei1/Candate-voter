import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import winners from "../data/ky-2026-general-winners.json";
import { ExtLink } from "../src/components/tv/ExtLink";
import { breakdownFromTotals, FUNDING_PARTS, fundingRows, fundingSegments } from "../src/lib/finance/breakdown";
import { countyNamed, stateMap } from "../src/lib/geo/state-maps";
import { stateConfig } from "../src/lib/states";
import { answerQuestion } from "../src/lib/tv/ask";
import { allPeople, allRaces } from "../src/lib/tv/people";
import { hidesHeadline, isWinner, RESULTS_VISIBLE, visibleNews, winnerName } from "../src/lib/tv/results-gate";
import { shortLine } from "../src/lib/tv/short-line";

const DANGLING = /\b(?:the|a|an|of|to|for|in|on|at|by|with|and|or|but|his|her|their|its|our|that|this|these|those)$/i;

test("compare lines are cut at a complete clause and keep the full text", () => {
  const long = "Says Congress should cap insulin at thirty-five dollars a month for every patient, and that drug makers should publish what they charge other countries for the same medicine.";
  const line = shortLine(long);
  assert.equal(line.cut, true);
  assert.equal(line.full, long);
  assert.ok(long.startsWith(line.short), line.short);
  assert.equal(DANGLING.test(line.short), false, line.short);
  assert.ok(line.short.split(/\s+/).length <= 20);
  const brief = shortLine("Supports term limits for Congress.");
  assert.deepEqual(brief, { short: "Supports term limits for Congress", cut: false, full: "Supports term limits for Congress." });
  const context = shortLine("At a July 7, 2026 forum, said prices are too high.");
  assert.equal(context.short, "Said prices are too high");
});

test("winners and result headlines stay hidden until the one flag is turned on", () => {
  assert.equal(winners.display, false);
  assert.equal(RESULTS_VISIBLE, false);
  const first = winners.winners[0];
  assert.ok(first);
  assert.equal(isWinner(first.raceId, first.name), false);
  assert.equal(winnerName(first.raceId), null);
  assert.equal(isWinner(first.raceId, first.name, { visible: true }), true);
  assert.equal(winnerName(first.raceId, { visible: true }), first.name);
  assert.equal(hidesHeadline("Barr wins Senate seat"), true);
  assert.equal(hidesHeadline("Barr wins Senate seat", { visible: true }), false);
  assert.deepEqual(visibleNews([{ title: "Candidates meet in Lexington forum" }, { title: "McGrath concedes" }]), [{ title: "Candidates meet in Lexington forum" }]);
  const won = readFileSync("src/components/tv/bits.tsx", "utf8");
  assert.doesNotMatch(won.slice(won.indexOf("export function WonTag")), /votes|%|margin/i);
});

test("money splits receipts into four labeled parts, in a fixed order, without color", () => {
  assert.deepEqual(
    FUNDING_PARTS.map((part) => part.label),
    ["Individuals", "PACs and other committees", "Self-funding", "Other (transfers, loans, refunds)"],
  );
  const row = breakdownFromTotals({
    candidateId: "H0XX00000",
    committeeId: "C00000000",
    name: "Test Committee",
    cycle: 2026,
    retrievedAt: "2026-11-01T00:00:00Z",
    totals: {
      receipts: 1000,
      individual_contributions: 600,
      other_political_committee_contributions: 150,
      political_party_committee_contributions: 50,
      candidate_contribution: 25,
      loans_made_by_candidate: 75,
      disbursements: 400,
      last_cash_on_hand_end_period: 600,
      coverage_start_date: "2025-01-01T00:00:00",
      coverage_end_date: "2026-09-30T00:00:00",
    },
  });
  assert.equal(row.status, "ok");
  assert.deepEqual([row.individuals, row.committees, row.self, row.other], [600, 200, 100, 100]);
  assert.equal(row.coverageEnd, "2026-09-30");
  assert.deepEqual(
    fundingSegments(row).map((segment) => segment.key),
    ["individuals", "committees", "self", "other"],
  );
  const empty = breakdownFromTotals({ candidateId: "H0XX00001", committeeId: "C00000001", name: "None", cycle: 2026, retrievedAt: "2026-11-01T00:00:00Z", totals: null });
  assert.equal(empty.status, "no-data");
  assert.deepEqual(fundingSegments(empty), []);
  for (const snapshot of fundingRows()) assert.match(snapshot.sourceUrl, /^https:\/\/www\.fec\.gov\/data\/committee\/C\d+\//);
  const css = readFileSync("src/app/globals.css", "utf8");
  for (const part of FUNDING_PARTS) assert.match(css, new RegExp(`\\.${part.className} \\{ background:`));
  const finance = readFileSync("src/app/finance/page.tsx", "utf8");
  assert.match(finance, /Outside groups for \{row\.person\.name\}/);
  assert.match(finance, /Outside groups against \{row\.person\.name\}/);
});

test("outside links open in a new tab with noopener and spoken new-tab text", () => {
  // The app compiles JSX with the automatic runtime; tsx here uses the classic one.
  (globalThis as { React?: typeof React }).React = React;
  const html = renderToStaticMarkup(ExtLink({ href: "https://www.fec.gov/", children: "FEC" }));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<span class="sr"> \(opens in new tab\)<\/span>/);
  for (const path of readdirSync("src/app", { recursive: true, encoding: "utf8" })) {
    if (!path.endsWith(".tsx") || path.startsWith("admin")) continue;
    const source = readFileSync(join("src/app", path), "utf8");
    assert.equal(/<a [^>]*href="https?:/.test(source), false, `${path} uses a bare outside <a>`);
  }
});

test("state maps come from states.ts with every county assigned to its districts", () => {
  const state = stateConfig();
  const map = stateMap(state.code);
  assert.equal(map.counties.length, 120);
  assert.equal(map.districts.length, 6);
  const numbers = new Set(map.districts.map((district) => district.number));
  for (const county of map.counties) {
    assert.ok(county.districts.length >= 1, county.name);
    assert.ok(
      county.districts.every((district) => numbers.has(district)),
      county.name,
    );
  }
  assert.ok(map.counties.filter((county) => county.districts.length > 1).length > 0);
  assert.deepEqual(countyNamed("Fayette")?.districts, [6]);
  assert.equal(countyNamed("Nowhere"), null);
});

test("every candidate card has a one-line summary from records, never invented", () => {
  const people = allPeople();
  assert.equal(people.length, 25);
  for (const person of people) {
    if (person.oneLine == null) continue;
    assert.ok(person.oneLine.length < 140, person.name);
    assert.match(person.oneLine, /\.$/, person.name);
  }
  assert.equal(allRaces().length, 7);
});

test("Ask answers from the site's records and declines to pick a candidate", () => {
  const running = answerQuestion("Who is running for Senate?");
  assert.equal(running.found, true);
  assert.ok(running.sources.length > 0);
  assert.ok(running.sources.every((source) => source.url.startsWith("https://")));
  const advice = answerQuestion("Who should I vote for?");
  assert.doesNotMatch(advice.lead.join(" "), /you should vote for/i);
  const none = answerQuestion("What is the capital of France?");
  assert.equal(none.found, false);
});

test("compare cuts never split a subject from its main verb", () => {
  const stored = "Says bringing down the cost of living, especially fuel prices, is a Senate priority.";
  assert.equal(shortLine(stored).short, "Says bringing down the cost of living, especially fuel prices, is a Senate priority");
  const longer = "Says bringing down the cost of living, especially fuel prices and grocery bills, is a Senate priority for him this year.";
  assert.match(shortLine(longer).short, /is a Senate priority/);
  const relative = shortLine("Says the farm bill, which lapsed last fall, should be passed before any new spending is approved by Congress this year.");
  assert.match(relative.short, /should be passed$/);
  const trailing = shortLine("Says her first priority is lowering costs, including support for small business and manufacturing, and protecting Medicare for every senior.");
  assert.equal(trailing.short, "Says her first priority is lowering costs");
});

test("Ask prefers full names, asks which candidate for a shared surname, and puts specific topics first", () => {
  const peter = allPeople().find((person) => person.name === "Peter Harmon Williams");
  assert.ok(peter);
  const full = answerQuestion("How much has Peter Harmon Williams raised?");
  assert.equal(full.bars, undefined);
  assert.match(full.lead[0], /^Peter Harmon Williams /);
  const shared = answerQuestion("How much has Williams raised?");
  assert.equal(shared.found, false);
  assert.match(shared.lead[0], /2 candidates are named Williams/);
  assert.equal(shared.next.length, 2);
  const health = answerQuestion("Where does Booker stand on health care costs?");
  assert.match(health.lead[0], /on health care/i);
  const cost = answerQuestion("Where does Booker stand on the cost of living?");
  assert.match(cost.lead[0], /on cost of living/i);
});

test('the server layout reads the theme script from a module without "use client"', () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const from = layout.match(/import \{ THEME_SCRIPT \} from "@\/(.+?)";/)?.[1];
  assert.ok(from);
  const source = readFileSync(`src/${from}.ts`, "utf8");
  assert.doesNotMatch(source, /^["']use client["']/m);
});

test("raw form actions and requests keep the configured base path", () => {
  const files = ["src/components/tv", "src/app"].flatMap((dir) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file) && !file.startsWith("api"))
      .map((file) => join(dir, file)),
  );
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /action="\/|fetch\("\//, file);
  }
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.pt:has\(~ \.pmore\[open\]\)/);
});
