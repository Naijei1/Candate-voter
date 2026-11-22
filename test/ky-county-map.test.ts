import assert from "node:assert/strict";
import test from "node:test";
import counties from "../data/ky-counties.json";
import map from "../public/geo/counties/KY.json";
import { signedDistance, type Point } from "../src/lib/geo/label-point";

test("each Kentucky county has an interior label and an alphabetically ordered clerk and district record", () => {
  assert.equal(counties.length, 120);
  assert.equal(new Set(counties.map((row) => row.fips)).size, 120);
  assert.deepEqual(map.counties.map((row) => row.fips), counties.map((row) => row.fips));
  assert.deepEqual(counties.map((row) => row.name), counties.map((row) => row.name).sort((a, b) => a.localeCompare(b)));
  for (const [index, row] of counties.entries()) {
    assert.match(row.fips, /^21\d{3}$/);
    assert.ok(row.clerk && /^https?:\/\//.test(row.clerkUrl));
    assert.ok(row.districts.length && row.districts.every((code) => /^0[1-6]$/.test(code)));
    const { d, x, y } = map.counties[index];
    const rings = d.split("Z").filter(Boolean).map((ring) => ring.slice(1).split("L").map((pair) => pair.split(" ").map(Number) as Point));
    assert.ok(signedDistance([x, y], rings) > 0, row.name);
  }
  assert.deepEqual(counties.find((row) => row.name === "Jefferson")?.districts, ["02", "03"]);
  assert.equal(counties.filter((row) => row.districts.length > 1).length, 6);
});
