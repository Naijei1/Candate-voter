import type { FederalOffice, Race } from "./types";

export const OFFICE_ORDER: readonly FederalOffice[] = ["president", "senate", "house"];

/** State panels list Senate and House. President stays off this list. */
export const STATE_OFFICE_ORDER: readonly FederalOffice[] = ["senate", "house"];

/** Races grouped in office order. Empty offices are omitted. Party is not a group. */
export function racesByOffice(
  races: readonly Race[],
): Array<{ office: FederalOffice; races: Race[] }> {
  return groupOffices(OFFICE_ORDER, races);
}

/** Senate, then House. Presidential rows are omitted even if they were passed in. */
export function racesByStateOffice(
  races: readonly Race[],
): Array<{ office: FederalOffice; races: Race[] }> {
  return groupOffices(STATE_OFFICE_ORDER, races);
}

function groupOffices(
  order: readonly FederalOffice[],
  races: readonly Race[],
): Array<{ office: FederalOffice; races: Race[] }> {
  return order
    .map((office) => ({
      office,
      races: races.filter((race) => race.office === office),
    }))
    .filter((group) => group.races.length > 0);
}
