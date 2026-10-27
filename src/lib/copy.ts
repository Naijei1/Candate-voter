import { houseContestJurisdiction, isBogusAtLargeContest } from "./data/at-large";
import { stateName } from "./data/states";
import type { Race } from "./types";

/** One line for a filing. Shown on candidate cards and the candidate page. */
export const FILING_MEANS =
  "A statement of candidacy (Form 2) tells the FEC someone intends to run — it is not the final ballot and not an endorsement.";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Day of the federal general election: the Tuesday after the first Monday
 * in November. Primaries are not included; those dates differ by state.
 */
export function generalElectionDay(year: number): number {
  const weekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstMonday = 1 + ((8 - weekday) % 7);
  return firstMonday + 1;
}

/** "November 3, 2026". */
export function generalElectionLabel(year: number): string {
  return `${MONTHS[10]} ${generalElectionDay(year)}, ${year}`;
}

/** Homepage and race pages. Federal offices only. */
export function federalScopeLine(): string {
  return "Federal races only: President, Senate, and House.";
}

/** Primary versus general, plus the federal general-election date. */
export function ballotVersusFilingLine(year: number): string {
  return `A Form 2 is not the ballot. Primaries vary by state. The federal general election is ${generalElectionLabel(year)}.`;
}

/** Shown when a ZIP lookup returns more than one House district. */
export function splitZipLine(): string {
  return "One ZIP can fall in two House districts. Both are listed when the map says the ZIP touches each one.";
}

/**
 * Senate coverage is a count of stored Senate race rows, usually 0 or 1.
 * It is not a headcount of people.
 */
export function senateScoreSentence(count: number): string {
  if (count <= 0) return "No Senate filing is stored";
  if (count === 1) return "Someone has filed for Senate";
  return `${count} Senate races have a filing`;
}

/**
 * People with a stored filing. Shared by the state footer and the race card
 * so those two lines cannot count different things.
 */
export function candidatesSoFarLine(count: number): string {
  const people = Math.max(0, Math.trunc(count));
  if (people === 1) return "1 candidate so far";
  return `${people} candidates so far`;
}

/**
 * State overview Senate line. `count` is people on that statewide seat,
 * the same number `candidatesSoFarLine` shows on the race card.
 */
export function senateBoardLine(count: number): string {
  if (count <= 0) return "Senate — no filing yet for the statewide seat.";
  return `Senate — ${candidatesSoFarLine(count)}.`;
}

/** State overview: a plain House line plus the district count. */
export function houseBoardLine(withFilings: number, total: number): string {
  const filed = Math.max(0, withFilings);
  if (total > 0) {
    const verb = filed === 1 ? "has" : "have";
    return `House — ${filed} of ${total} districts ${verb} a filing.`;
  }
  if (filed === 0) return "House — no filing yet.";
  if (filed === 1) return "House — 1 filing.";
  return `House — ${filed} filings.`;
}

/** What the office is, in one sentence, on a race card. */
export function officeOneLiner(
  race: Pick<Race, "office" | "district">,
): string | null {
  if (race.office === "senate") return "The U.S. Senate seat for the whole state.";
  if (race.office === "house") {
    const code = race.district?.trim() ?? "";
    if (code === "00" || code === "0") return "The U.S. House seat for the whole state.";
    return "The U.S. House seat for this district.";
  }
  return null;
}

/** True when the jurisdiction is already written in the title. */
export function jurisdictionRepeatsTitle(title: string, jurisdiction: string): boolean {
  const place = jurisdiction.trim().toLowerCase();
  if (!place) return true;
  return title.toLowerCase().includes(place);
}

/** Short map hover: state name and a filing count, or that nobody has filed. */
export function stateHoverLine(
  name: string,
  senateFilings: number,
  districtsWithFilings: number,
  districtsTotal: number,
): string {
  if (senateFilings <= 0 && districtsWithFilings <= 0) return `${name} · No one has filed yet`;
  const parts = [name];
  if (senateFilings === 1) parts.push("Senate filed");
  else if (senateFilings > 1) parts.push(`${senateFilings} Senate filed`);
  if (districtsTotal > 0) parts.push(`${districtsWithFilings} of ${districtsTotal} House`);
  else if (districtsWithFilings > 0) parts.push(`${districtsWithFilings} House`);
  return parts.join(" · ");
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

type EmptyHouseCandidate = Pick<Race, "office" | "state" | "cycle" | "district" | "raceId" | "empty">;

/**
 * One way forward from an empty House contest.
 * A filed Senate race wins; otherwise the nearest House district with a filing.
 * Null means the page should link back to Your races instead.
 */
export function emptyHouseNext(
  race: EmptyHouseCandidate,
  races: readonly EmptyHouseCandidate[],
): { raceId: string; label: string } | null {
  if (race.office !== "house" || race.empty !== true || !race.state) return null;
  if (isBogusAtLargeContest(race)) return null;
  const same = races.filter(
    (item) =>
      item.raceId !== race.raceId &&
      item.cycle === race.cycle &&
      item.state === race.state &&
      !isBogusAtLargeContest(item),
  );
  const senate = same.find((item) => item.office === "senate" && item.empty !== true);
  if (senate) return { raceId: senate.raceId, label: "See the Senate race" };
  const origin = Number(race.district);
  const filed = same.filter((item) => item.office === "house" && item.empty !== true);
  if (filed.length === 0 || !Number.isFinite(origin)) return null;
  const nearest = [...filed].sort((a, b) => {
    const distance = Math.abs(Number(a.district) - origin) - Math.abs(Number(b.district) - origin);
    if (distance !== 0) return distance;
    return (a.district ?? "").localeCompare(b.district ?? "");
  })[0];
  return nearest ? { raceId: nearest.raceId, label: "See a nearby district" } : null;
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
