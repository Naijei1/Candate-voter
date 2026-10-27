import assert from "node:assert/strict";
import test from "node:test";
import {
  highlightedPostal,
  mapHomeHref,
  postalFromSearch,
  searchWithState,
  searchWithoutState,
  searchWithZip,
  withPreservedQuery,
  yearNavigationHref,
  zipFromSearch,
} from "../src/lib/landing/state-query";

test("state query keeps the year and replaces a previous state", () => {
  assert.equal(searchWithState("", "ca"), "?state=CA");
  assert.equal(searchWithState("?year=2026", "tx"), "?year=2026&state=TX");
  assert.equal(searchWithState("?state=NY&year=2028", "CA"), "?state=CA&year=2028");
  assert.equal(postalFromSearch("?year=2026&state=ca"), "CA");
  assert.equal(postalFromSearch("?state=California"), null);
  assert.equal(postalFromSearch(""), null);
  assert.equal(searchWithState("?year=2026&zip=40502", "KY"), "?year=2026&state=KY");
  assert.equal(searchWithoutState("?year=2026&state=KY"), "?year=2026");
  assert.equal(searchWithoutState("?year=2026&state=KY&zip=40502"), "?year=2026");
  assert.equal(searchWithoutState("?state=KY"), "");
  assert.equal(searchWithoutState(""), "");
  assert.equal(searchWithZip("?year=2026", "ky", "40502"), "?year=2026&state=KY&zip=40502");
  assert.equal(zipFromSearch("?state=KY&zip=40502-1234"), "40502");
  assert.equal(zipFromSearch("?state=KY"), null);
});

test("country map keeps the last state when Back drops state from the URL", () => {
  assert.equal(highlightedPostal("KY", null), "KY");
  assert.equal(highlightedPostal(null, "KY"), "KY");
  assert.equal(highlightedPostal("OH", "KY"), "OH");
  assert.equal(highlightedPostal(null, null), null);
});

test("year navigation keeps the selected state on the home page", () => {
  assert.equal(yearNavigationHref("/", "?state=KY", 2028), "/?state=KY&year=2028");
  assert.equal(yearNavigationHref("/", "?state=KY&zip=40502", 2028), "/?state=KY&zip=40502&year=2028");
  assert.equal(yearNavigationHref("/", "?year=2026&state=VA", 2026), "/?year=2026&state=VA");
  assert.equal(yearNavigationHref("/races/2026-senate-VA", "?state=VA", 2028), "/?year=2028");
  assert.equal(
    mapHomeHref({ year: 2026, state: "ky", zip: "40502" }),
    "/?year=2026&state=KY&zip=40502",
  );
  assert.equal(mapHomeHref({ year: 2026, state: "KY" }), "/?year=2026&state=KY");
  assert.equal(mapHomeHref({ year: 2026 }), "/?year=2026");
  assert.equal(mapHomeHref({ year: 2026, zip: "40502" }), "/?year=2026");
  assert.equal(
    withPreservedQuery("/races/2026-house-KY-06", { year: 2026, state: "KY", zip: "40502" }),
    "/races/2026-house-KY-06?year=2026&state=KY&zip=40502",
  );
  assert.equal(
    withPreservedQuery("/#your-races", { year: 2026, state: "KY", zip: "40502" }),
    "/?year=2026&state=KY&zip=40502#your-races",
  );
});
