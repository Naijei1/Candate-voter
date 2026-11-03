/**
 * Kentucky polls close at 6:00 p.m. local time. The state spans Eastern and
 * Central time, so every polling place is closed only at 6:00 p.m. Central.
 */
export function kentuckyPollsClosed(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = `${value("year")}-${value("month")}-${value("day")}`;
  const clock = `${value("hour").padStart(2, "0")}:${value("minute").padStart(2, "0")}`;
  if (day > "2026-11-03") return true;
  if (day < "2026-11-03") return false;
  return clock >= "18:00";
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
