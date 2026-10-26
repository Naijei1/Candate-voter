import assert from "node:assert/strict";
import test from "node:test";
import { cyclesFromEnv, defaultCycles, formatCycleList, parseCycle } from "../src/lib/data/cycles";

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

test("formatCycleList collapses a contiguous span", () => {
  assert.equal(formatCycleList([]), "none");
  assert.equal(formatCycleList([2026]), "2026");
  assert.equal(formatCycleList([2028, 2026, 2027]), "2026–2028");
  assert.equal(formatCycleList([2026, 2028]), "2026, 2028");
});
