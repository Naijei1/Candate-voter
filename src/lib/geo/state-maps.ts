import kyDistricts from "../../../public/geo/cd120/KY.json";
import kyCountyShapes from "../../../public/geo/counties/KY.json";
import kyCounties from "../../../data/ky-counties.json";
import { stateConfig, type StateCode } from "@/lib/states";
import { projectCollection, type CdFeatureCollection } from "./cd119";

export type CountyShape = {
  fips: string;
  name: string;
  d: string;
  x: number;
  y: number;
  radius: number;
  /** House districts as numbers, e.g. [3, 4] for a split county. */
  districts: number[];
  clerk: string | null;
  clerkUrl: string | null;
};

export type DistrictShape = { code: string; number: number; d: string; labelX: number; labelY: number };

export type StateMap = {
  viewBox: string;
  counties: CountyShape[];
  districtViewBox: string;
  districts: DistrictShape[];
  districtSource: string | null;
};

type CountyFile = { viewBox: string; counties: Array<{ fips: string; d: string; x: number; y: number; radius: number }> };
type CountyRow = { fips: string; name: string; districts: string[]; districtSource?: string; clerk?: string; clerkUrl?: string };

const SOURCES: Record<StateCode, { shapes: CountyFile; rows: CountyRow[]; districts: CdFeatureCollection }> = {
  KY: { shapes: kyCountyShapes as CountyFile, rows: kyCounties as CountyRow[], districts: kyDistricts as unknown as CdFeatureCollection },
};

const cache = new Map<StateCode, StateMap>();

/** County and district drawings for a covered state, projected the same way so they line up. */
export function stateMap(code: StateCode = stateConfig().code): StateMap {
  const hit = cache.get(code);
  if (hit) return hit;
  const source = SOURCES[code];
  const hints = stateConfig(code).mapHints;
  const rows = new Map(source.rows.map((row) => [row.fips, row]));
  const counties = source.shapes.counties
    .map((shape) => {
      const row = rows.get(shape.fips);
      return {
        ...shape,
        name: row?.name ?? shape.fips,
        districts: (row?.districts ?? []).map(Number).sort((a, b) => a - b),
        clerk: row?.clerk ?? null,
        clerkUrl: row?.clerkUrl ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const projected = projectCollection(source.districts, 1000, 640, hints.fitPad, true, hints.localLatitude);
  const width = projected[0]?.viewWidth ?? 1000;
  const height = projected[0]?.viewHeight ?? 640;
  const map: StateMap = {
    viewBox: source.shapes.viewBox,
    counties,
    districtViewBox: `0 0 ${Math.round(width * 10) / 10} ${Math.round(height * 10) / 10}`,
    districts: projected
      .map((row) => ({ code: row.district, number: Number(row.district), d: row.d, labelX: Math.round(row.labelX * 10) / 10, labelY: Math.round(row.labelY * 10) / 10 }))
      .sort((a, b) => a.number - b.number),
    districtSource: source.rows[0]?.districtSource ?? null,
  };
  cache.set(code, map);
  return map;
}

export function countyNamed(name: string, code: StateCode = stateConfig().code): CountyShape | null {
  const want = name
    .trim()
    .toLowerCase()
    .replace(/\s+county$/, "");
  return stateMap(code).counties.find((county) => county.name.toLowerCase() === want) ?? null;
}
