import { HOUSE_SEATS, canonicalDistrict, isSingleSeat } from "../data/at-large";
import { isPostalState } from "../data/states";

/**
 * ZIP → congressional districts for the 2026 maps (120th Congress).
 *
 * Census TIGERweb is public and needs no API key. A ZIP Code Tabulation
 * Area can overlap more than one district, so the lookup intersects the
 * ZCTA boundary with the 120th Congressional District layer and keeps every
 * district in the state that contains the ZCTA internal point. A point
 * geocode would hide the extra districts.
 *
 * Results are cached in memory on this server process. The Census calls
 * share a deadline under the client timeout.
 */

const TIGER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer";
const ZCTA_LAYER = 2;
const CD_LAYER = 54;
const STATE_LAYER = 80;

/** Shared budget for the ZCTA, state, and district requests. */
const LOOKUP_BUDGET_MS = 7_000;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 5_000;

/** State and territory FIPS codes Census returns on the district layer. */
const FIPS_TO_POSTAL: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
  "60": "AS",
  "66": "GU",
  "69": "MP",
  "72": "PR",
  "78": "VI",
};

export type ZipDistrictHit = {
  state: string;
  /** Two-digit districts, at-large as `00`, ascending. */
  districts: string[];
};

export class ZipLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipLookupError";
  }
}

type CacheEntry = { expires: number; hit: ZipDistrictHit | null };
const cache = new Map<string, CacheEntry>();

export function clearZipDistrictCache(): void {
  cache.clear();
}

type Feature = { attributes?: Record<string, unknown>; geometry?: unknown };

type StateHit = { postal: string; fips: string };

type CdHit = { fips: string; district: string };

export async function censusZipDistricts(
  zip: string,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<ZipDistrictHit | null> {
  const cached = cache.get(zip);
  if (cached) {
    if (cached.expires > now) return cached.hit;
    cache.delete(zip);
  }

  const signal = AbortSignal.timeout(LOOKUP_BUDGET_MS);
  const zcta = await readJson(
    await fetchImpl(zctaUrl(zip), { signal, headers: jsonHeaders() }),
  );
  const feature = featuresOf(zcta)[0];
  if (!feature) {
    remember(zip, null, now + MISS_TTL_MS);
    return null;
  }
  const geometry = feature.geometry;
  if (!geometry || typeof geometry !== "object") {
    throw new ZipLookupError("Census ZCTA response did not include a boundary");
  }

  const point = pointOf(feature);
  const headers = jsonHeaders();
  const statePromise = point
    ? fetchImpl(stateUrl(point), { signal, headers }).then(readJson)
    : Promise.resolve(null);
  const cdPromise = fetchImpl(cdUrl(), {
    method: "POST",
    signal,
    headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      geometry: JSON.stringify(geometry),
      geometryType: "esriGeometryPolygon",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "STATE,CD120,GEOID",
      returnGeometry: "false",
      f: "json",
    }),
  }).then(readJson);
  const [stateBody, cdBody] = await Promise.all([statePromise, cdPromise]);

  const hit = resolveDistricts(stateOf(stateBody), cdsOf(cdBody));
  remember(zip, hit, now + (hit ? HIT_TTL_MS : MISS_TTL_MS));
  return hit;
}

/**
 * Keep districts in the ZCTA's state. Single-seat jurisdictions, including
 * delegate districts Census codes as 98, use district `00`.
 * Returns null when the ZIP does not resolve to one supported state.
 */
export function resolveDistricts(
  state: StateHit | "conflict" | "unresolved" | null,
  cds: readonly CdHit[],
): ZipDistrictHit | null {
  if (state === "conflict" || state === "unresolved") return null;
  if (state) {
    return hitFor(
      state.postal,
      cds.filter((cd) => cd.fips === state.fips),
    );
  }

  const byPostal = new Map<string, CdHit[]>();
  for (const cd of cds) {
    const postal = FIPS_TO_POSTAL[cd.fips];
    if (!postal) continue;
    const group = byPostal.get(postal);
    if (group) group.push(cd);
    else byPostal.set(postal, [cd]);
  }
  if (byPostal.size !== 1) return null;
  const [postal, group] = [...byPostal.entries()][0] ?? [];
  if (!postal || !group) return null;
  return hitFor(postal, group);
}

function hitFor(postal: string, cds: readonly CdHit[]): ZipDistrictHit | null {
  if (!isPostalState(postal)) return null;
  const districts = new Set<string>();
  for (const cd of cds) {
    const district = houseDistrict(postal, cd.district);
    if (district) districts.add(district);
  }
  if (districts.size === 0) return null;
  return { state: postal, districts: [...districts].sort() };
}

function houseDistrict(state: string, raw: string): string | null {
  const digits = raw.trim();
  if (!/^\d{1,2}$/.test(digits)) return null;
  const padded = digits.padStart(2, "0");
  if (isSingleSeat(state)) return canonicalDistrict(state, padded);
  const seats = HOUSE_SEATS[state];
  if (seats == null) return null;
  const number = Number(padded);
  if (number < 1 || number > seats) return null;
  return padded;
}

function stateOf(body: unknown): StateHit | "conflict" | "unresolved" | null {
  if (body == null) return null;
  const found = new Map<string, StateHit>();
  for (const feature of featuresOf(body)) {
    const postal = attr(feature, "STUSAB")?.toUpperCase() ?? null;
    const fips = fipsOf(attr(feature, "STATE"));
    if (!postal || !fips || !isPostalState(postal)) continue;
    if (FIPS_TO_POSTAL[fips] !== postal) return "conflict";
    found.set(fips, { postal, fips });
  }
  if (found.size === 0) return "unresolved";
  if (found.size > 1) return "conflict";
  return [...found.values()][0] ?? null;
}

function cdsOf(body: unknown): CdHit[] {
  const cds: CdHit[] = [];
  for (const feature of featuresOf(body)) {
    const fips = fipsOf(attr(feature, "STATE"));
    const district = attr(feature, "CD120") ?? geoidDistrict(attr(feature, "GEOID"));
    if (!fips || !district) continue;
    cds.push({ fips, district });
  }
  return cds;
}

function geoidDistrict(geoid: string | null): string | null {
  if (!geoid || geoid.length < 2) return null;
  return geoid.slice(-2);
}

function fipsOf(value: string | null): string | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  return value.padStart(2, "0");
}

function pointOf(feature: Feature): { lat: number; lon: number } | null {
  const lat = Number(attr(feature, "INTPTLAT"));
  const lon = Number(attr(feature, "INTPTLON"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function featuresOf(body: unknown): Feature[] {
  if (!body || typeof body !== "object") return [];
  const features = (body as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  return features.filter((item): item is Feature => Boolean(item) && typeof item === "object");
}

function attr(feature: Feature, name: string): string | null {
  const value = feature.attributes?.[name];
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new ZipLookupError(`Census district lookup returned HTTP ${response.status}`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ZipLookupError("Census district lookup returned invalid JSON");
  }
  if (body && typeof body === "object" && "error" in body) {
    throw new ZipLookupError("Census district lookup rejected the query");
  }
  return body;
}

function zctaUrl(zip: string): string {
  return layerUrl(ZCTA_LAYER, {
    where: `ZCTA5='${zip}'`,
    outFields: "ZCTA5,INTPTLAT,INTPTLON",
    returnGeometry: "true",
    outSR: "4326",
    geometryPrecision: "4",
    f: "json",
  });
}

function stateUrl(point: { lat: number; lon: number }): string {
  return layerUrl(STATE_LAYER, {
    geometry: JSON.stringify({ x: point.lon, y: point.lat }),
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "STATE,STUSAB",
    returnGeometry: "false",
    f: "json",
  });
}

function cdUrl(): string {
  return `${TIGER}/${CD_LAYER}/query`;
}

function layerUrl(layer: number, params: Record<string, string>): string {
  const url = new URL(`${TIGER}/${layer}/query`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function jsonHeaders(): HeadersInit {
  return { accept: "application/json", "user-agent": "candate-voter" };
}

function remember(zip: string, hit: ZipDistrictHit | null, expires: number): void {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(zip, { expires, hit });
}
