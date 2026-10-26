import assert from "node:assert/strict";
import test from "node:test";
import {
  fecCandidateLabel,
  formatInstant,
  httpsUrl,
  partyLabel,
} from "../src/lib/format";

test("formatInstant renders Eastern Time and keeps an unparseable value visible", () => {
  assert.equal(formatInstant(null), null);
  assert.equal(formatInstant("   "), null);
  assert.equal(formatInstant("not-a-date"), "not-a-date");
  assert.match(formatInstant("2026-10-26T05:00:00.000Z") ?? "", /^Oct 26, 2026, 1:00\sAM ET$/);
  assert.match(formatInstant("2026-01-15T15:00:00.000Z") ?? "", /^Jan 15, 2026, 10:00\sAM ET$/);
});

test("httpsUrl allows only https links", () => {
  assert.equal(httpsUrl(null), null);
  assert.equal(httpsUrl("http://www.fec.gov/data/"), null);
  assert.equal(httpsUrl("javascript:alert(1)"), null);
  assert.equal(
    httpsUrl("https://www.fec.gov/data/candidate/P80011018/"),
    "https://www.fec.gov/data/candidate/P80011018/",
  );
});

test("party labels use a readable affiliation name and keep unknown codes", () => {
  assert.equal(partyLabel("DEM"), "Democratic");
  assert.equal(partyLabel("dem"), "Democratic");
  assert.equal(partyLabel("DFL"), "Democratic-Farmer-Labor");
  assert.equal(partyLabel("REP"), "Republican");
  assert.equal(partyLabel("XYZ"), "XYZ");
  assert.equal(partyLabel("DEM", "Democratic Party"), "Democratic Party");
  assert.equal(partyLabel("XYZ", "   "), "XYZ");
  assert.equal(partyLabel(null), "Affiliation not reported");
  assert.equal(partyLabel("  "), "Affiliation not reported");
  assert.equal(fecCandidateLabel("P80011018"), "FEC P80011018");
  assert.equal(fecCandidateLabel(null), "FEC candidate id not reported");
});
