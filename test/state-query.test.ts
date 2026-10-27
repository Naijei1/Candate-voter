import assert from "node:assert/strict";
import test from "node:test";
import {
  postalFromSearch,
  searchWithState,
  searchWithoutState,
  selectionFromLocation,
  selectionFromPop,
  yearNavigationHref,
} from "../src/lib/landing/state-query";

test("state query keeps the year and replaces a previous state", () => {
  assert.equal(searchWithState("", "ca"), "?state=CA");
  assert.equal(searchWithState("?year=2026", "tx"), "?year=2026&state=TX");
  assert.equal(searchWithState("?state=NY&year=2028", "CA"), "?state=CA&year=2028");
  assert.equal(postalFromSearch("?year=2026&state=ca"), "CA");
  assert.equal(postalFromSearch("?state=California"), null);
  assert.equal(postalFromSearch(""), null);
  assert.equal(searchWithoutState("?year=2026&state=KY"), "?year=2026");
  assert.equal(searchWithoutState("?state=KY"), "");
  assert.equal(searchWithoutState(""), "");
});

test("a deep link selects from the URL before the server prop catches up", () => {
  assert.equal(selectionFromLocation("?state=NV", null), "NV");
  assert.equal(selectionFromLocation("?state=ky", "CA"), "KY");
  assert.equal(selectionFromLocation("", "NV"), "NV");
  assert.equal(selectionFromLocation("?state=nope", "KY"), "KY");
  assert.equal(selectionFromPop("?state=KY"), "KY");
  assert.equal(selectionFromPop(""), null);
  assert.equal(selectionFromPop("?year=2026"), null);
});

test("year navigation keeps the selected state on the home page", () => {
  assert.equal(yearNavigationHref("/", "?state=KY", 2028), "/?state=KY&year=2028");
  assert.equal(yearNavigationHref("/", "?year=2026&state=VA", 2026), "/?year=2026&state=VA");
  assert.equal(yearNavigationHref("/races/2026-senate-VA", "?state=VA", 2028), "/?year=2028");
});
