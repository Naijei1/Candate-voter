import assert from "node:assert/strict";
import test from "node:test";
import {
  fecCandidateLabel,
  formatInstant,
  httpsUrl,
  partyLabel,
} from "../src/lib/format";

test("formatInstant renders UTC and keeps an unparseable value visible", () => {
  assert.equal(formatInstant(null), null);
  assert.equal(formatInstant("   "), null);
  assert.equal(formatInstant("not-a-date"), "not-a-date");
  const formatted = formatInstant("2026-10-26T05:00:00.000Z");
  assert.equal(formatted, "Oct 26, 2026, 5:00 AM UTC");
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

test("party and FEC labels stay on the reported code", () => {
  assert.equal(partyLabel("DEM"), "Party DEM");
  assert.equal(partyLabel(null), "Party not reported");
  assert.equal(partyLabel("  "), "Party not reported");
  assert.equal(fecCandidateLabel("P80011018"), "FEC P80011018");
  assert.equal(fecCandidateLabel(null), "FEC candidate id not reported");
});
