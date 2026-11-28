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
  // v12 sets color-scheme per theme so the in-page toggle wins over the system setting.
  assert.match(css, /color-scheme: light;/);
  assert.match(css, /color-scheme: dark;/);
  assert.match(readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8"), /colorScheme: "light dark"/);
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
  // v13: crumbs lead back to My races at the saved county; compare and follow controls are the shared tv components.
  assert.match(race, /MY_RACES_CRUMB/);
  assert.match(candidate, /MY_RACES_CRUMB/);
  assert.match(compare, /MY_RACES_CRUMB/);
  assert.match(race, /Compare \{lastName\(pair\[0\]\.name\)\} and \{lastName\(pair\[1\]\.name\)\}/);
  assert.match(race, /AskPanel/);
  assert.match(race, /<FollowButton /);
  assert.match(compare, /\{ href: `\/races\/\$\{race\.raceId\}`, label: race\.title \}/);
  assert.equal(compare.includes("Sample candidate"), false);
  assert.match(candidate, /<FollowButton /);
  assert.match(candidate, /Filed to run/);
  assert.match(candidate, /profile\.votes\.length > 0/);
  assert.doesNotMatch(candidate, /No legislative record/);
  assert.match(candidate, /website \?/);
  assert.equal(candidate.includes("Form {filing.formType}"), false);
  assert.equal(race.includes("Back to map"), false);
});
