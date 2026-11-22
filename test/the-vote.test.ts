import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { brand } from "../src/content/brand";
import { groupInitials } from "../src/components/site/FeedCard";
import { seatLabel } from "../src/components/site/CandidateCard";
import { shortMoney } from "../src/components/site/MoneyCharts";
import { NAV_LINKS } from "../src/components/site/HeaderFrame";
import { compareBasis, REFUSALS, COMPARE_RACE_IDS, type CompareBasis } from "../src/lib/compare/evidence";
import { summarizeRace, validateClaims, parseModelJson } from "../src/lib/compare/summarize";
import type { ConverseFn } from "../src/lib/chat/types";
import { snapshotFinance } from "../src/lib/finance/snapshot";
import type { FinanceOutside } from "../src/lib/finance/model";
import { candidateCards } from "../src/lib/site/candidate-cards";
import { KY_CONSTITUTIONAL_OFFICERS, KY_SENATORS } from "../src/lib/site/ky-statewide";
import { parseMapView } from "../src/lib/site/map-view";
import { chartRaces, topCommittees } from "../src/lib/site/money-charts";
import { kentuckyMoneyCards } from "../src/lib/site/today";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("the site is named THE VOTE and no visitor-facing Candate name is left in src", () => {
  assert.equal(brand.name, "THE VOTE");
  const hits = walk("src")
    .filter((path) => /\.(ts|tsx|md|yaml)$/.test(path))
    .filter((path) => /\bCandate\b/.test(readFileSync(path, "utf8")));
  assert.deepEqual(hits, []);
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /openGraph/);
  assert.match(layout, /siteName: brand\.name/);
  assert.ok(existsSync("src/app/manifest.ts"));
});

test("nav says News Feed and Candidates' Political Finances, and /updates goes to /news", () => {
  const labels = NAV_LINKS.map((item) => item.label);
  assert.deepEqual(labels, ["News Feed", "Candidates' Political Finances", "Ask"]);
  assert.equal(NAV_LINKS[0].href, "/news");
  assert.equal(NAV_LINKS[1].href, "/finance");
  assert.ok(NAV_LINKS[1].short.length < NAV_LINKS[1].label.length);
  const updates = readFileSync("src/app/updates/page.tsx", "utf8");
  assert.match(updates, /redirect\(/);
  assert.match(updates, /\/news/);
  const news = readFileSync("src/app/news/page.tsx", "utf8");
  assert.match(news, /<h1>News Feed<\/h1>/);
  assert.equal(news.includes("redirect("), false);
});

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  let h = max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min);
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function token(css: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css);
  assert.ok(match, name);
  return match[1] as string;
}

test("brand red is AA with white text and clearly apart from the Republican red", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const brandRed = token(css, "color-brand-red");
  const rep = token(css, "color-party-rep");
  const navy = token(css, "color-navy");
  for (const color of [brandRed, rep, navy, token(css, "color-party-dem")]) {
    assert.ok(contrastWithWhite(color) >= 4.5, `${color} contrast ${contrastWithWhite(color)}`);
  }
  const diff = Math.min(Math.abs(hue(brandRed) - hue(rep)), 360 - Math.abs(hue(brandRed) - hue(rep)));
  assert.ok(diff >= 20, `hue gap ${diff}`);
  assert.notEqual(brandRed.toLowerCase(), rep.toLowerCase());
});

test("statewide panel lists 2 senators and the 7 constitutional officers with sources", () => {
  assert.equal(KY_SENATORS.length, 2);
  assert.deepEqual(
    KY_CONSTITUTIONAL_OFFICERS.map((row) => row.office),
    [
      "Governor",
      "Lieutenant Governor",
      "Attorney General",
      "Secretary of State",
      "State Treasurer",
      "Auditor of Public Accounts",
      "Commissioner of Agriculture",
    ],
  );
  for (const row of [...KY_SENATORS, ...KY_CONSTITUTIONAL_OFFICERS]) {
    assert.ok(row.sources.length > 0, row.name);
    for (const source of row.sources) assert.match(source.url, /^https:\/\//);
    assert.match(row.officialSite, /^https:\/\//);
    assert.match(row.term, /\d{4}/);
    if (row.photo) {
      assert.match(row.photo.license, /^(Public domain|CC0|CC BY(?:-SA)? \d+\.\d+)$/);
      assert.match(row.photo.sourceUrl, /^https:\/\//);
      assert.ok(existsSync(join("public", row.photo.src)), row.photo.src);
    }
  }
  const beshear = KY_CONSTITUTIONAL_OFFICERS.find((row) => row.office === "Governor");
  assert.equal(beshear?.name, "Andy Beshear");
  const text = `${beshear?.term} ${beshear?.note}`;
  assert.equal(/seeking|re-?election|running for/i.test(text), false);
  assert.match(text, /Term-limited in 2027/);
  assert.ok(KY_CONSTITUTIONAL_OFFICERS.every((row) => row.photo?.credit));
});

test("map view parses only the two Kentucky views", () => {
  assert.equal(parseMapView("statewide"), "statewide");
  assert.equal(parseMapView("national"), "congressional");
  assert.equal(parseMapView(undefined), "congressional");
});

test("candidate cards carry photo or initials, party, and one seat label", () => {
  const senate = candidateCards("2026-senate-KY");
  assert.ok(senate.length >= 3);
  assert.ok(senate.every((person) => person.openSeat));
  assert.ok(senate.some((person) => person.photo));
  assert.ok(senate.some((person) => person.photo === null));
  assert.equal(seatLabel({ holdsOffice: true, openSeat: false, writeIn: false }), "Current officeholder");
  assert.equal(seatLabel({ holdsOffice: false, openSeat: true, writeIn: false }), "Open seat");
  assert.equal(seatLabel({ holdsOffice: false, openSeat: false, writeIn: false }), null);
  assert.equal(seatLabel({ holdsOffice: false, openSeat: true, writeIn: true }), "Write-in");
  const district1 = candidateCards("2026-house-KY-01");
  assert.ok(district1.some((person) => person.holdsOffice && seatLabel(person) === "Current officeholder"));
  assert.equal(district1.some((person) => seatLabel(person) === "Open seat"), false);
});

test("feed cards name a person for the headshot and draw a mark for groups", () => {
  const cards = kentuckyMoneyCards(snapshotFinance(), "2026-11-02T19:42:16Z");
  const all = [...cards.spending, ...cards.receipts, ...cards.filings];
  assert.ok(all.some((card) => card.personId === "S6KY00286"));
  assert.ok(all.every((card) => card.group.length > 0));
  assert.equal(groupInitials("Kentucky 4th PAC"), "K4");
  assert.equal(groupInitials("Committee for the Future"), "CF");
  assert.equal(groupInitials("!!!"), "·");
});

test("money charts use stored FEC totals and never draw a missing total as zero", () => {
  const races = chartRaces();
  assert.equal(races.length, 7);
  const senate = races.find((race) => race.raceId === "2026-senate-KY");
  assert.ok(senate);
  assert.equal(senate.people[0]?.name, "Andy Barr");
  assert.ok(senate.missing.includes("Thomas Michael Murphy"));
  assert.equal(senate.people.some((person) => person.name === "Thomas Michael Murphy"), false);
  for (const race of races) {
    for (let i = 1; i < race.people.length; i += 1) {
      assert.ok((race.people[i - 1]?.raised ?? 0) >= (race.people[i]?.raised ?? 0));
    }
  }
  assert.equal(shortMoney(12_476_747.89), "$12.5M");
  assert.equal(shortMoney(1_553_857.1), "$1.55M");
  assert.equal(shortMoney(303_598.89), "$304K");
  assert.equal(shortMoney(0), "$0");
});

test("top committees sum outside spending for nominees only", () => {
  const row = (committeeId: string, candidateId: string, support: "support" | "oppose", total: number): FinanceOutside => ({
    candidateId,
    raceId: null,
    candidateName: null,
    committeeId,
    committeeName: `GROUP ${committeeId}`,
    support,
    cycle: 2026,
    total,
    count: 1,
    sourceUrl: "https://www.fec.gov/",
    sourceLabel: "FEC independent expenditures",
    updatedAt: "2026-11-01T00:00:00Z",
  });
  const nominees = new Map([
    ["S1", "Ann"],
    ["S2", "Bo"],
  ]);
  const ranked = topCommittees(
    [row("C1", "S1", "support", 100), row("C1", "S2", "oppose", 50), row("C2", "S1", "support", 120), row("C3", "LOSER", "support", 999)],
    nominees,
  );
  assert.deepEqual(ranked.map((item) => [item.committeeId, item.total]), [
    ["C1", 150],
    ["C2", 120],
  ]);
  assert.deepEqual(ranked[0]?.candidates, ["Ann", "Bo"]);
  assert.equal(ranked[0]?.support, 100);
  assert.equal(ranked[0]?.oppose, 50);
  assert.match(ranked[0]?.sourceUrl ?? "", /fec\.gov\/data\/committee\/C1\//);
});

function senateBasis(): CompareBasis {
  const basis = compareBasis("2026-senate-KY");
  assert.ok(basis);
  return basis;
}

test("compare basis holds only cited records and ballot facts", () => {
  for (const id of COMPARE_RACE_IDS) {
    const basis = compareBasis(id);
    assert.ok(basis, id);
    for (const row of basis.evidence) assert.match(row.sourceUrl, /^https:\/\//);
    for (const claim of basis.know) {
      assert.ok(claim.cites.length > 0);
      for (const cite of claim.cites) assert.ok(basis.evidence.some((row) => row.id === cite));
    }
  }
  assert.equal(compareBasis("2026-house-CA-01"), null);
  const senate = senateBasis();
  assert.ok(senate.know.some((claim) => /Open seat/.test(claim.text)));
});

test("compare vote evidence names the bill and retains its roll-call citation", () => {
  const vote = senateBasis().evidence.find((row) => row.personId === "S6KY00286" && row.kind === "vote");
  assert.equal(vote?.text, "Voted Yea on S. 2403 (Retire through Ownership Act).");
  assert.equal(vote?.sourceUrl, "https://clerk.house.gov/evs/2026/roll314.xml");
});

test("claims without two candidates' citations, with unknown ids, or with predictions are dropped", () => {
  const basis = senateBasis();
  const barr = basis.evidence.find((row) => row.personName === "Andy Barr")?.id as string;
  const barr2 = basis.evidence.filter((row) => row.personName === "Andy Barr")[1]?.id as string;
  const booker = basis.evidence.find((row) => row.personName === "Charles Booker")?.id as string;
  const kept = validateClaims(
    [
      { text: "Barr and Booker take different approaches on data centers.", cites: [barr, booker] },
      { text: "No citation at all.", cites: [] },
      { text: "Only one candidate cited.", cites: [barr, barr2] },
      { text: "Made-up id.", cites: ["E999", booker] },
      { text: "Barr will win this race.", cites: [barr, booker] },
      { text: "Barr is the worst candidate; Booker is the strongest choice.", cites: [barr, booker] },
      { text: "Booker is the better candidate on housing.", cites: [barr, booker] },
      { text: "Barr is the front-runner and Booker the underdog.", cites: [barr, booker] },
      { text: "Booker is rated higher than Barr by teachers.", cites: [barr, booker] },
      { text: "Voters should choose Barr.", cites: [barr, booker] },
      { text: "Ballot ids do not count as candidate records.", cites: ["B1", booker] },
      "not an object",
    ],
    basis,
  );
  assert.deepEqual(kept.map((claim) => claim.text), ["Barr and Booker take different approaches on data centers."]);
  assert.deepEqual(validateClaims("nope", basis), []);
  // Ordinary policy wording that happens to use comparison words still passes.
  assert.equal(
    validateClaims([{ text: "Barr backs stronger border security; Booker backs better pay for teachers.", cites: [barr, booker] }], basis).length,
    1,
  );
  assert.deepEqual(parseModelJson('```json\n{"differ":[],"agree":[]}\n```'), { differ: [], agree: [] });
  assert.equal(parseModelJson("no json here"), null);
});

test("compare summary uses the model only through validated claims, and refuses plainly otherwise", async () => {
  const basis = senateBasis();
  const barr = basis.evidence.find((row) => row.personName === "Andy Barr")?.id as string;
  const booker = basis.evidence.find((row) => row.personName === "Charles Booker")?.id as string;
  let sawNoTools = false;
  const fake: ConverseFn = async (input) => {
    sawNoTools = input.noTools === true;
    assert.match(input.messages[0]?.content[0] && "text" in input.messages[0].content[0] ? input.messages[0].content[0].text : "", /Records:/);
    return {
      stopReason: "end_turn",
      message: {
        role: "assistant",
        content: [{ text: JSON.stringify({ differ: [{ text: "They differ on data centers.", cites: [barr, booker] }], agree: [{ text: "Uncited.", cites: [] }] }) }],
      },
    };
  };
  const ai = await summarizeRace(basis, { converse: fake, modelId: "test" });
  assert.equal(sawNoTools, true);
  assert.equal(ai.mode, "ai");
  assert.equal(ai.differ.length, 1);
  assert.equal(ai.agree.length, 0);
  assert.equal(ai.agreeRefusal, REFUSALS.agree);
  assert.equal(ai.differRefusal, null);

  const off = await summarizeRace(basis, { converse: null, modelId: "test" });
  assert.equal(off.mode, "records");
  assert.equal(off.differRefusal, REFUSALS.unavailable);

  const toolCall: ConverseFn = async () => ({ stopReason: "tool_use", message: { role: "assistant", content: [] } });
  assert.equal((await summarizeRace(basis, { converse: toolCall, modelId: "test" })).mode, "records");

  const broken: ConverseFn = async () => {
    throw new Error("boom");
  };
  assert.equal((await summarizeRace(basis, { converse: broken, modelId: "test" })).mode, "records");

  const thin: CompareBasis = { ...basis, evidence: basis.evidence.filter((row) => !row.personId || row.personName === "Andy Barr") };
  let called = false;
  const never: ConverseFn = async () => {
    called = true;
    throw new Error("should not be called");
  };
  const refused = await summarizeRace(thin, { converse: never, modelId: "test" });
  assert.equal(called, false);
  assert.equal(refused.differRefusal, REFUSALS.notEnough);
  assert.equal(refused.agreeRefusal, REFUSALS.notEnough);
});

test("home order is film, map, compare, news feed, money; ZIP link stays and nothing has a pause button", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");
  const order = ["<Hero", "<HomeMap", "<CompareSection", "<HomeNewsFeed", "<MoneyCharts"].map((tag) => page.indexOf(tag));
  assert.ok(order.every((index) => index > 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(page, /Or enter a ZIP code/);
  assert.equal(page.includes("<input"), false);
  assert.equal(/National|UsMap/.test(page), false);
  for (const file of [
    "src/components/home/Hero.tsx",
    "src/components/home/HomeNewsFeed.tsx",
    "src/components/site/FeedCard.tsx",
    "src/components/home/HomeMap.tsx",
    "src/components/site/MoneyCharts.tsx",
  ]) {
    assert.equal(/pause video|play video|aria-label="Pause|>Pause</i.test(readFileSync(file, "utf8")), false, file);
  }
  assert.match(readFileSync("src/components/home/Hero.tsx", "utf8"), /prefers-reduced-motion/);
});

test("comparison requests for the same race share one model call while it runs", async () => {
  const { singleFlight } = await import("../src/lib/compare/single-flight");
  const pending = new Map<string, Promise<number>>();
  let calls = 0;
  let release: (value: number) => void = () => {};
  const work = () => {
    calls += 1;
    return new Promise<number>((resolve) => {
      release = resolve;
    });
  };
  const first = singleFlight(pending, "race", work);
  const second = singleFlight(pending, "race", work);
  assert.equal(first, second);
  assert.equal(calls, 1);
  release(7);
  assert.deepEqual(await Promise.all([first, second]), [7, 7]);
  assert.equal(pending.size, 0);
  await singleFlight(pending, "race", async () => {
    calls += 1;
    return 8;
  });
  assert.equal(calls, 2);
});
