import { HOUSE_SEATS } from "../data/at-large";
import { signalRace } from "../data/candidate-signal";
import { raceMatchesCycle } from "../data/cycle-match";
import { buildRaceId } from "../fec/map-form2";
import type { Race } from "../types";
import type { ZipDistrictHit } from "../geo/zip-districts";

export type ZipDistrictRow = {
  district: string;
  raceId: string;
};

export type ZipLookupBody = {
  zip: string;
  year: number;
  state: string;
  districts: ZipDistrictRow[];
  senateRaceId: string | null;
  raceIds: string[];
  races: Race[];
};

/**
 * Geography ids are always returned. `races` keeps only rows stored for this
 * year, in the same order, using the same race objects as the race index.
 */
export function zipLookupBody(input: {
  zip: string;
  year: number;
  hit: ZipDistrictHit;
  races: readonly Race[];
}): ZipLookupBody {
  const senateRaceId =
    HOUSE_SEATS[input.hit.state] != null
      ? buildRaceId({
          office: "senate",
          cycle: input.year,
          state: input.hit.state,
          district: null,
        })
      : null;
  const districts = [...input.hit.districts].sort().map((district) => ({
    district,
    raceId: buildRaceId({
      office: "house",
      cycle: input.year,
      state: input.hit.state,
      district,
    }),
  }));
  const raceIds = [
    ...(senateRaceId ? [senateRaceId] : []),
    ...districts.map((row) => row.raceId),
  ];
  const byId = new Map(input.races.map((race) => [race.raceId, race]));
  return {
    zip: input.zip,
    year: input.year,
    state: input.hit.state,
    districts,
    senateRaceId,
    raceIds,
    races: raceIds.flatMap((raceId) => {
      const race = byId.get(raceId);
      if (!race || !raceMatchesCycle(race, input.year)) return [];
      return [signalRace(race)];
    }),
  };
}
