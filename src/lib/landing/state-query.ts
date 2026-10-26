import { isPostalState } from "../data/states";

/**
 * State to paint on the first client frame.
 * The URL wins when it has a postal code, including when the server prop
 * has not caught up. Otherwise the server `initialState` stands.
 */
export function selectionFromLocation(search: string, initialState: string | null): string | null {
  return postalFromSearch(search) ?? initialState;
}

/** Back/forward reads only the URL, so a history entry without `state` clears the map. */
export function selectionFromPop(search: string): string | null {
  return postalFromSearch(search);
}

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
