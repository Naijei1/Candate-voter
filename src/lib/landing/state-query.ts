import { isPostalState } from "../data/states";
import { normalizeZip } from "../lookup/zip-view";

/** Postal code in `?state=`, or null when the query has none. */
export function postalFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get("state")?.trim().toUpperCase() ?? "";
  return isPostalState(value) ? value : null;
}

/**
 * Query string with `state` set. Other parameters, including `year`, stay.
 * The result always includes the leading `?` when it is non-empty.
 */
export function searchWithState(search: string, postal: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("state", postal.trim().toUpperCase());
  params.delete("zip");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Postal to paint on the country map.
 * A `state` query wins. Back that drops `state` keeps the last selection,
 * so the ZIP field and the highlight still refer to the same state.
 */
export function highlightedPostal(urlPostal: string | null, remembered: string | null): string | null {
  return urlPostal ?? remembered;
}

/** Five-digit ZIP in `?zip=`, or null when the query has none. */
export function zipFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeZip(params.get("zip") ?? "");
}

/**
 * State page opened from a ZIP lookup. `state` and `zip` are both set.
 * Other parameters, including `year`, stay.
 */
export function searchWithZip(search: string, postal: string, zip: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = postal.trim().toUpperCase();
  const normalized = normalizeZip(zip);
  if (!isPostalState(code) || !normalized) return search.startsWith("?") || search === "" ? search : `?${search}`;
  params.set("state", code);
  params.set("zip", normalized);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type MapContext = {
  year?: number | string | null;
  state?: string | null;
  zip?: string | null;
};

/**
 * Keep year, state, and zip on a path. Zip is kept only with a real state,
 * because a ZIP view is the state map for that code.
 * A hash on `path` stays after the query.
 */
export function withPreservedQuery(path: string, query: MapContext): string {
  const params = new URLSearchParams();
  const year = query.year == null ? "" : String(query.year).trim();
  if (/^\d{4}$/.test(year)) params.set("year", year);
  const state = query.state?.trim().toUpperCase() ?? "";
  if (isPostalState(state)) params.set("state", state);
  const zip = normalizeZip(query.zip ?? "");
  if (zip && isPostalState(state)) params.set("zip", zip);
  const hashAt = path.indexOf("#");
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const base = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const serialized = params.toString();
  return serialized ? `${base}?${serialized}${hash}` : `${base}${hash}`;
}

/** Home URL for Back to map, including state and zip when they are present. */
export function mapHomeHref(query: MapContext): string {
  return withPreservedQuery("/", query);
}

/** Query string with `state` removed. Other parameters, including `year`, stay. */
export function searchWithoutState(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("state");
  params.delete("zip");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Home year change. On `/`, the current query (including `state`) is kept.
 * Other paths return to the home index for that year.
 */
export function yearNavigationHref(pathname: string, search: string, year: number): string {
  if (pathname !== "/") return `/?year=${encodeURIComponent(String(year))}`;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("year", String(year));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
