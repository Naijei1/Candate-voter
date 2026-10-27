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

/** Session key for a state the ZIP lookup applied. A manual pick clears it. */
export const ZIP_OWNED_STATE_KEY = "candate-zip-state";

type ZipOwnedStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Postal a ZIP lookup applied, or null when the stored value is missing or not a state. */
export function readZipOwnedState(storage: Pick<Storage, "getItem">): string | null {
  try {
    const value = storage.getItem(ZIP_OWNED_STATE_KEY)?.trim().toUpperCase() ?? "";
    return isPostalState(value) ? value : null;
  } catch {
    return null;
  }
}

/** Remember or forget the ZIP-applied state. Storage failures leave the in-memory flag alone. */
export function writeZipOwnedState(storage: ZipOwnedStorage, postal: string | null): void {
  try {
    const code = postal?.trim().toUpperCase() ?? "";
    if (isPostalState(code)) storage.setItem(ZIP_OWNED_STATE_KEY, code);
    else storage.removeItem(ZIP_OWNED_STATE_KEY);
  } catch {
    // Private mode and disabled storage still have the in-memory flag.
  }
}

/** Query string with `state` removed. Other parameters, including `year`, stay. */
export function searchWithoutState(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("state");
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
