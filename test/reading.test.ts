import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ageLabel } from "../src/lib/format";
import { kyBallot } from "../src/lib/site/ky-ballot";
import { profileFor, profileRecordDate } from "../src/lib/site/profiles";
import { raceSummaryText } from "../src/lib/site/race-summary";
import { searchQueryValue, searchSite } from "../src/lib/site/search-index";

const now = new Date("2026-11-23T18:00:00Z");

test("a race summary is one sourced sentence", () => {
  const senate = raceSummaryText(kyBallot("2026-senate-KY")!, now);
  assert.match(senate ?? "", /Andy Barr \(Republican\), Charles Booker \(Democratic\), Christopher Campbell \(Kentucky Party\), and Thomas Michael Murphy \(Write-in\) are running for the open seat Mitch McConnell \(Republican\) holds until Jan 3, 2027\./);
  assert.match(senate ?? "", /Mitch McConnell is not a candidate\./);
  const house = raceSummaryText(kyBallot("2026-house-KY-01")!, now);
  assert.match(house ?? "", /James R\. Comer \(Republican\) holds this office and is running\. John "Drew" Williams \(Democratic\) is also running\./);
  const openHouse = raceSummaryText(kyBallot("2026-house-KY-06")!, now);
  assert.match(openHouse ?? "", /open seat Andy Barr \(Republican\) holds until Jan 3, 2027/);
  assert.match(openHouse ?? "", /Andy Barr is running for Senate\./);
  const afterTerm = new Date("2027-01-03T17:00:00Z");
  const senateLater = raceSummaryText(kyBallot("2026-senate-KY")!, afterTerm);
  assert.match(senateLater ?? "", /Mitch McConnell \(Republican\) held until Jan 3, 2027/);
  assert.doesNotMatch(senateLater ?? "", /Rand Paul/);
  const houseLater = raceSummaryText(kyBallot("2026-house-KY-06")!, afterTerm);
  assert.match(houseLater ?? "", /Andy Barr \(Republican\) held until Jan 3, 2027/);
});

test("search finds candidates, counties, and a ZIP without inventing a miss", () => {
  assert.equal(searchSite("a").length, 0);
  assert.ok(searchSite("Barr").some((hit) => hit.kind === "Candidate" && hit.href === "/candidates/S6KY00286"));
  assert.ok(searchSite("Adair").some((hit) => hit.kind === "County" && hit.title === "Adair County"));
  assert.deepEqual(searchSite("40502"), [{ kind: "ZIP", title: "ZIP 40502", detail: "Find the races for this ZIP", href: "/ballot?zip=40502" }]);
  assert.equal(searchSite("zzzz-not-a-candidate").length, 0);
  assert.equal(searchQueryValue(["Barr", "Booker"]), "Barr");
  assert.equal(searchQueryValue(["  ", "Booker"]), "Booker");
  assert.equal(searchQueryValue("  Barr "), "Barr");
  assert.equal(searchQueryValue(undefined), "");
});

test("a profile citation uses the newest record date shown for that person", () => {
  assert.equal(profileRecordDate(profileFor("S6KY00286")), "2026-11-22");
  assert.equal(profileRecordDate({ ...profileFor("S6KY00286"), votes: [], website: null, bio: { text: "U.S. Representative, Kentucky, with a sourced biography.", sourceName: "Office", sourceUrl: "https://example.com", sourceDate: "2026-09-16" }, endorsements: [], education: [], career: [], results: [], social: [] }), "2026-09-16");
});

test("citations keep the base path and every issue stance is in the page", () => {
  const cite = readFileSync("src/components/site/CiteShare.tsx", "utf8");
  assert.match(cite, /withBasePath\(path\)/);
  const notes = readFileSync("src/components/site/IssueNotes.tsx", "utf8");
  assert.equal(/"use client"/.test(notes), false);
  assert.match(notes, /<details/);
  assert.match(notes, /<Link href=\{`\$\{compareHref\}#issue-\$\{row\.issue\.id\}`\}>Compare this issue<\/Link>/);
});

test("recent feed dates read as an age and older dates keep the calendar day", () => {
  assert.equal(ageLabel("2026-11-23", now), "today");
  assert.equal(ageLabel("2026-11-22", now), "1 day ago");
  assert.equal(ageLabel("2026-11-20", now), "3 days ago");
  assert.equal(ageLabel("2026-01-01", now), "Jan 1, 2026");
});
