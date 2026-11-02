import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL } from "../src/lib/data/at-large";

const index = JSON.parse(
  readFileSync(new URL("../public/geo/cd120/index.json", import.meta.url), "utf8"),
) as {
  congress: number;
  states: Record<string, string[]>;
};

test("cd120 asset matches the 120th Congress layer used by ZIP lookup", () => {
  assert.equal(index.congress, 120);
  assert.deepEqual(Object.keys(index.states).sort(), Object.keys(HOUSE_SEATS).sort());
  const codes = Object.values(index.states).flat();
  assert.equal(codes.length, HOUSE_SEATS_TOTAL);
  assert.deepEqual(index.states.KY, ["01", "02", "03", "04", "05", "06"]);
  assert.deepEqual(index.states.WY, ["00"]);
  assert.equal(codes.includes("ZZ"), false);
  const map = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  assert.match(map, /\/geo\/cd120\//);
});
