import { stateConfig, type StateConfig } from "../states";

const KY = stateConfig("KY");

/**
 * Kentucky polls close at 6:00 p.m. local time. The state spans Eastern and
 * Central time, so every polling place is closed only at 6:00 p.m. Central.
 */
function localClock(now: Date, timeZone: string): { day: string; clock: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    clock: `${value("hour").padStart(2, "0")}:${value("minute").padStart(2, "0")}`,
  };
}

function closedAt(now: Date, state: StateConfig, timeZone: string): boolean {
  const { day, clock } = localClock(now, timeZone);
  if (day > state.generalElection) return true;
  if (day < state.generalElection) return false;
  return clock >= state.pollsClose;
}

/** Polls are closed in the zone that closes first. */
export function firstPollsClosed(now: Date, state: StateConfig): boolean {
  return closedAt(now, state, state.timeZones[0]);
}

/** Polls are closed everywhere in the state. */
export function allPollsClosed(now: Date, state: StateConfig): boolean {
  return closedAt(now, state, state.timeZones[state.timeZones.length - 1]);
}

/** Eastern Kentucky polls are closed. Central counties may still be open. */
export function kentuckyEasternPollsClosed(now: Date): boolean {
  return firstPollsClosed(now, KY);
}

export function kentuckyPollsClosed(now: Date): boolean {
  return allPollsClosed(now, KY);
}

export type ResultsPhase = "before" | "partial" | "closed";

export function kentuckyResultsPhase(now: Date): ResultsPhase {
  if (kentuckyPollsClosed(now)) return "closed";
  if (kentuckyEasternPollsClosed(now)) return "partial";
  return "before";
}

export const KY_RESULTS_LINKS = [KY.results.live, KY.results.official] as const;
