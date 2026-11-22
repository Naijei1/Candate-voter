import type { Preferences } from "../api/v1-types";
import { hasPlace, sanitizePlace } from "../place/selection";
import { stanceIssues } from "../site/stances";

const issueIds = new Set(stanceIssues().map(({ id }) => id));

export function validIssues(input: unknown): string[] {
  return Array.isArray(input) ? [...new Set(input.filter((id): id is string => typeof id === "string" && issueIds.has(id)))] : [];
}

export function kyPlace(input: unknown): Preferences["geography"] {
  const place = sanitizePlace(input);
  if (!hasPlace(place) || (place.state && place.state !== "KY")) return null;
  if (place.district && !/^0[1-6]$/.test(place.district)) return null;
  return { ...place, state: "KY" };
}
