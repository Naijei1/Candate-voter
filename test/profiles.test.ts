import assert from "node:assert/strict";
import { test } from "node:test";
import { firstSentence } from "../src/lib/site/profiles";

test("the first sentence preserves periods in abbreviations", () => {
  assert.equal(firstSentence("U.S. Representative, Kentucky. He was elected in 2012."), "U.S. Representative, Kentucky.");
  assert.equal(firstSentence("Rep. John Smith Jr. succeeded John Smith Sr. in office. He served one term."), "Rep. John Smith Jr. succeeded John Smith Sr. in office.");
});
