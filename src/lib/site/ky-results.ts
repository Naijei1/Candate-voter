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

function closedAt(now: Date, timeZone: string): boolean {
  const { day, clock } = localClock(now, timeZone);
  if (day > "2026-11-03") return true;
  if (day < "2026-11-03") return false;
  return clock >= "18:00";
}

/** Eastern Kentucky polls are closed. Central counties may still be open. */
export function kentuckyEasternPollsClosed(now: Date): boolean {
  return closedAt(now, "America/New_York");
}

export function kentuckyPollsClosed(now: Date): boolean {
  return closedAt(now, "America/Chicago");
}

export type ResultsPhase = "before" | "partial" | "closed";

export function kentuckyResultsPhase(now: Date): ResultsPhase {
  if (kentuckyPollsClosed(now)) return "closed";
  if (kentuckyEasternPollsClosed(now)) return "partial";
  return "before";
}

export const KY_RESULTS_LINKS = [
  {
    href: "https://vrsws.sos.ky.gov/liveresults/",
    label: "Election night results",
  },
  {
    href: "https://elect.ky.gov/results/2020-2029/Pages/2026.aspx",
    label: "State Board of Elections results",
  },
] as const;
