import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandidateDisclosure } from "../src/components/CandidateDisclosure";
import { StateScoreboard, WhatAmILookingAt } from "../src/components/StateScoreboard";
import { stateScoreboard } from "../src/lib/landing";
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
    React.createElement(
      "div",
      null,
      React.createElement(StateScoreboard, { board }),
      React.createElement(WhatAmILookingAt, { refreshedAt: "2026-10-26T18:48:47.307Z" }),
    ),
  );
  assert.match(html, /1 of 6/);
  assert.match(html, /filed so far/);
  assert.match(html, /What am I looking at\?/);
  assert.match(html, /Form 2 filings are not the ballot/);
  assert.match(html, /candidates so far, not the final list/);
  assert.match(html, /public FEC records/);
  assert.equal(/not a ranking/i.test(html), false);
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
  assert.match(html, /Democratic/);
  assert.match(html, /aria-expanded="false"/);
  assert.equal(html.includes("Full records"), false);
  assert.equal(html.includes("fec.gov"), false);
  assert.equal(html.includes("3 filings"), false);
});

test("home and ask copy stay plain and Popular stays title-only", () => {
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  const zip = readFileSync(new URL("../src/components/ZipLookup.tsx", import.meta.url), "utf8");
  const legend = readFileSync(new URL("../src/components/UsMap.tsx", import.meta.url), "utf8");
  const ask = readFileSync(new URL("../src/components/chat/ChatMessageList.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/chat/ChatShell.tsx", import.meta.url), "utf8");
  assert.match(landing, /Who&apos;s filed/);
  assert.match(landing, /not the final ballot/);
  assert.match(landing, /<ZipLookup/);
  assert.match(zip, /Find my races/);
  assert.match(zip, /data-testid="zip-lookup"/);
  assert.match(zip, /findRacesByZip/);
  assert.match(legend, /Filings stored/);
  assert.match(legend, /No filings stored/);
  const popular = landing.slice(landing.indexOf('id="popular-heading"'));
  assert.match(popular, />\s*Popular\s*</);
  assert.equal(/not a ranking/i.test(popular), false);
  assert.equal(ask.includes("SuggestedPrompts"), false);
  assert.equal(shell.includes("suggestedPrompts"), false);
  assert.equal(landing.includes("Recently updated filings"), false);
});
