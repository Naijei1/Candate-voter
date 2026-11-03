"use server";

import { congressionalDistricts } from "./congressional-district";

/**
 * Ask the Census geocoder which congressional district contains an address.
 * The street is not stored and is not part of the return value.
 */

const GEOCODER =
  "https://geocoding.geo.census.gov/geocoder/geographies/address";

const COORDINATES = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

/** Congressional district for a point. The coordinates are not stored. */
export async function districtFromPoint(input: {
  latitude: number;
  longitude: number;
}): Promise<{ ok: true; district: string } | { ok: false; message: string }> {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, message: "Location was not available." };
  }
  const url = new URL(COORDINATES);
  url.searchParams.set("x", String(input.longitude));
  url.searchParams.set("y", String(input.latitude));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("layers", "54");
  url.searchParams.set("format", "json");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) return { ok: false, message: "Location could not be matched. It was not saved." };
    const body = (await response.json()) as {
      result?: { geographies?: Record<string, Array<{ CD120?: string; STATE?: string }>> };
    };
    const layers = body.result?.geographies ?? {};
    let district = "";
    let state = "";
    for (const [name, rows] of Object.entries(layers)) {
      if (!/congressional district/i.test(name) || !Array.isArray(rows)) continue;
      const row = rows[0];
      if (row?.CD120 && /^\d{2}$/.test(row.CD120)) district = row.CD120;
      if (row?.STATE) state = row.STATE;
    }
    if (state && state !== "21") return { ok: false, message: "That location is outside Kentucky." };
    if (!district) return { ok: false, message: "Location could not be matched. It was not saved." };
    return { ok: true, district };
  } catch {
    return { ok: false, message: "Location could not be matched. It was not saved." };
  }
}

export async function districtFromAddress(input: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<{ ok: true; district: string } | { ok: false; message: string }> {
  const street = input.street.trim();
  const city = input.city.trim();
  const state = input.state.trim().toUpperCase();
  const zip = input.zip.trim();
  if (street.length < 3 || street.length > 80 || city.length > 40 || !/^[A-Z]{2}$/.test(state) || !/^\d{5}$/.test(zip)) {
    return { ok: false, message: "Enter a street, city, state, and ZIP. The address is not saved." };
  }
  const url = new URL(GEOCODER);
  url.searchParams.set("street", street);
  url.searchParams.set("city", city);
  url.searchParams.set("state", state);
  url.searchParams.set("zip", zip);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("layers", "54");
  url.searchParams.set("format", "json");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) return { ok: false, message: "The address could not be matched. The address was not saved." };
    const body = (await response.json()) as unknown;
    const districts = congressionalDistricts(body);
    if (districts.length === 0) {
      return { ok: false, message: "The address could not be matched. The address was not saved." };
    }
    if (new Set(districts).size > 1) {
      return { ok: false, message: "That address still matches more than one district. Choose one below. The address was not saved." };
    }
    return { ok: true, district: districts[0] ?? "" };
  } catch {
    return { ok: false, message: "The address could not be matched. The address was not saved." };
  }
}
