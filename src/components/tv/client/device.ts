"use client";

/** Small helpers for things saved on this device. Nothing here leaves the browser. */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = JSON.parse(raw) as T;
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the page still works without it.
  }
}

export type Place = { c: string; d: number[]; t: number };

const PLACE_TTL = 90 * 864e5;
export const PLACE_EVENT = "tv:place";

export function readPlace(): Place | null {
  const place = readJson<Place | null>("tv-place", null);
  if (!place || !place.c || !Array.isArray(place.d) || Date.now() - place.t >= PLACE_TTL) return null;
  return place;
}

export function savePlace(county: string, districts: number[]) {
  writeJson("tv-place", { c: county, d: districts, t: Date.now() });
  window.dispatchEvent(new Event(PLACE_EVENT));
}

export function placeName(place: Place): string {
  const label = place.d.length > 1 ? `Districts ${place.d.join(" and ")}` : `District ${place.d[0]}`;
  return `${place.c} County, ${label}`;
}

export function placeHref(place: Place | null): string {
  return place ? `/ballot?county=${encodeURIComponent(place.c)}` : "/ballot";
}

export const SAVED_EVENT = "tv:saved";

export function savedKeys(): string[] {
  return readJson<string[]>("tv-saved", []);
}

export function savedNames(): Record<string, string> {
  return readJson<Record<string, string>>("tv-saved-names", {});
}

export function toggleSaved(key: string, label: string): boolean {
  const keys = savedKeys();
  const on = keys.includes(key);
  const names = savedNames();
  names[key] = label;
  writeJson("tv-saved-names", names);
  writeJson("tv-saved", on ? keys.filter((item) => item !== key) : [...keys, key]);
  window.dispatchEvent(new Event(SAVED_EVENT));
  return !on;
}

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("tv:toast", { detail: message }));
}

export type ReportTarget = { candidateId?: string; page?: string };

export function openReport(target: ReportTarget = {}) {
  window.dispatchEvent(new CustomEvent("tv:report", { detail: target }));
}
