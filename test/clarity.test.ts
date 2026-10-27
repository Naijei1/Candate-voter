import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandidateDisclosure } from "../src/components/CandidateDisclosure";
import { StateScoreboard } from "../src/components/StateScoreboard";
import {
  candidatesSoFarLine,
  emptyHouseNext,
  emptyRaceSentence,
  jurisdictionRepeatsTitle,
  officeOneLiner,
  runningForLine,
  senateBoardLine,
} from "../src/lib/copy";
import { partyCue } from "../src/lib/format";
import { presentAskMarkdown } from "../src/lib/chat/polish";
import { citationLabel } from "../src/lib/chat/ui";
import { stateRaces, stateScoreboard } from "../src/lib/landing";
import { buildZipLookupRequest, requestZipLookup } from "../src/lib/lookup/zip-request";
import {
  parseZipLookup,
  zipLookupErrorCopy,
  zipRaceSlots,
  zipSlotTitle,
} from "../src/lib/lookup/zip-view";
import type { Race } from "../src/lib/types";

const kyBody = {
  zip: "40502",
  year: 2026,
  state: "KY",
  districts: [{ district: "06", raceId: "2026-house-KY-06" }],
  senateRaceId: "2026-senate-KY",
  raceIds: ["2026-senate-KY", "2026-house-KY-06"],
  races: [],
};

test("zip lookup request uses year, the api key, and the live path", () => {
  const built = buildZipLookupRequest({
    zip: "40502-1234",
    year: 2026,
    origin: "https://voter.naijei.com",
    env: { CANDATE_API_KEY: "secret" },
  });
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const url = new URL(built.request.url);
  assert.equal(url.pathname, "/api/v1/lookup/zip");
  assert.equal(url.searchParams.get("zip"), "40502");
  assert.equal(url.searchParams.get("year"), "2026");
  assert.equal(url.searchParams.get("cycle"), null);
  assert.equal(built.request.headers.get("authorization"), "Bearer secret");
  assert.equal(built.request.headers.get("x-api-key"), "secret");
  assert.equal(buildZipLookupRequest({ zip: "abc", year: 2026, origin: "https://voter.naijei.com" }).ok, false);
});

test("a live-shaped ZIP body keeps only returned districts", () => {
  const payload = parseZipLookup(kyBody);
  assert.ok(payload);
  if (!payload) return;
  const slots = zipRaceSlots([], payload);
  assert.deepEqual(
    slots.map((slot) => slot.raceId),
    ["2026-senate-KY", "2026-house-KY-06"],
  );
  assert.equal(slots[1]?.district, "06");
  assert.equal(slots[0]?.race, null);
  assert.equal(zipSlotTitle(slots[1]!, "KY"), "U.S. House, Kentucky District 6");
  assert.equal(slots.some((slot) => slot.district === "30"), false);
});

test("stored race titles win and a broken district is not invented", () => {
  const stored: Race = {
    raceId: "2026-senate-KY",
    office: "senate",
    cycle: 2026,
    state: "KY",
    district: null,
    title: "U.S. Senate, Kentucky",
    jurisdiction: "Kentucky",
    sourceUrl: "https://www.fec.gov/data/elections/senate/KY/2026/",
    updatedAt: "2026-10-26T18:48:47.307Z",
  };
  const payload = parseZipLookup({ ...kyBody, races: [stored] });
  assert.ok(payload);
  if (!payload) return;
  const slots = zipRaceSlots([], payload);
  assert.equal(slots[0]?.race?.title, "U.S. Senate, Kentucky");
  assert.equal(zipSlotTitle(slots[0]!, "KY"), "U.S. Senate, Kentucky");

  const dropped = parseZipLookup({
    ...kyBody,
    districts: [{ district: "06" }],
    raceIds: ["2026-senate-KY"],
    senateRaceId: "2026-senate-KY",
  });
  assert.ok(dropped);
  if (!dropped) return;
  assert.deepEqual(
    zipRaceSlots([], dropped).map((slot) => slot.raceId),
    ["2026-senate-KY"],
  );
});

test("unknown ZIP is an error and does not yield districts", async () => {
  const result = await requestZipLookup({
    zip: "00000",
    year: 2026,
    origin: "https://voter.naijei.com",
    env: { CANDATE_API_KEY: "secret" },
    callHandler: async (request) => {
      assert.equal(new URL(request.url).searchParams.get("zip"), "00000");
      return Response.json(
        { error: "not_found", message: "No congressional district is published for that ZIP" },
        { status: 404 },
      );
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "not_found");
  assert.equal("payload" in result, false);
  assert.match(zipLookupErrorCopy(result), /No congressional district is published/);
  assert.match(zipLookupErrorCopy(result), /Check the ZIP or pick a state below/);
});

test("lookup times out inside the UI budget and can be told from a hang", async () => {
  const started = Date.now();
  const result = await requestZipLookup({
    zip: "40502",
    year: 2026,
    origin: "https://voter.naijei.com",
    timeoutMs: 30,
    callHandler: () => new Promise(() => {}),
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "timeout");
  assert.ok(Date.now() - started < 1_000);
  assert.match(zipLookupErrorCopy(result), /too long/);
});

test("scoreboard uses coverage counts and the explainer stays plain", () => {
  const races: Race[] = [
    {
      raceId: "2026-senate-KY",
      office: "senate",
      cycle: 2026,
      state: "KY",
      district: null,
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
      sourceUrl: null,
      updatedAt: null,
    },
    {
      raceId: "2026-house-KY-06",
      office: "house",
      cycle: 2026,
      state: "KY",
      district: "06",
      title: "U.S. House, Kentucky District 6",
      jurisdiction: "Kentucky District 6",
      sourceUrl: null,
      updatedAt: null,
    },
  ];
  const board = stateScoreboard(races, "KY", 2026);
  assert.equal(board.senateFilings, 1);
  assert.equal(board.districtsWithFilings, 1);
  assert.equal(board.districtsTotal, 6);
  assert.equal(board.filingsSoFarOnly, true);
  const html = renderToStaticMarkup(
    React.createElement(StateScoreboard, { board, senatePeople: 2 }),
  );
  assert.match(html, /Senate — 2 candidates so far/);
  assert.equal(html.includes("1 filing"), false);
  assert.match(html, /House — 1 of 6 districts has a filing/);
  assert.equal(senateBoardLine(2), `Senate — ${candidatesSoFarLine(2)}.`);
  assert.equal(candidatesSoFarLine(1), "1 candidate so far");
  assert.equal(senateBoardLine(0), "Senate — no filing yet for the statewide seat.");
  assert.equal(/districts so far/.test(html), false);
  assert.equal(/filed so far/.test(html), false);
  assert.equal(/What am I looking at/.test(html), false);
  assert.equal(/not a ranking/i.test(html), false);
  const waiting = renderToStaticMarkup(
    React.createElement(StateScoreboard, { board, senatePeople: null }),
  );
  assert.equal(/Senate —/.test(waiting), false);
  assert.match(waiting, /House — 1 of 6 districts has a filing/);
});

test("candidate rows start with a name and keep full records closed", () => {
  const html = renderToStaticMarkup(
    React.createElement(CandidateDisclosure, {
      name: "Ada Lovelace",
      cue: "Democratic",
      partyAffiliation: "DEM",
      href: "/candidates/S0KY00001",
      filingCount: 3,
      updatedAt: "2026-10-26T18:48:47.307Z",
    }),
  );
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /text-party-dem">Democratic/);
  assert.equal(html.includes("text-accent\">Democratic"), false);
  assert.match(html, /aria-expanded="false"/);
  assert.equal(html.includes("Full records"), false);
  assert.equal(html.includes("fec.gov"), false);
  assert.equal(html.includes("3 filings"), false);
});

test("home and ask copy stay plain and the map does not lead with Popular", () => {
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  const zip = readFileSync(new URL("../src/components/ZipLookup.tsx", import.meta.url), "utf8");
  const legend = readFileSync(new URL("../src/components/UsMap.tsx", import.meta.url), "utf8");
  const looking = readFileSync(new URL("../src/components/StateScoreboard.tsx", import.meta.url), "utf8");
  const ask = readFileSync(new URL("../src/components/chat/ChatMessageList.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/chat/ChatShell.tsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("../src/components/SiteHeader.tsx", import.meta.url), "utf8");
  const footer = readFileSync(new URL("../src/components/SiteFooter.tsx", import.meta.url), "utf8");
  assert.equal(landing.includes("WhatAmILookingAt"), false);
  assert.equal(landing.includes("ChromeInfo"), false);
  assert.equal(landing.includes("homeValueLine"), false);
  assert.match(landing, /candidatesSoFarLine/);
  assert.match(landing, /senateCandidateCount/);
  assert.match(landing, /highlightedPostal/);
  assert.match(landing, /selected=\{mapPostal\}/);
  assert.equal(landing.includes("1 candidate so far"), false);
  assert.equal(landing.includes("candidates so far"), false);
  assert.equal(looking.includes("What am I looking at"), false);
  assert.equal(header.includes("map-chrome-info"), false);
  assert.equal(footer.includes("does not endorse"), false);
  assert.equal(footer.includes("Form 2"), false);
  assert.match(footer, /Agent API/);
  assert.match(landing, /<ZipLookup/);
  assert.match(landing, /searchWithoutState/);
  assert.match(landing, /Your races/);
  assert.match(landing, /See all/);
  assert.match(zip, /Enter ZIP to find your races/);
  assert.match(zip, /That ZIP didn't match/);
  assert.match(zip, /Tap a state on the map/);
  assert.match(landing, /officeOneLiner/);
  assert.match(landing, /Details/);
  assert.match(zip, /data-testid="zip-lookup"/);
  assert.match(zip, /findRacesByZip/);
  assert.match(legend, /Has candidates/);
  assert.match(legend, /No one has filed yet/);
  assert.equal(legend.includes("Filings stored"), false);
  assert.equal(legend.includes("No filings stored"), false);
  assert.equal(landing.includes("popular-heading"), false);
  assert.equal(landing.includes("state-jump"), false);
  assert.equal(/not a ranking/i.test(landing), false);
  assert.equal(ask.includes("SuggestedPrompts"), false);
  assert.equal(shell.includes("suggestedPrompts"), false);
  assert.equal(landing.includes("Recently updated filings"), false);
  const districts = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  assert.match(districts, /you-are-here/);
  assert.match(districts, /is-yours/);
  const askNav = readFileSync(new URL("../src/components/chat/AskNav.tsx", import.meta.url), "utf8");
  const candidatePage = readFileSync(
    new URL("../src/app/candidates/[candidateId]/page.tsx", import.meta.url),
    "utf8",
  );
  const technical = readFileSync(
    new URL("../src/components/CandidateTechnicalDetails.tsx", import.meta.url),
    "utf8",
  );
  assert.match(askNav, /Ask a question/);
  assert.match(shell, /Asking about/);
  assert.match(shell, /Clear context/);
  assert.match(candidatePage, /CandidateTechnicalDetails/);
  assert.match(technical, /Technical details/);
  assert.doesNotMatch(technical, /<details[^>]*\sopen/);
  assert.match(candidatePage, /Running for:/);
  assert.equal(candidatePage.includes("Form {filing.formType}"), false);
});

test("empty district copy follows returned stubs and leaves coverage on filings", () => {
  const filed = (district: string): Race => ({
    raceId: `2026-house-KY-${district}`,
    office: "house",
    cycle: 2026,
    state: "KY",
    district,
    title: `U.S. House, Kentucky District ${Number(district)}`,
    jurisdiction: `Kentucky District ${Number(district)}`,
    sourceUrl: null,
    updatedAt: "2026-10-26T18:00:00.000Z",
  });
  const stub = (district: string): Race => ({
    ...filed(district),
    updatedAt: null,
    empty: true,
  });
  const races: Race[] = [
    stub("01"),
    stub("02"),
    stub("03"),
    filed("04"),
    filed("05"),
    filed("06"),
    {
      raceId: "2026-senate-KY",
      office: "senate",
      cycle: 2026,
      state: "KY",
      district: null,
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
      sourceUrl: null,
      updatedAt: null,
      empty: true,
    },
  ];
  const listed = stateRaces(races, "KY");
  assert.deepEqual(
    listed.map((race) => race.raceId),
    [
      "2026-senate-KY",
      "2026-house-KY-01",
      "2026-house-KY-02",
      "2026-house-KY-03",
      "2026-house-KY-04",
      "2026-house-KY-05",
      "2026-house-KY-06",
    ],
  );
  const emptyHouse = listed.filter((race) => race.office === "house" && race.empty === true);
  assert.deepEqual(
    emptyHouse.map((race) => race.raceId),
    ["2026-house-KY-01", "2026-house-KY-02", "2026-house-KY-03"],
  );
  assert.equal(emptyRaceSentence(emptyHouse[0]!), "No one has filed in District 1 yet.");
  assert.equal(emptyRaceSentence(listed[0]!), "No one has filed for Senate yet.");
  const atLarge: Race = {
    raceId: "2026-house-WY-00",
    office: "house",
    cycle: 2026,
    state: "WY",
    district: "00",
    title: "U.S. House, Wyoming at-large",
    jurisdiction: "Wyoming at-large",
    sourceUrl: null,
    updatedAt: null,
    empty: true,
  };
  assert.equal(emptyRaceSentence(atLarge), "No one has filed for the at-large seat yet.");
  assert.deepEqual(emptyHouseNext(emptyHouse[0]!, races), {
    raceId: "2026-house-KY-04",
    label: "See a nearby district",
  });
  assert.equal(
    emptyHouseNext(
      emptyHouse[0]!,
      races.map((race) => (race.office === "senate" ? { ...race, empty: undefined } : race)),
    )?.raceId,
    "2026-senate-KY",
  );
  assert.equal(emptyHouseNext(listed[0]!, races), null);
  assert.equal(stateRaces([atLarge], "WY")[0]?.raceId, "2026-house-WY-00");

  const board = stateScoreboard(races, "KY", 2026);
  assert.equal(board.senateFilings, 0);
  assert.equal(board.districtsWithFilings, 3);
  assert.equal(board.districtsTotal, 6);
  assert.equal(stateScoreboard([atLarge], "WY", 2026).districtsWithFilings, 0);
  assert.equal(stateScoreboard([atLarge], "WY", 2026).districtsTotal, 1);
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.equal(landing.includes("houseGaps"), false);

  assert.equal(
    runningForLine({
      office: "senate",
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
      state: "KY",
      district: null,
    }),
    "U.S. Senate — Kentucky",
  );
  assert.equal(partyCue(["Write-in", "Republican"]), "Write-in candidate (Republican)");
  assert.equal(
    citationLabel({
      title: "https://www.fec.gov/data/elections/senate/KY/2026/",
      url: "https://www.fec.gov/data/elections/senate/KY/2026/",
    }),
    "Source",
  );
  assert.equal(
    citationLabel({
      title: "2026-senate-KY",
      url: "/races/2026-senate-KY",
    }),
    "U.S. Senate, Kentucky",
  );
  assert.equal(citationLabel({ title: "partyLabel: Democratic", url: "https://example.com/a" }), "Democratic");
  const leaked = presentAskMarkdown(
    "Ada Klein (DEM, partyLabel: Democratic). Democratic Democratic (DEM). FEC Form 2 filings stored in this site's database.",
  );
  assert.equal(leaked.includes("partyLabel"), false);
  assert.doesNotMatch(leaked, /database/i);
  assert.match(leaked, /Democratic \(DEM\)/);
  assert.equal(leaked.includes("Democratic Democratic"), false);
  assert.match(leaked, /public FEC records/i);
  assert.equal(
    officeOneLiner({ office: "senate", district: null }),
    "The U.S. Senate seat for the whole state.",
  );
  assert.equal(
    officeOneLiner({ office: "house", district: "06" }),
    "The U.S. House seat for this district.",
  );
  assert.equal(jurisdictionRepeatsTitle("U.S. Senate, Kentucky", "Kentucky"), true);
  assert.equal(
    citationLabel({
      title: "FEC Form 2 — Ada Klein",
      url: "https://www.fec.gov/data/candidate/S0KY00001/",
    }),
    "Statement of candidacy (Form 2) — Ada Klein",
  );
});
