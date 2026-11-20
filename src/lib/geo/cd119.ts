import { labelPoint, ringArea, type Point } from "./label-point";
import { houseDistrictCodes } from "../data/at-large";
import { raceHasCandidates } from "../data/candidate-signal";
import type { Race } from "../types";

/**
 * House district geometry for the 2026 cycle.
 *
 * Source: U.S. Census Bureau cartographic boundary
 * `cb_2024_us_cd119_5m` (119th Congress, vintage 2024).
 * Files live in `public/geo/cd119/{ST}.json`. Geometry only.
 * Whether anyone has filed comes from the race list (`empty: true`).
 *
 * Join: feature `properties.state` (STUSPS) + `properties.district`
 * (two digits) to race id `{cycle}-house-{ST}-{DD}` on the race's own id.
 * At-large is `00` only (AK, DE, ND, SD, VT, WY). A legacy `01` id is not
 * a join key. Fifty states, 435 districts. No DC or territory delegates.
 *
 * Alaska longitudes east of the antimeridian are shifted west in the file
 * so the state draws as one shape.
 */
export const CD119_SOURCE = "U.S. Census Bureau cartographic boundary cb_2024_us_cd119_5m";
export const CD119_VINTAGE = 2024;
export const CD119_CONGRESS = 119;

const HOUSE_ID = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/;

export type CdGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type CdFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { district?: unknown; state?: unknown };
    geometry: CdGeometry;
  }>;
};

export type ProjectedDistrict = {
  district: string;
  d: string;
  viewWidth: number;
  viewHeight: number;
  labelX: number;
  labelY: number;
};

/** Two-digit district drawn on the map, or null when this state does not use that code. */
export function districtCodeForMap(postal: string, district: string): string | null {
  const code = district.trim().padStart(2, "0");
  if (!/^\d{2}$/.test(code)) return null;
  if (!houseDistrictCodes(postal).includes(code)) return null;
  return code;
}

/**
 * Race row for one drawn district.
 * Matches the district segment of `raceId`. Does not rewrite at-large `01` to `00`.
 */
export function raceForDistrict(
  races: readonly Race[],
  postal: string,
  district: string,
): Race | null {
  const code = districtCodeForMap(postal, district);
  if (!code) return null;
  const matches = races.filter((race) => {
    if (race.office !== "house" || race.state !== postal) return false;
    const id = HOUSE_ID.exec(race.raceId);
    return id?.[2] === postal && id[3] === code;
  });
  if (matches.length === 0) return null;
  return matches.find((race) => raceHasCandidates(race)) ?? matches[0] ?? null;
}

/**
 * Soft fill when a stored filing exists.
 * Empty stubs, `hasCandidates: false`, and a joined `candidates: []` stay quiet.
 */
export function districtHasCandidates(race: Race | null): boolean {
  return raceHasCandidates(race);
}

export function isCdFeatureCollection(value: unknown): value is CdFeatureCollection {
  if (!value || typeof value !== "object") return false;
  const row = value as { type?: unknown; features?: unknown };
  return row.type === "FeatureCollection" && Array.isArray(row.features);
}

/** Fit district rings into an SVG viewBox. Even-odd paths keep holes. */
export function projectCollection(
  collection: CdFeatureCollection,
  width = 1000,
  height = 640,
  pad = 20,
  tight = false,
): ProjectedDistrict[] {
  const prepared: Array<{ district: string; polygons: number[][][][] }> = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of collection.features) {
    const raw = feature.properties?.district;
    if (typeof raw !== "string") continue;
    const district = raw.trim().padStart(2, "0");
    if (!/^\d{2}$/.test(district)) continue;
    const polygons = polygonsOf(feature.geometry);
    if (polygons.length === 0) continue;
    prepared.push({ district, polygons });
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const pair of ring) {
          const x = pair[0];
          const y = pair[1];
          if (x == null || y == null) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (!Number.isFinite(minX) || prepared.length === 0) return [];
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const usedW = spanX * scale;
  const usedH = spanY * scale;
  const offsetX = pad + (innerW - usedW) / 2;
  const offsetY = pad + (innerH - usedH) / 2;

  return prepared.map((item) => {
    const commands: string[] = [];
    const projected = item.polygons.map((polygon) => polygon.map((ring) => {
      const points = ring.filter((pair) => pair.length >= 2).map(([lon, lat]): Point => [
        Number(((tight ? pad : offsetX) + (lon - minX) * scale).toFixed(1)),
        Number(((tight ? pad : offsetY) + (maxY - lat) * scale).toFixed(1)),
      ]);
      if (points.length) commands.push(`M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`);
      return points;
    }));
    const area = (polygon: Point[][]) => polygon.reduce((sum, ring, i) => sum + (i ? -1 : 1) * Math.abs(ringArea(ring)), 0);
    const largest = projected.filter((polygon) => polygon[0]?.length).sort((a, b) => area(b) - area(a))[0];
    const [labelX, labelY] = largest ? labelPoint(largest) : [pad, pad];
    return {
      district: item.district,
      d: commands.join(""),
      labelX,
      labelY,
      viewWidth: tight ? usedW + pad * 2 : width,
      viewHeight: tight ? usedH + pad * 2 : height,
    };
  });
}

function polygonsOf(geometry: CdGeometry | undefined): number[][][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}
