/** Selected place. A street address is never part of this record. */

export const PLACE_STORAGE_KEY = "candate-place";

export type PlaceSelection = {
  state: string | null;
  year: number | null;
  zip: string | null;
  district: string | null;
};

export function emptyPlace(): PlaceSelection {
  return { state: null, year: null, zip: null, district: null };
}

export function sanitizePlace(value: unknown): PlaceSelection {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const state = typeof record.state === "string" && /^[A-Za-z]{2}$/.test(record.state) ? record.state.toUpperCase() : null;
  const yearValue = typeof record.year === "number" ? record.year : Number(record.year);
  const year = Number.isInteger(yearValue) && yearValue >= 2020 && yearValue <= 2036 ? yearValue : null;
  const zip = typeof record.zip === "string" && /^\d{5}$/.test(record.zip) ? record.zip : null;
  const district =
    typeof record.district === "string" && /^\d{2}$/.test(record.district) ? record.district : null;
  return { state, year, zip, district };
}

export function readPlaceParams(params: URLSearchParams): PlaceSelection {
  return sanitizePlace({
    state: params.get("state"),
    year: params.get("year"),
    zip: params.get("zip"),
    district: params.get("district"),
  });
}

export function hasPlace(place: PlaceSelection): boolean {
  return Boolean(place.state || place.year || place.zip || place.district);
}

/** A saved ZIP stays off the landing page so `/` does not bounce to `/ballot`. */
export function restoresStoredPlace(pathname: string): boolean {
  return pathname !== "/";
}

export function mergePlace(base: PlaceSelection, next: PlaceSelection): PlaceSelection {
  return {
    state: next.state ?? base.state,
    year: next.year ?? base.year,
    zip: next.zip ?? base.zip,
    district: next.district ?? base.district,
  };
}

export function placeSearch(place: PlaceSelection): string {
  const params = new URLSearchParams();
  if (place.state) params.set("state", place.state);
  if (place.year) params.set("year", String(place.year));
  if (place.zip) params.set("zip", place.zip);
  if (place.district) params.set("district", place.district);
  return params.toString();
}

export function withPlace(path: string, place: PlaceSelection): string {
  const query = placeSearch(place);
  if (!query) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${query}`;
}
