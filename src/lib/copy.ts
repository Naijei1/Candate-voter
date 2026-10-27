import { houseContestJurisdiction } from "./data/at-large";
import { stateName } from "./data/states";
import type { Race } from "./types";

/** One line for a filing. Shown on candidate cards and the candidate page. */
export const FILING_MEANS =
  "A statement of candidacy (Form 2) tells the FEC someone intends to run — it is not the final ballot and not an endorsement.";

/**
 * Senate coverage is a count of stored Senate race rows, usually 0 or 1.
 * It is not a headcount of people.
 */
export function senateScoreSentence(count: number): string {
  if (count <= 0) return "No Senate filing is stored";
  if (count === 1) return "Someone has filed for Senate";
  return `${count} Senate races have a filing`;
}

/** House coverage is districts with a stored filing, out of the apportioned total. */
export function houseScoreSentence(withFilings: number, total: number): string {
  const filed = Math.max(0, withFilings);
  if (total > 0) {
    const verb = filed === 1 ? "has" : "have";
    return `${filed} of ${total} districts ${verb} a filing`;
  }
  if (filed === 0) return "No House district has a filing";
  if (filed === 1) return "1 district has a filing";
  return `${filed} districts have a filing`;
}

export function emptyDistrictSentence(district: string | null | undefined): string {
  const code = district?.trim() ?? "";
  if (code === "00") return "No one has filed for the at-large seat yet.";
  if (/^\d+$/.test(code)) {
    const number = Number(code);
    if (number === 0) return "No one has filed for the at-large seat yet.";
    return `No one has filed in District ${number} yet.`;
  }
  return "No one has filed in this district yet.";
}

export function emptySenateSentence(): string {
  return "No one has filed for Senate yet.";
}

/** Plain office line. Uses the stored jurisdiction; does not invent a district. */
export function runningForLine(
  race: Pick<Race, "office" | "title" | "jurisdiction" | "state" | "district">,
): string {
  if (race.office === "senate") {
    const place = placeName(race);
    return place ? `U.S. Senate — ${place}` : "U.S. Senate";
  }
  if (race.office === "house") {
    const place = placeName(race);
    return place ? `U.S. House — ${place}` : "U.S. House";
  }
  if (race.office === "president") return "President";
  return race.title;
}

export function emptyRaceSentence(
  race: Pick<Race, "office" | "district">,
): string {
  if (race.office === "house") return emptyDistrictSentence(race.district);
  if (race.office === "senate") return emptySenateSentence();
  return "No one has filed yet.";
}

function placeName(
  race: Pick<Race, "office" | "jurisdiction" | "state" | "district">,
): string {
  const jurisdiction = race.jurisdiction.trim();
  if (jurisdiction) return jurisdiction;
  if (!race.state) return "";
  if (race.office === "house" && race.district) {
    return houseContestJurisdiction(race.state, race.district);
  }
  return stateName(race.state);
}
