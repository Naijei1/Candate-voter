import assert from "node:assert/strict";
import test from "node:test";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import type { ApiDeps } from "../src/lib/api/deps";
import { getZipLookup } from "../src/lib/api/handlers";
import { llmsText } from "../src/lib/api/llms";
import { openApiDocument } from "../src/lib/api/openapi-document";
import { parseZipLookupQuery } from "../src/lib/api/zip-query";
import {
  ZipLookupError,
  censusZipDistricts,
  clearZipDistrictCache,
  resolveDistricts,
} from "../src/lib/geo/zip-districts";
import type { Race } from "../src/lib/types";

const KEY = "test-key";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/elections/",
    updatedAt: "2026-10-26T05:00:00.000Z",
    ...partial,
  };
}

function deps(
  repo: MemoryVoterRepository,
  lookupZip: ApiDeps["lookupZip"],
): ApiDeps {
  return {
    env: { CANDATE_API_KEY: KEY },
    repository: () => repo,
    lookupZip,
  };
}

function authed(url: string): Request {
  return new Request(url, { headers: { authorization: `Bearer ${KEY}` } });
}

test("year is required and cycle is an alias", () => {
  assert.deepEqual(parseZipLookupQuery(new URL("https://voter.example/api/v1/lookup/zip?zip=40502")), {
    ok: false,
    message: "year is required",
  });
  assert.deepEqual(
    parseZipLookupQuery(new URL("https://voter.example/api/v1/lookup/zip?zip=40502-1234&cycle=2026")),
    { ok: true, query: { zip: "40502", year: 2026 } },
  );
  assert.equal(
    parseZipLookupQuery(new URL("https://voter.example/api/v1/lookup/zip?zip=40502&year=2026&cycle=2028")).ok,
    false,
  );
  assert.equal(
    parseZipLookupQuery(new URL("https://voter.example/api/v1/lookup/zip?zip=4050&year=2026")).ok,
    false,
  );
});

test("district resolution keeps one state and maps at-large codes to 00", () => {
  assert.deepEqual(
    resolveDistricts(
      { postal: "KY", fips: "21" },
      [
        { fips: "21", district: "06" },
        { fips: "47", district: "05" },
      ],
    ),
    { state: "KY", districts: ["06"] },
  );
  assert.equal(resolveDistricts("conflict", [{ fips: "21", district: "06" }]), null);
  assert.equal(resolveDistricts("unresolved", [{ fips: "21", district: "06" }]), null);
  assert.deepEqual(resolveDistricts({ postal: "DC", fips: "11" }, [{ fips: "11", district: "98" }]), {
    state: "DC",
    districts: ["00"],
  });
  assert.deepEqual(
    resolveDistricts(null, [
      { fips: "48", district: "33" },
      { fips: "48", district: "30" },
    ]),
    { state: "TX", districts: ["30", "33"] },
  );
  assert.equal(
    resolveDistricts(null, [
      { fips: "48", district: "30" },
      { fips: "21", district: "06" },
    ]),
    null,
  );
});

test("census lookup reads a ZCTA, drops the neighboring state, and caches", async () => {
  clearZipDistrictCache();
  let calls = 0;
  const fetchImpl: typeof fetch = async (input) => {
    calls += 1;
    const url = String(input);
    if (url.includes("/2/query")) {
      assert.match(url, /40502/);
      return Response.json({
        features: [
          {
            attributes: { ZCTA5: "40502", INTPTLAT: "+38.028", INTPTLON: "-084.504" },
            geometry: { rings: [[[-84.5, 38], [-84.4, 38], [-84.4, 38.1], [-84.5, 38]]] },
          },
        ],
      });
    }
    if (url.includes("/80/query")) {
      return Response.json({
        features: [{ attributes: { STATE: "21", STUSAB: "KY" } }],
      });
    }
    if (url.includes("/54/query")) {
      return Response.json({
        features: [
          { attributes: { STATE: "21", CD120: "06", GEOID: "2106" } },
          { attributes: { STATE: "47", CD120: "05", GEOID: "4705" } },
        ],
      });
    }
    throw new Error(`unexpected ${url}`);
  };

  const hit = await censusZipDistricts("40502", fetchImpl);
  assert.deepEqual(hit, { state: "KY", districts: ["06"] });
  const again = await censusZipDistricts("40502", fetchImpl);
  assert.deepEqual(again, hit);
  assert.equal(calls, 3);
  clearZipDistrictCache();
});

test("census lookup returns every district a ZIP overlaps", async () => {
  clearZipDistrictCache();
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/2/query")) {
      return Response.json({
        features: [
          {
            attributes: { INTPTLAT: "+32.787", INTPTLON: "-096.799" },
            geometry: { rings: [[[-96.8, 32.78], [-96.79, 32.78], [-96.79, 32.79], [-96.8, 32.78]]] },
          },
        ],
      });
    }
    if (url.includes("/80/query")) {
      return Response.json({
        features: [{ attributes: { STATE: "48", STUSAB: "TX" } }],
      });
    }
    return Response.json({
      features: [
        { attributes: { STATE: "48", CD120: "33", GEOID: "4833" } },
        { attributes: { STATE: "48", CD120: "30", GEOID: "4830" } },
      ],
    });
  };
  assert.deepEqual(await censusZipDistricts("75201", fetchImpl), {
    state: "TX",
    districts: ["30", "33"],
  });
  clearZipDistrictCache();
});

test("an empty ZCTA is a miss and a Census error is not cached", async () => {
  clearZipDistrictCache();
  let emptyCalls = 0;
  const empty: typeof fetch = async () => {
    emptyCalls += 1;
    return Response.json({ features: [] });
  };
  assert.equal(await censusZipDistricts("00000", empty), null);
  assert.equal(await censusZipDistricts("00000", empty), null);
  assert.equal(emptyCalls, 1);

  let failures = 0;
  const down: typeof fetch = async () => {
    failures += 1;
    return new Response("no", { status: 503 });
  };
  await assert.rejects(() => censusZipDistricts("40502", down), ZipLookupError);
  await assert.rejects(() => censusZipDistricts("40502", down), ZipLookupError);
  assert.equal(failures, 2);
  clearZipDistrictCache();
});

test("lookup route returns the frontend ZIP contract and stored races", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-senate-KY",
      office: "senate",
      cycle: 2026,
      state: "KY",
      title: "U.S. Senate, Kentucky",
      jurisdiction: "Kentucky",
    }),
  );
  await repo.upsertRace(
    race({
      raceId: "2026-house-KY-06",
      office: "house",
      cycle: 2026,
      state: "KY",
      district: "06",
      title: "U.S. House, Kentucky District 6",
      jurisdiction: "Kentucky District 6",
    }),
  );
  const response = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=40502&year=2026"),
    deps(repo, async () => ({ state: "KY", districts: ["06"] })),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.zip, "40502");
  assert.equal(body.year, 2026);
  assert.equal(body.state, "KY");
  assert.deepEqual(body.districts, [{ district: "06", raceId: "2026-house-KY-06" }]);
  assert.equal(body.senateRaceId, "2026-senate-KY");
  assert.deepEqual(body.raceIds, ["2026-senate-KY", "2026-house-KY-06"]);
  assert.deepEqual(
    body.races.map((item: Race) => item.raceId),
    ["2026-senate-KY", "2026-house-KY-06"],
  );
  assert.equal(body.races[1].district, "06");
});

test("a multi-district ZIP lists every race id and omits rows that are not stored", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace(
    race({
      raceId: "2026-house-TX-30",
      office: "house",
      cycle: 2026,
      state: "TX",
      district: "30",
      title: "U.S. House, Texas District 30",
      jurisdiction: "Texas District 30",
    }),
  );
  const response = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=75201&cycle=2026"),
    deps(repo, async () => ({ state: "TX", districts: ["33", "30"] })),
  );
  const body = await response.json();
  assert.deepEqual(body.districts, [
    { district: "30", raceId: "2026-house-TX-30" },
    { district: "33", raceId: "2026-house-TX-33" },
  ]);
  assert.equal(body.senateRaceId, "2026-senate-TX");
  assert.deepEqual(body.raceIds, ["2026-senate-TX", "2026-house-TX-30", "2026-house-TX-33"]);
  assert.deepEqual(
    body.races.map((item: Race) => item.raceId),
    ["2026-house-TX-30"],
  );
});

test("delegate districts use at-large 00 and have no Senate id", async () => {
  const response = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=20001&year=2026"),
    deps(new MemoryVoterRepository(), async () => ({ state: "DC", districts: ["00"] })),
  );
  const body = await response.json();
  assert.equal(body.state, "DC");
  assert.equal(body.senateRaceId, null);
  assert.deepEqual(body.districts, [{ district: "00", raceId: "2026-house-DC-00" }]);
  assert.deepEqual(body.raceIds, ["2026-house-DC-00"]);
  assert.deepEqual(body.races, []);
});

test("unknown and invalid ZIPs do not invent a district", async () => {
  const calls = deps(new MemoryVoterRepository(), async () => {
    throw new Error("lookup should not be called");
  });
  calls.repository = () => {
    throw new Error("repository should not be called");
  };
  const unauthenticated = await getZipLookup(
    new Request("https://voter.example/api/v1/lookup/zip?zip=40502&year=2026"),
    calls,
  );
  assert.equal(unauthenticated.status, 401);

  const invalid = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=4050&year=2026"),
    calls,
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "bad_request");

  let lookedUp = false;
  const missing = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=00000&year=2026"),
    deps(new MemoryVoterRepository(), async () => {
      lookedUp = true;
      return null;
    }),
  );
  assert.equal(lookedUp, true);
  assert.equal(missing.status, 404);
  const body = await missing.json();
  assert.equal(body.error, "not_found");
  assert.equal(typeof body.message, "string");
  assert.equal(JSON.stringify(body).includes("district\":"), false);

  const down = await getZipLookup(
    authed("https://voter.example/api/v1/lookup/zip?zip=40502&year=2026"),
    deps(new MemoryVoterRepository(), async () => {
      throw new ZipLookupError("Census district lookup timed out");
    }),
  );
  assert.equal(down.status, 503);
  assert.deepEqual(await down.json(), { error: "unavailable" });
});

test("openapi and llms.txt document ZIP lookup and the scoreboard fields", () => {
  const spec = openApiDocument("https://voter.example");
  assert.match(spec, /\/api\/v1\/lookup\/zip:/);
  assert.match(spec, /zip: "40502"/);
  assert.match(spec, /senateRaceId: "2026-senate-KY"/);
  assert.match(spec, /Plain scoreboard fields/);
  assert.match(spec, /no per-race `candidateCount`/);
  assert.equal(spec.includes("GOOGLE_CIVIC_API_KEY"), false);
  const text = llmsText({ origin: "https://voter.example", basePath: "" });
  assert.match(text, /\/api\/v1\/lookup\/zip\?zip=40502&year=2026/);
});
