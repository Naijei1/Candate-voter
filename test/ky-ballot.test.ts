import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { KY_BALLOT_SOURCES, kyBallot, kyBallotSeed, kyPerson } from "../src/lib/site/ky-ballot";
import { kentuckyEasternPollsClosed, kentuckyPollsClosed, kentuckyResultsPhase } from "../src/lib/site/ky-results";
import { linkLabel, profileFor } from "../src/lib/site/profiles";
import { matchScore, portraitFor, stanceIssues, stancesFor } from "../src/lib/site/stances";

test("Kentucky November ballot matches the Secretary of State filing list", () => {
  const senate = kyBallot("2026-senate-KY");
  assert.ok(senate);
  assert.deepEqual(
    senate.people.map((person) => person.name),
    ["Andy Barr", "Charles Booker", "Christopher Campbell", "Thomas Michael Murphy"],
  );
  assert.equal(senate.people.find((person) => person.name === "Thomas Michael Murphy")?.role, "write-in");
  assert.equal(senate.people.some((person) => /Morris|McConnell|McGrath/.test(person.name)), false);

  const counts = ["01", "02", "03", "04", "05", "06"].map((district) => kyBallot(`2026-house-KY-${district}`)?.people.length);
  assert.deepEqual(counts, [2, 3, 2, 4, 5, 5]);
  assert.equal(kyPerson("H6KY01110")?.person.holdsOffice, true);
  assert.equal(kyPerson("S6KY00286")?.person.holdsOffice, false);
  assert.equal(kyPerson("H2KY04121"), null);
  assert.equal(kyBallot("2026-house-KY-04")?.note?.includes("Thomas Massie"), true);
  assert.equal(kyPerson("H6KY04213")?.person.name, "Jeremy Todd");
  assert.ok(KY_BALLOT_SOURCES[0].url.includes("web.sos.ky.gov"));
  assert.ok(KY_BALLOT_SOURCES[1].url.includes("clerk.house.gov"));

  const header = readFileSync("src/components/SiteHeader.tsx", "utf8");
  const footer = readFileSync("src/components/SiteFooter.tsx", "utf8");
  const home = readFileSync("src/app/page.tsx", "utf8");
  const about = readFileSync("src/app/about/page.tsx", "utf8");
  const signIn = readFileSync("src/components/site/SignInForm.tsx", "utf8");
  assert.equal(header.includes("/about"), false);
  assert.equal(footer.includes("/about"), false);
  assert.equal(home.includes("founder"), false);
  assert.match(about, /redirect\("\/"\)/);
  assert.match(signIn, /googleUrl/);
  assert.match(signIn, /Continue with Google/);
});

test("the November seed covers every federal race and does not add primary losers", () => {
  const seed = kyBallotSeed();
  assert.equal(seed.races.length, 7);
  assert.equal(seed.candidates.length, 25);
  assert.equal(seed.candidates.some((candidate) => candidate.displayName === "Nate Morris"), false);
  assert.equal(seed.candidates.filter((candidate) => candidate.raceId === "2026-house-KY-01").length, 2);
  const page = readFileSync("src/app/races/[raceId]/page.tsx", "utf8");
  assert.match(page, /ballot\.people/);
  assert.match(page, /ElectionDayBanner/);
  assert.match(readFileSync("src/components/site/ElectionStatus.tsx", "utf8"), /See official results/);
  const script = readFileSync("scripts/seed-ky-ballot.ts", "utf8");
  assert.match(script, /AWS_REGION=us-east-1 CANDATE_TABLE_NAME=candate-voter npm run seed:ky/);
});

test("only sourced stances count, and missing candidates are not enough info", () => {
  const issueIds = new Set(stanceIssues().map((issue) => issue.id));
  assert.deepEqual(
    stanceIssues().map((issue) => issue.id),
    ["cost", "health", "data", "immigration", "debt"],
  );
  const covered = ["S6KY00286", "S6KY00385", "S6KY00377", "H6KY01110", "H6KY01169", "H8KY02031", "H6KY02068", "H2KY03206", "H6KY03223", "H6KY04171", "H6KY04189", "H0KY05015", "H6KY05152", "H6KY05202", "H2KY05136", "H6KY06192", "H6KY06184", "H6KY06234", "H6KY06242", "H6KY06283"];
  for (const id of covered) {
    const rows = stancesFor(id);
    assert.ok(rows.length > 0 && rows.length <= 4, id);
    assert.ok(rows.every((row) => row.sourceUrl.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(row.sourceDate) && issueIds.has(row.issueId)), id);
  }
  for (const id of ["sos-ky-2026-murphy", "H8KY02106", "H6KY04205", "sos-ky-2026-peter-williams", "H2KY05185"]) {
    assert.equal(stancesFor(id).length, 0, id);
    assert.equal(matchScore(id, ["health"]).enough, false);
  }
  assert.equal(stancesFor("S6KY00385").some((row) => /socialist/i.test(row.text)), false);
  assert.equal(stancesFor("H2KY04121").length, 0);
  for (const id of ["S6KY00286", "H6KY01110", "H8KY02031", "H2KY03206", "H0KY05015"]) {
    assert.equal(existsSync(`public${portraitFor(id)?.src}`), true, id);
  }
  assert.equal(portraitFor("H6KY01169")?.credit, "Photo: campaign website");
  assert.equal(portraitFor("S6KY00377"), null);
  assert.match(portraitFor("S6KY00385")?.sourceUrl ?? "", /^https:\/\/commons\.wikimedia\.org\//);
  assert.equal(profileFor("H6KY01169").website?.url, "https://williamsforky.com");
  assert.equal(linkLabel(profileFor("H6KY01110").website!), "Official site");
  assert.equal(profileFor("H8KY02106").votes.length, 0);
  assert.equal(profileFor("H6KY01110").votes[0]?.vote, "Yes");
  assert.equal(profileFor("H6KY06184").website, null);
});

test("Kentucky results stay closed until 6 p.m. Central", () => {
  assert.equal(kentuckyPollsClosed(new Date("2026-11-03T22:59:00Z")), false);
  assert.equal(kentuckyPollsClosed(new Date("2026-11-03T23:30:00Z")), false);
  assert.equal(kentuckyPollsClosed(new Date("2026-11-04T00:00:00Z")), true);
  assert.equal(kentuckyEasternPollsClosed(new Date("2026-11-03T22:59:00Z")), false);
  assert.equal(kentuckyResultsPhase(new Date("2026-11-03T23:28:00Z")), "partial");
  assert.equal(kentuckyResultsPhase(new Date("2026-11-04T00:00:00Z")), "closed");
});
