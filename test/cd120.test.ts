import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL } from "../src/lib/data/at-large";
import { mapHintsFor } from "../src/lib/states";

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

test("district paths render in number order with a reserved short live label", () => {
  const map = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  assert.match(map, /\.sort\(\(a, b\) => Number\(a\.district\) - Number\(b\.district\)\)/);
  assert.match(map, /`District \$\{Number\(shape\.district\)\}`/);
  assert.match(map, /className="cd-hover-label" aria-live="polite">\{hover \?\? "\\u00a0"\}/);
  assert.doesNotMatch(map, /<title>/);
  assert.match(map, /mapHintsFor\(postal\)/);
  assert.match(map, /hints\.fitPad/);
  assert.match(map, /hints\.localLatitude/);
  assert.match(map, /hints\.compactLabelDistricts\.includes\(shape\.district\)/);
  assert.doesNotMatch(map, /postal === "KY"/);
  const kentucky = mapHintsFor("KY");
  assert.equal(kentucky.fitPad, 4);
  assert.equal(kentucky.localLatitude, true);
  assert.deepEqual([...kentucky.compactLabelDistricts], ["03"]);
  assert.equal(kentucky.hideHouseLegend, true);
  const other = mapHintsFor("OH");
  assert.equal(other.fitPad, 20);
  assert.equal(other.localLatitude, false);
  assert.deepEqual([...other.compactLabelDistricts], []);
  assert.equal(other.hideHouseLegend, false);
});
