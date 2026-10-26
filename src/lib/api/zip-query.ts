import { parseCycle } from "../data/cycles";

export type ZipLookupQuery = {
  zip: string;
  year: number;
};

export type ZipQueryResult =
  | { ok: true; query: ZipLookupQuery }
  | { ok: false; message: string };

const ZIP = /^\d{5}$/;
const ZIP_PLUS_4 = /^(\d{5})-\d{4}$/;

function one(
  url: URL,
  name: string,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) {
    return { ok: false, message: `${name} must be a single value` };
  }
  const value = values[0];
  if (value == null) return { ok: true, value: null };
  const trimmed = value.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

/**
 * `year` is the election year. `cycle` is the same value, matching the other
 * `/api/v1` routes. When both are present they must be equal.
 */
export function parseZipLookupQuery(url: URL): ZipQueryResult {
  const zip = one(url, "zip");
  if (!zip.ok) return zip;
  const year = one(url, "year");
  if (!year.ok) return year;
  const cycle = one(url, "cycle");
  if (!cycle.ok) return cycle;

  if (zip.value == null) return { ok: false, message: "zip is required" };
  const zipMatch = ZIP_PLUS_4.exec(zip.value);
  const zipCode = zipMatch?.[1] ?? zip.value;
  if (!ZIP.test(zipCode)) {
    return { ok: false, message: "zip must be a 5-digit ZIP code" };
  }

  if (year.value == null && cycle.value == null) {
    return { ok: false, message: "year is required" };
  }

  const parsedYear = year.value == null ? null : parseCycle(year.value);
  if (year.value != null && parsedYear == null) {
    return { ok: false, message: "year must be an integer from 1980 to 2100" };
  }
  const parsedCycle = cycle.value == null ? null : parseCycle(cycle.value);
  if (cycle.value != null && parsedCycle == null) {
    return { ok: false, message: "cycle must be an integer from 1980 to 2100" };
  }
  if (parsedYear != null && parsedCycle != null && parsedYear !== parsedCycle) {
    return { ok: false, message: "year and cycle must match" };
  }
  const resolved = parsedYear ?? parsedCycle;
  if (resolved == null) return { ok: false, message: "year is required" };

  return { ok: true, query: { zip: zipCode, year: resolved } };
}
