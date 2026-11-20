import assert from "node:assert/strict";
import { test } from "node:test";
import { isKentuckyFinanceRow } from "../src/lib/site/ky-finance";

test("a Kentucky report can contain spending on candidates from other states", () => {
  const raceId = "2026-senate-KY";
  assert.equal(isKentuckyFinanceRow({ candidateId: "H0MI02094", raceId }), false);
  assert.equal(isKentuckyFinanceRow({ candidateId: "H0KY06104", raceId: null }), true);
});
