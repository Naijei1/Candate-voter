import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL } from "../src/lib/data/at-large";
import {
  CD119_CONGRESS,
  CD119_SOURCE,
  CD119_VINTAGE,
  districtCodeForMap,
  districtHasCandidates,
  isCdFeatureCollection,
  projectCollection,
  raceForDistrict,
} from "../src/lib/geo/cd119";
import type { Race } from "../src/lib/types";

const index = JSON.parse(
  readFileSync(new URL("../public/geo/cd119/index.json", import.meta.url), "utf8"),
) as {
  source: string;
  vintage: number;
  congress: number;
  states: Record<string, string[]>;
};

test("cd119 asset is the 2024 Census file for 50 states and 435 districts", () => {
  assert.equal(index.source, CD119_SOURCE);
  assert.equal(index.vintage, CD119_VINTAGE);
  assert.equal(index.congress, CD119_CONGRESS);
  assert.equal(index.congress, 119);
  assert.deepEqual(Object.keys(index.states).sort(), Object.keys(HOUSE_SEATS).sort());
  const codes = Object.values(index.states).flat();
  assert.equal(codes.length, HOUSE_SEATS_TOTAL);
  assert.equal(codes.length, 435);
  assert.deepEqual(index.states.KY, ["01", "02", "03", "04", "05", "06"]);
  assert.deepEqual(index.states.WY, ["00"]);
  assert.deepEqual(index.states.AK, ["00"]);
  assert.equal(index.states.DC, undefined);
  assert.equal(codes.includes("98"), false);
});

test("district join uses raceId and does not treat at-large 01 as 00", () => {
  assert.equal(districtCodeForMap("KY", "1"), "01");
  assert.equal(districtCodeForMap("WY", "00"), "00");
  assert.equal(districtCodeForMap("WY", "01"), null);
  assert.equal(districtCodeForMap("DC", "00"), null);

  const filed: Race = {
    raceId: "2026-house-KY-01",
    office: "house",
    cycle: 2026,
    state: "KY",
    district: "01",
    title: "U.S. House, Kentucky District 1",
    jurisdiction: "Kentucky District 1",
    sourceUrl: null,
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
  const empty: Race = { ...filed, raceId: "2026-house-KY-02", district: "02", empty: true, updatedAt: null };
  const atLarge: Race = {
    raceId: "2026-house-WY-00",
    office: "house",
    cycle: 2026,
    state: "WY",
    district: "00",
    title: "U.S. House, Wyoming at-large",
    jurisdiction: "Wyoming at-large",
    sourceUrl: null,
    updatedAt: null,
    empty: true,
  };
  const legacy: Race = { ...atLarge, raceId: "2026-house-WY-01", district: "01" };

  assert.equal(raceForDistrict([filed, empty], "KY", "01")?.raceId, "2026-house-KY-01");
  assert.equal(districtHasCandidates(raceForDistrict([filed, empty], "KY", "01")), true);
  assert.equal(raceForDistrict([filed, empty], "KY", "02")?.raceId, "2026-house-KY-02");
  assert.equal(districtHasCandidates(raceForDistrict([empty], "KY", "02")), false);
  assert.equal(raceForDistrict([atLarge], "WY", "00")?.raceId, "2026-house-WY-00");
  assert.equal(raceForDistrict([legacy], "WY", "00"), null);
  assert.equal(raceForDistrict([legacy], "WY", "01"), null);
  assert.equal(raceForDistrict([filed], "KY", "03"), null);
  assert.equal(districtHasCandidates({ ...filed, hasCandidates: false }), false);
  assert.equal(districtHasCandidates(empty), false);

  const idaho01: Race = {
    ...empty,
    raceId: "2026-house-ID-01",
    state: "ID",
    district: "01",
    title: "U.S. House, Idaho District 1",
    jurisdiction: "Idaho District 1",
    hasCandidates: false,
  };
  const idaho02: Race = { ...idaho01, raceId: "2026-house-ID-02", district: "02" };
  assert.equal(districtHasCandidates(idaho01), false);
  assert.equal(districtHasCandidates(idaho02), false);
});

test("a district feature projects to an even-odd path", () => {
  const collection = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { district: "01", state: "KY" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [-89, 39],
              [-82, 39],
              [-82, 36],
              [-89, 36],
              [-89, 39],
            ],
          ],
        },
      },
    ],
  };
  assert.equal(isCdFeatureCollection(collection), true);
  const drawn = projectCollection(collection, 200, 100, 10);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0]?.district, "01");
  assert.match(drawn[0]?.d ?? "", /^M/);
  assert.match(drawn[0]?.d ?? "", /Z$/);

  const ky = JSON.parse(readFileSync(new URL("../public/geo/cd119/KY.json", import.meta.url), "utf8"));
  assert.equal(isCdFeatureCollection(ky), true);
  if (!isCdFeatureCollection(ky)) return;
  const paths = projectCollection(ky);
  assert.deepEqual(
    paths.map((item) => item.district),
    ["01", "02", "03", "04", "05", "06"],
  );
  assert.ok(paths.every((item) => item.d.includes("M") && item.d.includes("Z")));
});
