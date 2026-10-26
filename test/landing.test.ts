import assert from "node:assert/strict";
import test from "node:test";
import { DC_CALLOUT } from "../src/lib/geo/dc-label";
import { US_STATE_SHAPES } from "../src/lib/geo/us-states";
import {
  filingCoverageLabel,
  parseRaceIds,
  presidentialRace,
  spotlightRaces,
  stateRaces,
  statesWithRaces,
} from "../src/lib/landing";
import {
  applyCandidateLoad,
  isAbortError,
  loadCandidatesForRacesWithTimeout,
} from "../src/lib/landing/load-candidates";
import type { Race } from "../src/lib/types";

const older = "2026-05-01T00:00:00.000Z";
const newer = "2026-10-01T00:00:00.000Z";

function race(partial: Pick<Race, "raceId" | "office" | "title"> & Partial<Race>): Race {
  return {
    cycle: 2026,
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/candidates/",
    updatedAt: older,
    ...partial,
  };
}

test("spotlight picks one race per office by newest update, not by party or size", () => {
  const races = [
    race({
      raceId: "2026-senate-WY",
      office: "senate",
      title: "U.S. Senate, Wyoming",
      state: "WY",
      updatedAt: newer,
    }),
    race({
      raceId: "2026-senate-CA",
      office: "senate",
      title: "U.S. Senate, California",
      state: "CA",
      updatedAt: older,
    }),
    race({
      raceId: "2026-house-CA-12",
      office: "house",
      title: "U.S. House, California District 12",
      state: "CA",
      district: "12",
      updatedAt: older,
    }),
    race({
      raceId: "2026-house-TX-07",
      office: "house",
      title: "U.S. House, Texas District 7",
      state: "TX",
      district: "07",
      updatedAt: newer,
    }),
    race({ raceId: "2028-president", office: "president", title: "President", cycle: 2028 }),
  ];

  assert.deepEqual(
    spotlightRaces(races).map((item) => item.raceId),
    ["2028-president", "2026-senate-WY", "2026-house-TX-07"],
  );
});

test("spotlight fills open spots from the newest remaining race", () => {
  const races = [
    race({ raceId: "2026-senate-ME", office: "senate", title: "Senate ME", state: "ME", updatedAt: older }),
    race({ raceId: "2026-senate-OR", office: "senate", title: "Senate OR", state: "OR", updatedAt: newer }),
  ];
  assert.deepEqual(
    spotlightRaces(races).map((item) => item.raceId),
    ["2026-senate-OR", "2026-senate-ME"],
  );
});

test("state view lists Senate and House only, with president kept national", () => {
  const races = [
    race({ raceId: "2026-president", office: "president", title: "President" }),
    race({
      raceId: "2026-senate-VA",
      office: "senate",
      title: "U.S. Senate, Virginia",
      state: "VA",
      jurisdiction: "Virginia",
    }),
    race({
      raceId: "2026-house-VA-02",
      office: "house",
      title: "House 2",
      state: "VA",
      district: "02",
    }),
    race({
      raceId: "2026-house-VA-01",
      office: "house",
      title: "House 1",
      state: "VA",
      district: "01",
    }),
    race({
      raceId: "2026-senate-MD",
      office: "senate",
      title: "U.S. Senate, Maryland",
      state: "MD",
    }),
  ];

  assert.deepEqual(
    stateRaces(races, "VA").map((item) => item.raceId),
    ["2026-senate-VA", "2026-house-VA-01", "2026-house-VA-02"],
  );
  assert.equal(presidentialRace(races)?.raceId, "2026-president");
  assert.equal(stateRaces(races, "WY").length, 0);
  assert.equal(
    filingCoverageLabel(races, "WY"),
    "0 of 1 House districts have filings. Counts are FEC Form 2 electronic filings stored so far, not a full ballot or a certified candidate list.",
  );
  assert.equal(
    filingCoverageLabel(races, "VA"),
    "1 Senate race with filings. 2 of 11 House districts have filings. Counts are FEC Form 2 electronic filings stored so far, not a full ballot or a certified candidate list.",
  );
  assert.match(filingCoverageLabel(races, "VA"), /2 of 11 House districts have filings/);
  assert.deepEqual(statesWithRaces(races), ["MD", "VA"]);
});

test("parseRaceIds accepts stored id shapes and rejects a long or malformed list", () => {
  assert.deepEqual(parseRaceIds(["2026-president", "2026-president", "2026-house-CA-07"]), {
    ok: true,
    ids: ["2026-president", "2026-house-CA-07"],
  });
  assert.equal(parseRaceIds([]).ok, false);
  assert.equal(parseRaceIds(["2026-senate-California"]).ok, false);
  assert.equal(parseRaceIds(["1979-president"]).ok, false);
  const tooMany = Array.from({ length: 81 }, (_, index) => {
    const district = String((index % 53) + 1).padStart(2, "0");
    const cycle = 2026 + Math.floor(index / 53);
    return `${cycle}-house-CA-${district}`;
  });
  assert.equal(parseRaceIds(tooMany).ok, false);
});

test("the state map is one geographic outline per state and DC", () => {
  assert.equal(US_STATE_SHAPES.length, 51);
  const codes = US_STATE_SHAPES.map((shape) => shape.postal);
  assert.equal(new Set(codes).size, 51);
  for (const postal of ["CA", "TX", "NY", "AK", "HI", "DC", "VA"]) {
    assert.ok(codes.includes(postal));
  }
  for (const shape of US_STATE_SHAPES) {
    assert.match(shape.d, /^M[\d.-]/);
    assert.ok(shape.d.length > 40);
  }
  const dc = US_STATE_SHAPES.find((shape) => shape.postal === "DC");
  assert.ok(dc);
  const nums = dc.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < nums.length; index += 2) {
    maxX = Math.max(maxX, nums[index] ?? 0);
    maxY = Math.max(maxY, nums[index + 1] ?? 0);
  }
  assert.ok(DC_CALLOUT.labelX > maxX);
  assert.ok(DC_CALLOUT.labelY > maxY);
});

test("KY panel loads Senate and House race ids for that state", () => {
  const races = [
    race({ raceId: "2026-president", office: "president", title: "President" }),
    race({ raceId: "2026-senate-KY", office: "senate", title: "U.S. Senate, Kentucky", state: "KY" }),
    race({ raceId: "2026-house-KY-06", office: "house", title: "House 6", state: "KY", district: "06" }),
    race({ raceId: "2026-house-KY-04", office: "house", title: "House 4", state: "KY", district: "04" }),
    race({ raceId: "2026-house-KY-05", office: "house", title: "House 5", state: "KY", district: "05" }),
    race({ raceId: "2026-senate-TN", office: "senate", title: "U.S. Senate, Tennessee", state: "TN" }),
  ];
  assert.deepEqual(stateRaces(races, "KY").map((item) => item.raceId), [
    "2026-senate-KY",
    "2026-house-KY-04",
    "2026-house-KY-05",
    "2026-house-KY-06",
  ]);
});

test("a finished candidate load records every requested race", () => {
  const partial = applyCandidateLoad(new Map(), ["2026-senate-KY", "2026-house-KY-04"], {
    ok: true,
    races: [
      {
        raceId: "2026-senate-KY",
        candidates: [
          {
            candidateId: "S6KY00001",
            displayName: "Ada Lovelace",
            partyAffiliation: "DEM",
            partyCode: "DEM",
            partyLabel: "Democratic",
            sourceUrl: null,
            updatedAt: null,
          },
        ],
      },
    ],
  });
  assert.equal(partial.get("2026-senate-KY")?.ok, true);
  assert.equal(partial.get("2026-house-KY-04")?.ok, false);

  const failed = applyCandidateLoad(new Map(), ["2026-senate-KY"], { ok: false, error: "timeout" });
  assert.equal(failed.get("2026-senate-KY")?.ok, false);
});

test("candidate load timeout settles when the action never resolves", async () => {
  const started = Date.now();
  const result = await loadCandidatesForRacesWithTimeout(
    ["2026-senate-KY", "2026-house-KY-04"],
    {
      timeoutMs: 30,
      load: () => new Promise(() => {}),
    },
  );
  assert.deepEqual(result, { ok: false, error: "timeout" });
  assert.ok(Date.now() - started < 1_000);
  const shown = applyCandidateLoad(new Map(), ["2026-senate-KY", "2026-house-KY-04"], result);
  assert.equal(shown.get("2026-senate-KY")?.ok, false);
  assert.equal(shown.get("2026-house-KY-04")?.ok, false);
});

test("aborting a candidate load is cancellation, not an error row", async () => {
  const controller = new AbortController();
  const pending = loadCandidatesForRacesWithTimeout(["2026-senate-KY"], {
    timeoutMs: 5_000,
    signal: controller.signal,
    load: () => new Promise(() => {}),
  });
  controller.abort();
  await assert.rejects(pending, (error: unknown) => isAbortError(error));
});

test("candidate load returns rows when the action settles", async () => {
  const result = await loadCandidatesForRacesWithTimeout(["2026-senate-KY"], {
    timeoutMs: 500,
    load: async () => ({ ok: true, races: [{ raceId: "2026-senate-KY", candidates: [] }] }),
  });
  assert.equal(result.ok, true);
});
