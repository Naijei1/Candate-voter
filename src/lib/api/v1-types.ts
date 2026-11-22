import type { FORM2_SCOPE, HouseCoverageRow } from "../data/coverage";
import type { PublicCandidate } from "../data/view";
import type { PlaceSelection } from "../place/selection";
import type { Filing, IngestWatermark, Race } from "../types";
import type { Follow } from "../users/follows";

export const API_VERSION = 1;
export type Versioned<T> = T & { version: typeof API_VERSION };

export type Coverage = {
  scope: typeof FORM2_SCOPE;
  filingsSoFarOnly: true;
  scopeNote: string;
  refreshedAt: string | null;
  house: HouseCoverageRow[];
};

export type RaceListResponse = Versioned<{
  cycles: number[];
  races: Race[];
  nextCursor: string | null;
  refreshedAt: string | null;
  coverage: Coverage;
}>;
export type RaceResponse = Versioned<{ race: Race; candidates: PublicCandidate[]; refreshedAt: string | null; coverage: Coverage }>;
export type CandidateResponse = Versioned<{ candidate: PublicCandidate; race: Race | null }>;
export type FilingsResponse = Versioned<{ candidate: PublicCandidate; filings: Filing[] }>;
export type FreshnessResponse = Versioned<Omit<Coverage, "house"> & { watermark: IngestWatermark | null }>;
export type ZipLookupResponse = Versioned<{
  zip: string;
  year: number;
  state: string | null;
  districts: { district: string; raceId: string }[];
  senateRaceId: string | null;
  raceIds: string[];
  races: Race[];
}>;
export type Preferences = { geography: PlaceSelection | null; issues: string[] | null };
export type PreferencesResponse = Versioned<{ preferences: Preferences }>;
export type FollowsResponse = Versioned<{ follows: Follow[] }>;

export function versioned<T extends object>(body: T): Versioned<T> {
  return { ...body, version: API_VERSION };
}
