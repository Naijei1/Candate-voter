import assert from "node:assert/strict";
import test from "node:test";
import { executeChatTool } from "../src/lib/chat/tools";
import { HOUSE_SEATS, HOUSE_SEATS_TOTAL } from "../src/lib/data/at-large";
import { houseCoverageForRaces } from "../src/lib/data/coverage";
import { appendExpectedRaces, expectedRaceById } from "../src/lib/data/expected-races";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import {
  regularSenateClass,
  senateSeatUp,
  statesInSenateClass,
} from "../src/lib/data/senate-classes";
import { visibleRaces } from "../src/lib/data/view";
import type { Race } from "../src/lib/types";

const updatedAt = "2026-10-26T05:00:00.000Z";

function race(partial: Pick<Race, "raceId" | "office" | "cycle" | "title"> & Partial<Race>): Race {
  return {
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/candidates/",
    updatedAt,
    ...partial,
  };
}

test("senate classes partition the 50 states and follow the six-year calendar", () => {
  assert.equal(statesInSenateClass(1).length, 33);
  assert.equal(statesInSenateClass(2).length, 33);
  assert.equal(statesInSenateClass(3).length, 34);
  const states = Object.keys(HOUSE_SEATS);
  assert.equal(states.length, 50);
  for (const state of states) {
    const classes = ([1, 2, 3] as const).filter((senateClass) =>
      statesInSenateClass(senateClass).includes(state),
    );
    assert.deepEqual(classes.length, 2, state);
  }
  assert.equal(regularSenateClass(2024), 1);
  assert.equal(regularSenateClass(2026), 2);
  assert.equal(regularSenateClass(2028), 3);
  assert.equal(regularSenateClass(2030), 1);
  assert.equal(regularSenateClass(2025), null);
  assert.equal(senateSeatUp("KY", 2026), true);
  assert.equal(senateSeatUp("WY", 2026), true);
  assert.equal(senateSeatUp("NY", 2026), false);
  assert.equal(senateSeatUp("CA", 2026), false);
  assert.equal(senateSeatUp("NY", 2028), true);
  assert.equal(senateSeatUp("WY", 2028), false);
  assert.equal(senateSeatUp("CA", 2030), true);
  assert.equal(senateSeatUp("KY", 2024), false);
});

test("even-year lists include every House district and only in-cycle Senate seats", () => {
  const ky = appendExpectedRaces([], [2026], { state: "KY" });
  assert.deepEqual(
    ky.filter((item) => item.office === "house").map((item) => item.district),
    ["01", "02", "03", "04", "05", "06"],
  );
  assert.equal(ky.filter((item) => item.office === "senate").map((item) => item.raceId).join(), "2026-senate-KY");
  assert.equal(ky.every((item) => item.empty === true && item.updatedAt == null), true);
  const coverage = houseCoverageForRaces(ky, [2026], "KY");
  assert.deepEqual(coverage, [
    { cycle: 2026, state: "KY", districtsWithFilings: 0, districtsTotal: 6 },
  ]);
  assert.equal(
    ky.filter((item) => item.office === "house").length,
    coverage[0]?.districtsTotal,
  );

  const filed = race({
    raceId: "2026-house-KY-04",
    office: "house",
    cycle: 2026,
    state: "KY",
    district: "04",
    title: "U.S. House, Kentucky District 4",
    jurisdiction: "Kentucky District 4",
  });
  const withFiling = appendExpectedRaces([filed], [2026], { state: "KY" });
  assert.equal(withFiling.filter((item) => item.office === "house").length, HOUSE_SEATS.KY);
  assert.equal(withFiling.find((item) => item.raceId === "2026-house-KY-04")?.empty, undefined);
  assert.equal(withFiling.find((item) => item.raceId === "2026-house-KY-01")?.empty, true);
  assert.equal(houseCoverageForRaces(withFiling, [2026], "KY")[0]?.districtsWithFilings, 1);

  const wy = appendExpectedRaces([], [2026], { state: "WY" });
  const atLarge = wy.find((item) => item.office === "house");
  assert.equal(atLarge?.raceId, "2026-house-WY-00");
  assert.equal(atLarge?.district, "00");
  assert.equal(atLarge?.title, "U.S. House, Wyoming at-large");
  assert.equal(wy.some((item) => item.raceId === "2026-senate-WY"), true);

  const ny = appendExpectedRaces([], [2026], { state: "NY" });
  assert.equal(ny.some((item) => item.office === "senate"), false);
  assert.equal(ny.filter((item) => item.office === "house").length, 26);

  const special = appendExpectedRaces(
    [
      race({
        raceId: "2026-senate-NY",
        office: "senate",
        cycle: 2026,
        state: "NY",
        title: "U.S. Senate, New York",
        jurisdiction: "New York",
      }),
    ],
    [2026],
    { state: "NY" },
  );
  const senates = special.filter((item) => item.office === "senate");
  assert.equal(senates.length, 1);
  assert.equal(senates[0]?.empty, undefined);

  assert.equal(appendExpectedRaces([], [2025], { state: "KY" }).length, 0);
  assert.equal(appendExpectedRaces([], [2028], { state: "WY" }).some((item) => item.office === "senate"), false);
  assert.equal(expectedRaceById("2026-house-CA-99"), null);
  assert.equal(expectedRaceById("2026-senate-NY"), null);
  assert.equal(expectedRaceById("2025-house-KY-01"), null);
  assert.equal(expectedRaceById("2026-house-WY-01")?.raceId, "2026-house-WY-00");
  assert.equal(expectedRaceById("2028-senate-NY")?.empty, true);

  const folded = appendExpectedRaces(
    visibleRaces([
      race({
        raceId: "2026-house-WY-01",
        office: "house",
        cycle: 2026,
        state: "WY",
        district: "01",
        title: "U.S. House, Wyoming District 1",
      }),
    ]),
    [2026],
    { state: "WY" },
  );
  assert.equal(folded.filter((item) => item.office === "house").length, 1);
  assert.equal(folded.find((item) => item.office === "house")?.raceId, "2026-house-WY-00");
  assert.notEqual(folded.find((item) => item.office === "house")?.empty, true);

  const texas = appendExpectedRaces(
    [
      race({
        raceId: "2026-house-TX-00",
        office: "house",
        cycle: 2026,
        state: "TX",
        district: "00",
        title: "U.S. House, Texas at-large",
        jurisdiction: "Texas at-large",
      }),
    ],
    [2026],
    { state: "TX" },
  );
  const texasHouse = texas.filter((item) => item.office === "house");
  assert.equal(texasHouse.length, HOUSE_SEATS.TX);
  assert.equal(texasHouse.some((item) => item.raceId === "2026-house-TX-00"), false);
  assert.equal(expectedRaceById("2026-house-TX-00"), null);
  assert.equal(visibleRaces(texas).some((item) => item.raceId === "2026-house-TX-00"), false);

  const national = houseCoverageForRaces(appendExpectedRaces([], [2026]), [2026], null);
  assert.deepEqual(national, [
    { cycle: 2026, state: null, districtsWithFilings: 0, districtsTotal: HOUSE_SEATS_TOTAL },
  ]);
});

test("chat list_races returns the state slate and does not invent an off-cycle Senate race", async () => {
  const repo = new MemoryVoterRepository();
  const ctx = {
    repo,
    env: {},
    now: new Date("2026-10-26T12:00:00.000Z"),
    root: "https://voter.example",
  };
  const wy = await executeChatTool("list_races", { state: "WY", cycle: 2026 }, ctx);
  assert.equal(wy.ok, true);
  if (!wy.ok) return;
  const wyIds = (wy.content.races as Race[]).map((item) => item.raceId);
  assert.deepEqual(wyIds.sort(), ["2026-house-WY-00", "2026-senate-WY"]);
  assert.deepEqual(wy.content.coverage && (wy.content.coverage as { house: unknown }).house, [
    { cycle: 2026, state: "WY", districtsWithFilings: 0, districtsTotal: 1 },
  ]);
  for (const source of wy.sources) {
    assert.equal(/^\d{4}-/.test(source.title), false);
    assert.equal(typeof source.as_of, "string");
  }

  const ny = await executeChatTool("list_races", { state: "NY", cycle: 2026 }, ctx);
  assert.equal(ny.ok, true);
  if (!ny.ok) return;
  const nyRaces = ny.content.races as Race[];
  assert.equal(nyRaces.some((item) => item.office === "senate"), false);
  assert.equal(nyRaces.filter((item) => item.office === "house").length, 26);

  const missing = await executeChatTool("get_race", { raceId: "2026-senate-NY" }, ctx);
  assert.equal(missing.ok, true);
  if (!missing.ok) return;
  assert.equal(missing.content.race, null);

  const stub = await executeChatTool("get_race", { raceId: "2026-house-KY-03" }, ctx);
  assert.equal(stub.ok, true);
  if (!stub.ok) return;
  const body = stub.content.race as Race;
  assert.equal(body.empty, true);
  assert.equal(body.title, "U.S. House, Kentucky District 3");
  assert.deepEqual(stub.content.candidates, []);
});
