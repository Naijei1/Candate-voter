import assert from "node:assert/strict";
import test from "node:test";
import { electionStageFromFec } from "../src/lib/fec/election-stage";
import { cardsForRace, reportedWebsite, showcaseRace } from "../src/lib/site/showcase";

test("election stage uses an FEC description and ignores a bare code", () => {
  assert.deepEqual(electionStageFromFec("Primary"), { stage: "primary", label: "Primary" });
  assert.deepEqual(electionStageFromFec("runoff"), { stage: "runoff", label: "runoff" });
  assert.equal(electionStageFromFec("P"), null);
  assert.equal(electionStageFromFec(null), null);
});

test("Kentucky Senate showcase is sourced FEC data, not sample names", () => {
  const race = showcaseRace();
  assert.ok(race);
  assert.equal(race?.raceId, "2026-senate-KY");
  assert.equal(race?.candidates.length, 22);
  const booker = race?.candidates.find((row) => row.fecCandidateId === "S6KY00385");
  assert.equal(booker?.displayName, "Charles Booker");
  assert.equal(booker?.incumbentLabel, "Open seat");
  assert.equal(booker?.partyLabel, "Democratic Party");
  assert.match(booker?.filingPdf ?? "", /^https:\/\/docquery\.fec\.gov\//);
  assert.equal(reportedWebsite("BARRFORSENATE.COM"), "https://barrforsenate.com/");
  const cards = cardsForRace("2026-senate-KY", [], false);
  assert.equal(cards.fecList, true);
  assert.equal(cards.cards.some((card) => card.name.startsWith("Sample")), false);
});
