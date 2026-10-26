import { houseContestJurisdiction, houseContestTitle } from "@/lib/data/at-large";
import { isPostalState, stateName } from "@/lib/data/states";
import type { FederalOffice, Race } from "@/lib/types";

const ZIP = /^(\d{5})(?:-\d{4})?$/;
const SENATE_ID = /^(\d{4})-senate-([A-Z]{2})$/;
const HOUSE_ID = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/;
const RACE_ID = /^(\d{4})-(president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})$/;

export type ZipDistrict = {
  district: string;
  raceId: string;
};

/** Body of `GET /api/v1/lookup/zip`. Geography comes from that response only. */
export type ZipLookupPayload = {
  zip: string;
  year: number;
  state: string | null;
  districts: ZipDistrict[];
  senateRaceId: string | null;
  raceIds: string[];
  races: Race[];
};

export type ZipLookupFailureReason =
  | "timeout"
  | "unavailable"
  | "not_found"
  | "bad_request"
  | "bad_response";

export type ZipLookupResult =
  | { ok: true; payload: ZipLookupPayload }
  | { ok: false; reason: ZipLookupFailureReason; message: string | null };

export type ZipRaceSlot = {
  raceId: string;
  office: "senate" | "house";
  district: string | null;
  /** Stored race from the page index or the lookup `races` array. */
  race: Race | null;
};

/** Five-digit ZIP. ZIP+4 keeps the first five digits, matching the API. */
export function normalizeZip(input: string): string | null {
  const match = ZIP.exec(input.trim());
  return match?.[1] ?? null;
}

export function zipLookupErrorCopy(result: Extract<ZipLookupResult, { ok: false }>): string {
  if (result.reason === "not_found") {
    return result.message ?? "No House district is published for that ZIP.";
  }
  if (result.reason === "bad_request") {
    return result.message ?? "Enter a 5-digit ZIP code.";
  }
  if (result.reason === "timeout") return "That lookup took too long.";
  if (result.reason === "bad_response") return "The lookup didn't return races we can show.";
  return "ZIP lookup isn't available right now.";
}

/** Accept a lookup body. Invalid districts are dropped, never filled in. */
export function parseZipLookup(value: unknown): ZipLookupPayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.zip !== "string") return null;
  const zip = normalizeZip(row.zip);
  if (!zip) return null;
  if (typeof row.year !== "number" || !Number.isInteger(row.year)) return null;
  if (row.year < 1980 || row.year > 2100) return null;

  let state: string | null = null;
  if (typeof row.state === "string") {
    const postal = row.state.trim().toUpperCase();
    if (!isPostalState(postal)) return null;
    state = postal;
  } else if (row.state != null) {
    return null;
  }

  if (!Array.isArray(row.districts)) return null;
  const districts: ZipDistrict[] = [];
  for (const item of row.districts) {
    if (!item || typeof item !== "object") continue;
    const district = (item as { district?: unknown }).district;
    const raceId = (item as { raceId?: unknown }).raceId;
    if (typeof district !== "string" || district.trim().length === 0) continue;
    if (typeof raceId !== "string" || !RACE_ID.test(raceId)) continue;
    districts.push({ district: district.trim(), raceId });
  }

  let senateRaceId: string | null = null;
  if (typeof row.senateRaceId === "string") {
    if (!SENATE_ID.test(row.senateRaceId)) return null;
    senateRaceId = row.senateRaceId;
  } else if (row.senateRaceId != null) {
    return null;
  }

  if (!Array.isArray(row.raceIds)) return null;
  const raceIds: string[] = [];
  for (const id of row.raceIds) {
    if (typeof id !== "string" || !RACE_ID.test(id)) continue;
    raceIds.push(id);
  }

  if (row.races != null && !Array.isArray(row.races)) return null;
  const races: Race[] = [];
  if (Array.isArray(row.races)) {
    for (const item of row.races) {
      const race = parseRace(item);
      if (race) races.push(race);
    }
  }

  return { zip, year: row.year, state, districts, senateRaceId, raceIds, races };
}

/**
 * Senate, then each House district the lookup returned.
 * A stored row supplies the title. Missing rows stay empty of candidates.
 */
export function zipRaceSlots(
  loaded: readonly Race[],
  payload: ZipLookupPayload,
): ZipRaceSlot[] {
  const stored = new Map<string, Race>();
  for (const race of loaded) stored.set(race.raceId, race);
  for (const race of payload.races) {
    if (!stored.has(race.raceId)) stored.set(race.raceId, race);
  }
  const districtByRace = new Map(payload.districts.map((item) => [item.raceId, item.district]));
  const ids =
    payload.raceIds.length > 0
      ? payload.raceIds
      : [
          ...(payload.senateRaceId ? [payload.senateRaceId] : []),
          ...payload.districts.map((item) => item.raceId),
        ];

  const slots: ZipRaceSlot[] = [];
  const seen = new Set<string>();
  for (const raceId of ids) {
    if (seen.has(raceId)) continue;
    const known = stored.get(raceId) ?? null;
    const office = slotOffice(raceId, known);
    if (!office) continue;
    seen.add(raceId);
    const district =
      office === "house" ? (districtByRace.get(raceId) ?? known?.district ?? districtFromId(raceId)) : null;
    if (office === "house" && !district) continue;
    slots.push({ raceId, office, district, race: known });
  }
  return slots;
}

export function zipSlotTitle(slot: ZipRaceSlot, state: string | null): string {
  if (slot.race?.title) return slot.race.title;
  if (slot.office === "senate") {
    return state ? `U.S. Senate, ${stateName(state)}` : "U.S. Senate";
  }
  if (slot.district && state) return houseContestTitle(state, slot.district);
  return "U.S. House";
}

export function zipSlotJurisdiction(slot: ZipRaceSlot, state: string | null): string | null {
  if (slot.race?.jurisdiction) return slot.race.jurisdiction;
  if (!state) return null;
  if (slot.office === "senate") return stateName(state);
  if (slot.district) return houseContestJurisdiction(state, slot.district);
  return null;
}

function slotOffice(raceId: string, known: Race | null): "senate" | "house" | null {
  if (known?.office === "senate" || known?.office === "house") return known.office;
  if (known?.office === "president") return null;
  if (SENATE_ID.test(raceId)) return "senate";
  if (HOUSE_ID.test(raceId)) return "house";
  return null;
}

function districtFromId(raceId: string): string | null {
  return HOUSE_ID.exec(raceId)?.[3] ?? null;
}

function parseRace(value: unknown): Race | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.raceId !== "string" || !RACE_ID.test(row.raceId)) return null;
  if (!isOffice(row.office)) return null;
  if (typeof row.title !== "string" || row.title.trim().length === 0) return null;
  const state = typeof row.state === "string" && isPostalState(row.state) ? row.state : null;
  return {
    raceId: row.raceId,
    office: row.office,
    cycle: typeof row.cycle === "number" ? row.cycle : null,
    state,
    district: typeof row.district === "string" ? row.district : null,
    title: row.title.trim(),
    jurisdiction: typeof row.jurisdiction === "string" ? row.jurisdiction : "",
    sourceUrl: typeof row.sourceUrl === "string" ? row.sourceUrl : null,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null,
  };
}

function isOffice(value: unknown): value is FederalOffice {
  return value === "president" || value === "senate" || value === "house";
}
