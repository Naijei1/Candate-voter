import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { congressionalDistricts } from "../src/lib/geo/congressional-district";
import { emptyPlace, placeSearch, sanitizePlace } from "../src/lib/place/selection";
import { averagePolls, type Poll } from "../src/lib/polls/model";
import { parseFollowType } from "../src/lib/users/alerts";

test("a selected place never keeps a street address", () => {
  const place = sanitizePlace({ state: "ky", year: "2026", zip: "40502", district: "06", address: "100 Main St", street: "100 Main St" });
  assert.deepEqual(place, { state: "KY", year: 2026, zip: "40502", district: "06" });
  assert.equal(placeSearch(place).includes("Main"), false);
  assert.equal(JSON.stringify(emptyPlace()).includes("address"), false);
});

test("census district codes are read without the matched address", () => {
  const districts = congressionalDistricts({
    result: {
      addressMatches: [
        { matchedAddress: "100 MAIN ST", geographies: { "120th Congressional Districts": [{ CD120: "06" }] } },
        { geographies: { "120th Congressional Districts": [{ CD120: "06" }] } },
      ],
    },
  });
  assert.deepEqual(districts, ["06", "06"]);
  const source = readFileSync("src/lib/geo/address-district.ts", "utf8");
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("PutCommand"), false);
  assert.match(readFileSync("src/components/site/ZipSearch.tsx", "utf8"), /do not save it/);
});

test("poll averages stay empty until polls exist", () => {
  assert.equal(averagePolls([]), null);
  const poll: Poll = {
    pollId: "fixture",
    raceId: "2026-senate-KY",
    pollster: "Fixture",
    sponsor: null,
    fieldStart: "2026-09-01",
    fieldEnd: "2026-09-02",
    sampleSize: 400,
    marginOfError: 4.9,
    population: "likely voters",
    sourceUrl: "https://example.com/poll",
    results: [
      { label: "A", percent: 40 },
      { label: "B", percent: 60 },
    ],
  };
  assert.equal(averagePolls([poll])?.[0]?.label, "B");
  const page = readFileSync("src/app/polls/page.tsx", "utf8");
  assert.match(page, /No qualifying polls/);
  assert.match(page, /planned/);
});

test("news feed choices are not alert categories, and issue follows are allowed", () => {
  assert.equal(parseFollowType("issue"), "issue");
  const store = readFileSync("src/lib/users/store.ts", "utf8");
  assert.match(store, /sk: "FEED"/);
  const news = readFileSync("src/components/site/NewsFeed.tsx", "utf8");
  assert.match(news, /separate from/);
  assert.match(news, /Kentucky Lantern feed/);
  const judicial = readFileSync("src/app/states/[state]/page.tsx", "utf8");
  assert.match(judicial, /Not covered yet/);
  assert.equal(judicial.includes("Jane Doe"), false);
});

test("keyboard focus stays visible on the map and in the header", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.site-header :focus-visible[\s\S]*outline-color:\s*#fff/);
  assert.match(css, /\.us-map \.us-state:focus-visible,\s*\.us-map \.us-hit:focus-visible\s*\{[^}]*stroke:\s*var\(--color-navy\)/);
  assert.equal(/\.us-map \.us-state:focus-visible[\s\S]{0,80}outline:\s*none/.test(css), false);
});
