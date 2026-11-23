import assert from "node:assert/strict";
import test from "node:test";
import { ageLabel } from "../src/lib/format";
import { kyBallot } from "../src/lib/site/ky-ballot";
import { raceSummaryText } from "../src/lib/site/race-summary";
import { searchSite } from "../src/lib/site/search-index";

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
});

test("search finds candidates, counties, and a ZIP without inventing a miss", () => {
  assert.equal(searchSite("a").length, 0);
  assert.ok(searchSite("Barr").some((hit) => hit.kind === "Candidate" && hit.href === "/candidates/S6KY00286"));
  assert.ok(searchSite("Adair").some((hit) => hit.kind === "County" && hit.title === "Adair County"));
  assert.deepEqual(searchSite("40502"), [{ kind: "ZIP", title: "ZIP 40502", detail: "Find the races for this ZIP", href: "/ballot?zip=40502" }]);
  assert.equal(searchSite("zzzz-not-a-candidate").length, 0);
});

test("recent feed dates read as an age and older dates keep the calendar day", () => {
  assert.equal(ageLabel("2026-11-23", now), "today");
  assert.equal(ageLabel("2026-11-22", now), "1 day ago");
  assert.equal(ageLabel("2026-11-20", now), "3 days ago");
  assert.equal(ageLabel("2026-01-01", now), "Jan 1, 2026");
});
