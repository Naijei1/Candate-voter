import assert from "node:assert/strict";
import test from "node:test";
import { cycleCalendar, isMidtermCycle, isPresidentialElectionYear } from "../src/lib/data/calendar";
import {
  cyclesFromEnv,
  defaultCycles,
  formatCycleList,
  parseCycle,
  resolveCycle,
} from "../src/lib/data/cycles";

const now = new Date("2026-10-26T12:00:00.000Z");

test("default cycle window covers the previous year through six years ahead", () => {
  assert.deepEqual(defaultCycles(now), [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]);
});

test("CANDATE_CYCLES overrides the window and drops years outside 1980–2100", () => {
  assert.deepEqual(
    cyclesFromEnv({ CANDATE_CYCLES: "2028, 2026, nope, 1979, 2101, 2026" }, now),
    [2026, 2028],
  );
});

test("an empty CANDATE_CYCLES value keeps the default window", () => {
  assert.deepEqual(cyclesFromEnv({ CANDATE_CYCLES: "  " }, now), defaultCycles(now));
});

test("parseCycle accepts the same year range as CANDATE_CYCLES", () => {
  assert.equal(parseCycle(" 2026 "), 2026);
  assert.equal(parseCycle("1979"), null);
  assert.equal(parseCycle("2101"), null);
  assert.equal(parseCycle("2026.5"), null);
  assert.equal(parseCycle("nope"), null);
});

test("resolveCycle prefers the requested year, then the current UTC year", () => {
  const cycles = [2025, 2026, 2027, 2028];
  assert.equal(resolveCycle(cycles, "2028", now), 2028);
  assert.equal(resolveCycle(cycles, "1999", now), 2026);
  assert.equal(resolveCycle(cycles, undefined, now), 2026);
  assert.equal(resolveCycle([], "2026", now), null);
  assert.equal(resolveCycle([2024, 2030], undefined, now), 2024);
});

test("formatCycleList collapses a contiguous span", () => {
  assert.equal(formatCycleList([]), "none");
  assert.equal(formatCycleList([2026]), "2026");
  assert.equal(formatCycleList([2028, 2026, 2027]), "2026–2028");
  assert.equal(formatCycleList([2026, 2028]), "2026, 2028");
});

test("midterm cycles have no presidential general election", () => {
  assert.equal(isPresidentialElectionYear(2028), true);
  assert.equal(isPresidentialElectionYear(2024), true);
  assert.equal(isMidtermCycle(2026), true);
  assert.equal(isMidtermCycle(2022), true);
  assert.equal(isMidtermCycle(2028), false);
  assert.equal(isMidtermCycle(2025), false);
  assert.deepEqual(cycleCalendar(2026).onBallot, ["senate", "house"]);
  assert.equal(cycleCalendar(2026).presidentialGeneralElection, false);
  assert.match(cycleCalendar(2026).note ?? "", /out-of-cycle/);
  assert.deepEqual(cycleCalendar(2028).onBallot, ["president", "senate", "house"]);
  assert.equal(cycleCalendar(2028).note, null);
});
