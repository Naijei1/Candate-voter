import { readFileSync } from "node:fs";
import path from "node:path";
import { houseDistrictCodes } from "@/lib/data/at-large";
import { isCdFeatureCollection, projectCollection, type ProjectedDistrict } from "./cd119";

export type OutlineMap = { viewBox: string; districts: ProjectedDistrict[]; count: number };

/** District outlines for a state the site does not cover yet. Geometry only, from the Census file. */
export function outlineMap(postal: string): OutlineMap {
  const count = houseDistrictCodes(postal).length;
  try {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), "public", "geo", "cd119", `${postal}.json`), "utf8")) as unknown;
    if (!isCdFeatureCollection(raw)) return { viewBox: "0 0 1000 640", districts: [], count };
    const districts = projectCollection(raw, 1000, 1200, 8, true, true);
    const first = districts[0];
    const viewBox = first ? `0 0 ${first.viewWidth.toFixed(1)} ${first.viewHeight.toFixed(1)}` : "0 0 1000 640";
    return { viewBox, districts: districts.sort((a, b) => a.district.localeCompare(b.district)), count };
  } catch {
    return { viewBox: "0 0 1000 640", districts: [], count };
  }
}
