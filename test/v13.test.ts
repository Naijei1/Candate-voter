import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shortMoney } from "../src/lib/finance/model";
import { longDayLabel } from "../src/lib/format";
import { stateConfig } from "../src/lib/states";
import { answerQuestion } from "../src/lib/tv/ask";
import { electionStatus } from "../src/lib/tv/election";
import { HOME_NAV, NAV } from "../src/lib/tv/nav";
import { partyInfo } from "../src/lib/tv/party";
import { siteIndex } from "../src/lib/tv/site-index";
import { MOBILE_TABS } from "../src/components/site/MobileNavigation";

test("header, phone menu and tab bar share one list of section names", () => {
  assert.deepEqual(
    NAV.map((item) => item.label),
    ["My races", "News", "Campaign money", "Search"],
  );
  assert.deepEqual(MOBILE_TABS, [HOME_NAV, ...NAV]);
  const chrome = readFileSync("src/components/tv/Chrome.tsx", "utf8");
  assert.match(chrome, /NAV\.map/);
  assert.doesNotMatch(chrome, /AlertsButton|Compare \{|\/polls|\/measures|ScopeNav/);
  assert.doesNotMatch(readFileSync("src/components/tv/client/PrimaryNav.tsx", "utf8"), /PopMenu|Polls|Candidates/);
  assert.equal(
    siteIndex().some((entry) => /^\/(polls|measures)$/.test(entry.h)),
    false,
  );
});

test("Where to vote links only to the state's official voter lookup", () => {
  const state = stateConfig();
  assert.equal(state.voterInfo.href, "https://vrsws.sos.ky.gov/VIC/Default.aspx");
  const status = readFileSync("src/components/tv/Status.tsx", "utf8");
  assert.match(status, /stateConfig\(\)\.voterInfo/);
  for (const file of ["src/components/tv/Chrome.tsx", "src/app/ballot/page.tsx"]) assert.match(readFileSync(file, "utf8"), /<WhereToVote/, file);
  const answer = answerQuestion("Where do I vote?");
  assert.deepEqual(answer.sources, [{ label: state.voterInfo.label, url: state.voterInfo.href }]);
});

test("the election status line uses plain dates", () => {
  const state = stateConfig();
  assert.equal(longDayLabel("2026-11-03"), "Tuesday, November 3, 2026");
  const after = electionStatus(state, new Date("2026-11-28T12:00:00Z"));
  assert.equal(after.over, true);
  assert.equal(after.text, "Kentucky’s general election was Tuesday, November 3, 2026. It is over.");
  assert.equal(electionStatus(state, new Date("2026-10-01T12:00:00Z")).over, false);
  assert.doesNotMatch(readFileSync("src/app/states/[state]/page.tsx", "utf8"), /"Held"|"Next"/);
});

test("plain words: party names and money amounts", () => {
  assert.equal(partyInfo("Republican").tag, "Republican");
  assert.equal(partyInfo("Democratic").tag, "Democratic");
  assert.equal(shortMoney(12_476_747.89), "$12.5 million");
  assert.equal(shortMoney(2_000_000), "$2 million");
  assert.equal(shortMoney(48_210), "$48,000");
  const hero = readFileSync("src/components/tv/Hero.tsx", "utf8");
  assert.doesNotMatch(hero, /Covered|covered now/);
});

test("compare shows full sentences and labels the swap control", () => {
  const compare = readFileSync("src/app/races/[raceId]/compare/page.tsx", "utf8");
  assert.doesNotMatch(compare, /shortLine|ExpandAll|>SOS</);
  assert.match(compare, /Change \{lastName\(person\.name\)\}/);
  assert.match(compare, /\{stance\.text\}/);
});

test("race page has Compare at the top and a single Ask panel", () => {
  const race = readFileSync("src/app/races/[raceId]/page.tsx", "utf8");
  assert.ok(race.indexOf("Compare {lastName(pair[0].name)}") < race.indexOf('<div className="cards">'));
  assert.equal(race.match(/<AskPanel /g)?.length, 1);
  assert.doesNotMatch(race, /ask-fab|id: "overview"|id: "polls"/);
});
