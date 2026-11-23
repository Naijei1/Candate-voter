import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarDay,
  dayLabel,
  fecCandidateLabel,
  formatInstant,
  httpsUrl,
  collapseRepeatedParty,
  partyCue,
  partyLabel,
  partyToneClass,
} from "../src/lib/format";

test("calendar days use the state zone for timestamps and keep date-only values", () => {
  assert.equal(calendarDay("2026-11-22"), "2026-11-22");
  assert.equal(dayLabel("2026-11-22"), "Nov 22, 2026");
  // 02:00 UTC on Nov 23 is 9:00 p.m. Eastern on Nov 22.
  assert.equal(calendarDay("2026-11-23T02:00:00.000Z"), "2026-11-22");
  assert.equal(dayLabel("2026-11-23T02:00:00.000Z"), "Nov 22, 2026");
  assert.equal(calendarDay("2026-11-23T05:30:00.000Z"), "2026-11-23");
  assert.equal(dayLabel("not-a-date"), "not-a-date");
});

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
  assert.equal(partyLabel("W"), "Write-in");
  assert.equal(partyLabel("IND"), "Independent");
  assert.equal(partyLabel("LIB"), "Libertarian");
  assert.equal(partyLabel("GRE"), "Green");
  assert.equal(partyLabel("UN"), "Unaffiliated");
  assert.equal(partyLabel("CON"), "Constitution");
  assert.equal(partyLabel("CRV"), "Conservative");
  assert.equal(partyLabel("XYZ"), "XYZ");
  assert.equal(partyLabel("DEM", "Democratic Party"), "Democratic Party");
  assert.equal(partyLabel("XYZ", "   "), "XYZ");
  assert.equal(partyLabel(null), "Affiliation not reported");
  assert.equal(partyLabel("  "), "Affiliation not reported");
  assert.equal(partyCue(["Write-in", "Republican"]), "Write-in candidate (Republican)");
  assert.equal(partyCue(["Republican", "Write-in"]), "Write-in candidate (Republican)");
  assert.equal(partyCue(["Write-in"]), "Write-in candidate");
  assert.equal(partyCue(["Democratic", "Republican"]), "Democratic · Republican");
  assert.equal(partyCue(["Democratic Democratic (DEM)"]), "Democratic (DEM)");
  assert.equal(collapseRepeatedParty("Republican Republican (REP)"), "Republican (REP)");
  assert.equal(collapseRepeatedParty("Democratic (DEM)"), "Democratic (DEM)");
  assert.equal(partyToneClass("DEM"), "text-party-dem");
  assert.equal(partyToneClass("DFL"), "text-party-dem");
  assert.equal(partyToneClass("REP"), "text-party-rep");
  assert.equal(partyToneClass("IND"), "text-muted");
  assert.equal(partyToneClass(null), "text-muted");
  assert.equal(fecCandidateLabel("P80011018"), "FEC P80011018");
  assert.equal(fecCandidateLabel(null), "FEC candidate id not reported");
});
