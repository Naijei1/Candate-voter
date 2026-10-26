import assert from "node:assert/strict";
import test from "node:test";
import { buildSetExpression } from "../src/lib/data/expressions";
import { toCandidateItem, toRaceItem } from "../src/lib/data/items";
import type { Candidate, Race } from "../src/lib/types";

test("aliases every attribute, including reserved words", () => {
  const expression = buildSetExpression({
    state: "CA",
    updatedAt: "2026-10-26T00:00:00.000Z",
    partyAffiliation: null,
  });
  assert.match(expression.UpdateExpression, /#state = :state/);
  assert.equal(expression.UpdateExpression.includes(" state ="), false);
  assert.match(expression.UpdateExpression, /if_not_exists\(#createdAt, :updatedAt\)/);
  assert.equal(expression.ExpressionAttributeNames["#state"], "state");
  assert.equal(expression.ExpressionAttributeValues[":partyAffiliation"], null);
});

test("race and candidate items use the single-table keys", () => {
  const race: Race = {
    raceId: "2026-house-CA-07",
    office: "house",
    cycle: 2026,
    state: "CA",
    district: "07",
    title: "U.S. House, California District 7",
    jurisdiction: "California District 7",
    sourceUrl: "https://www.fec.gov/data/candidates/?election_year=2026&office=H",
    updatedAt: "2026-10-26T00:00:00.000Z",
  };
  const raceItem = toRaceItem(race);
  assert.equal(raceItem.pk, "RACE#2026-house-CA-07");
  assert.equal(raceItem.sk, "META");
  assert.equal(raceItem.gsi1pk, "CYCLE#2026");
  assert.equal(raceItem.gsi1sk, "house#CA#07#2026-house-CA-07");

  const candidate: Candidate = {
    candidateId: "H4CA12019",
    raceId: race.raceId,
    displayName: "Jane Doe",
    nameAsFiled: "DOE, JANE",
    office: "house",
    partyAffiliation: "DEM",
    fecCandidateId: "H4CA12019",
    sourceUrl: "https://www.fec.gov/data/candidate/H4CA12019/",
    sourceLoadedAt: "2026-01-02 03:04:05",
    updatedAt: race.updatedAt,
  };
  const candidateItem = toCandidateItem(candidate);
  assert.equal(candidateItem.pk, "CAND#H4CA12019");
  assert.equal(candidateItem.gsi1pk, "RACE#2026-house-CA-07");
  assert.equal(candidateItem.gsi1sk, "CAND#H4CA12019");
  assert.equal("score" in candidateItem, false);
});
