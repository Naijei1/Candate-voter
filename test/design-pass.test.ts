import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { splitRecordRows } from "../src/lib/site/record-rows";

test("race page puts the November candidates before primary tables", () => {
  // v12: the November cards lead the page, the tabbed comparison follows, and primary tables are gone.
  const race = readFileSync("src/app/races/[raceId]/page.tsx", "utf8");
  const candidates = race.indexOf("<RaceCard key={person.id}");
  // v13: the tab list is labeled "About this race".
  const tabs = race.indexOf('<Tabs label="About this race"');
  assert.ok(candidates > -1 && tabs > candidates);
  assert.equal(race.includes('show="primary"'), false);
});

test("profile records keep every row in the page and collapse only long lists", () => {
  const records = readFileSync("src/components/site/ProfileRecords.tsx", "utf8");
  assert.match(records, /<details className="more">/);
  assert.equal(/"use client"/.test(records), false);
});

test("feed report link is a quiet utility, not a second call to action", () => {
  const link = readFileSync("src/components/site/FeedCorrection.tsx", "utf8");
  assert.match(link, /className="link-quiet feed-report"/);
  assert.match(link, /Report an error/);
});

test("focus ring turns white on dark bands and controls get a halo", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /:focus-visible \{ outline: 3px solid var\(--focus\);/);
  assert.match(css, /\.ftr \{[^}]*--focus: #fff;/);
  assert.match(css, /\.btn\.hero-btn:focus-visible, \.hero-ln:focus-visible \{ outline: 3px solid #fff;/);
  assert.match(css, /\.input:focus-visible \{[^}]*box-shadow: var\(--focus-ring\)/);
});

test("long profile lists keep every row, six shown and the rest behind Show all", () => {
  for (const [count, shown] of [[6, 6], [8, 8], [9, 6], [20, 6]] as const) {
    const rows = Array.from({ length: count }, (_, i) => i);
    const { head, rest } = splitRecordRows(rows);
    assert.equal(head.length, shown, `${count} rows`);
    assert.deepEqual([...head, ...rest], rows, `${count} rows all rendered in order`);
  }
  const records = readFileSync("src/components/site/ProfileRecords.tsx", "utf8");
  assert.match(records, /const \{ head, rest \} = splitRecordRows\(rows\);/);
  assert.match(records, /<details className="more">[\s\S]*\{rest\}[\s\S]*<\/details>/);
});
