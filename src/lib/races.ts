import type { FederalOffice, Race } from "./types";

export const OFFICE_ORDER: readonly FederalOffice[] = ["president", "senate", "house"];

/** Races grouped in office order. Empty offices are omitted. Party is not a group. */
export function racesByOffice(
  races: readonly Race[],
): Array<{ office: FederalOffice; races: Race[] }> {
  return OFFICE_ORDER.map((office) => ({
    office,
    races: races.filter((race) => race.office === office),
  })).filter((group) => group.races.length > 0);
}
