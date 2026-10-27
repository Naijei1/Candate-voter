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
