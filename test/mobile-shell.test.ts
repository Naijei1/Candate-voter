import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public shell scrolls and keeps large navigation targets", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /font-size:\s*18px/);
  assert.equal(/body\s*\{[^}]*overflow:\s*hidden/.test(css), false);
  assert.equal(/\.national-shell/.test(css), false);
  assert.equal(/prefers-color-scheme:\s*dark/.test(css), false);
});

test("race and candidate pages return to the state journey", () => {
  const race = readFileSync(new URL("../src/app/races/[raceId]/page.tsx", import.meta.url), "utf8");
  const candidate = readFileSync(
    new URL("../src/app/candidates/[candidateId]/page.tsx", import.meta.url),
    "utf8",
  );
  const compare = readFileSync(
    new URL("../src/app/races/[raceId]/compare/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(race, /id="candidates-heading"/);
  assert.match(race, /Compare candidates/);
  assert.match(race, /AskPanel/);
  assert.match(race, /FollowControl/);
  assert.match(race, /alternateFilings\.length \+ 1/);
  assert.match(compare, /CompareBoard/);
  assert.match(compare, /AskPanel/);
  assert.match(compare, /race-layout/);
  assert.equal(compare.includes("Sample candidate"), false);
  assert.match(candidate, /FollowControl/);
  assert.match(candidate, /FEC filing/);
  assert.equal(candidate.includes("Voting record"), false);
  assert.equal(candidate.includes("Website"), false);
  assert.equal(candidate.includes("Form {filing.formType}"), false);
  assert.equal(race.includes("Back to map"), false);
});
