import { cyclesFromEnv, parseCycle } from "../data/cycles";
import { isPostalState } from "../data/states";
import type { FederalOffice } from "../types";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const CURSOR = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type RaceListQuery = {
  cycles: number[];
  state: string | null;
  office: FederalOffice | null;
  limit: number;
  cursor: string | null;
};

export type RaceQueryResult =
  | { ok: true; query: RaceListQuery }
  | { ok: false; message: string };

function one(
  url: URL,
  name: string,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) {
    return { ok: false, message: `${name} must be a single value` };
  }
  return { ok: true, value: values[0] ?? null };
}

function readYear(
  value: string | null,
  name: "year" | "cycle",
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (value.trim() === "") {
    return { ok: false, message: `${name} must be an integer from 1980 to 2100` };
  }
  const parsed = parseCycle(value);
  if (parsed == null) {
    return { ok: false, message: `${name} must be an integer from 1980 to 2100` };
  }
  return { ok: true, value: parsed };
}

function parseOffice(value: string): FederalOffice | null {
  const office = value.trim().toLowerCase();
  if (office === "president" || office === "senate" || office === "house") {
    return office;
  }
  return null;
}

export function parseRaceListQuery(
  url: URL,
  env: Record<string, string | undefined>,
  now: Date = new Date(),
): RaceQueryResult {
  const cycle = one(url, "cycle");
  if (!cycle.ok) return cycle;
  const year = one(url, "year");
  if (!year.ok) return year;
  const state = one(url, "state");
  if (!state.ok) return state;
  const office = one(url, "office");
  if (!office.ok) return office;
  const limit = one(url, "limit");
  if (!limit.ok) return limit;
  const cursor = one(url, "cursor");
  if (!cursor.ok) return cursor;

  const cycleResult = readYear(cycle.value, "cycle");
  if (!cycleResult.ok) return cycleResult;
  const yearResult = readYear(year.value, "year");
  if (!yearResult.ok) return yearResult;
  if (
    cycleResult.value != null &&
    yearResult.value != null &&
    cycleResult.value !== yearResult.value
  ) {
    return { ok: false, message: "year and cycle must match" };
  }

  let cycles: number[];
  const selected = yearResult.value ?? cycleResult.value;
  if (selected == null) {
    cycles = cyclesFromEnv(env, now);
  } else {
    cycles = [selected];
  }

  let stateCode: string | null = null;
  if (state.value != null) {
    const normalized = state.value.trim().toUpperCase();
    if (!isPostalState(normalized)) {
      return { ok: false, message: "state must be a two-letter postal code" };
    }
    stateCode = normalized;
  }

  let officeCode: FederalOffice | null = null;
  if (office.value != null) {
    const parsed = parseOffice(office.value);
    if (!parsed) {
      return {
        ok: false,
        message: "office must be president, senate, or house",
      };
    }
    officeCode = parsed;
  }

  let pageSize = DEFAULT_LIMIT;
  if (limit.value != null) {
    if (!/^\d+$/.test(limit.value.trim())) {
      return { ok: false, message: "limit must be an integer from 1 to 100" };
    }
    pageSize = Number(limit.value.trim());
    if (pageSize < 1 || pageSize > MAX_LIMIT) {
      return { ok: false, message: "limit must be an integer from 1 to 100" };
    }
  }

  let cursorId: string | null = null;
  if (cursor.value != null) {
    const token = cursor.value.trim();
    if (!CURSOR.test(token)) {
      return { ok: false, message: "cursor is invalid" };
    }
    cursorId = token;
  }

  return {
    ok: true,
    query: {
      cycles,
      state: stateCode,
      office: officeCode,
      limit: pageSize,
      cursor: cursorId,
    },
  };
}
