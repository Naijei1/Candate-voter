import { PARTY_LABELS } from "./data/party-codes";
import { stateConfig } from "./states";
import type { FederalOffice } from "./types";

const INSTANT_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: stateConfig().displayTimeZone,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "shortGeneric",
});

/** Display string for an ISO-8601 timestamp, in Eastern Time. Unparseable values stay visible. */
export function formatInstant(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return INSTANT_FORMAT.format(date);
}

/** `dateTime` value for a `<time>` element, or null when the string is not an instant. */
export function instantDateTime(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Allow only https URLs in source links. */
export function httpsUrl(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function officeLabel(office: FederalOffice): string {
  if (office === "president") return "President";
  if (office === "senate") return "Senate";
  return "House";
}

/**
 * Party code as reported on the filing, plus a readable label.
 * The label is not an endorsement. Unknown codes stay visible as stored.
 */

/** Filing affiliation code, uppercased, or null when the filing left it blank. */
export function partyCode(party: string | null | undefined): string | null {
  const code = party?.trim().toUpperCase() ?? "";
  return code.length > 0 ? code : null;
}

/**
 * Readable affiliation label.
 * A backend `partyLabel` wins when it is present. Otherwise a small map
 * covers common FEC codes. Unknown codes stay as filed.
 */
export function partyLabel(
  party: string | null | undefined,
  provided?: string | null,
): string {
  const explicit = provided?.trim() ?? "";
  if (explicit) return explicit;
  const code = partyCode(party);
  if (!code) return "Affiliation not reported";
  return PARTY_LABELS[code] ?? code;
}

const WRITE_IN_LABEL = /^write[-\s]?in$/i;

/**
 * Collapsed party labels for a row.
 * "Write-in" plus another affiliation reads as a write-in candidate, not two parties.
 */
/**
 * "Democratic Democratic (DEM)" is a doubled label plus the code.
 * Keep a single name and the code.
 */
export function collapseRepeatedParty(text: string): string {
  return text.replace(
    /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)*)(?:\s+\1)+\s+\(([A-Za-z][A-Za-z0-9/]{1,8})\)/g,
    "$1 ($2)",
  );
}

export function partyCue(labels: readonly string[]): string {
  const cleaned = labels
    .map((label) => collapseRepeatedParty(label.trim()))
    .filter((label) => label.length > 0);
  const writeIn = cleaned.some((label) => WRITE_IN_LABEL.test(label));
  const rest = cleaned.filter((label) => !WRITE_IN_LABEL.test(label));
  if (writeIn && rest.length > 0) return `Write-in candidate (${rest.join(", ")})`;
  if (writeIn) return "Write-in candidate";
  if (cleaned.length === 0) return "Affiliation not reported";
  return collapseRepeatedParty(cleaned.join(" · "));
}

/**
 * Visual tone for an affiliation label. Color is a second cue next to the
 * name. It is not a rating.
 */
export function partyTone(
  party: string | null | undefined,
): "democratic" | "republican" | "other" {
  const code = partyCode(party);
  if (code === "DEM" || code === "DFL") return "democratic";
  if (code === "REP") return "republican";
  return "other";
}

/** Class for `--party-dem` / `--party-rep`. Teal `text-accent` is not a party color. */
export function partyToneClass(party: string | null | undefined): string {
  const tone = partyTone(party);
  if (tone === "democratic") return "text-party-dem";
  if (tone === "republican") return "text-party-rep";
  return "text-muted";
}

export function fecCandidateLabel(id: string | null | undefined): string {
  const text = id?.trim() ?? "";
  if (!text) return "FEC candidate id not reported";
  return `FEC ${text}`;
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

/**
 * Calendar day for a date-only string, or for a timestamp in the state's display zone.
 * A UTC timestamp late in the evening is the previous local day in Kentucky.
 */
export function calendarDay(value: string | Date, timeZone = stateConfig().displayTimeZone): string {
  const text = value instanceof Date ? value.toISOString() : value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
    return match?.[1] ?? text;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dayLabel(value: string): string {
  const day = calendarDay(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return DAY_FORMAT.format(date);
}

/**
 * "3 days ago" for a recent filing or story date. Computed once on the server.
 * Older dates keep the calendar label.
 */
export function ageLabel(value: string, now = new Date(), timeZone = stateConfig().displayTimeZone): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return dayLabel(value);
  const then = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = calendarDay(now, timeZone);
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!todayMatch) return dayLabel(value);
  const start = Date.UTC(Number(todayMatch[1]), Number(todayMatch[2]) - 1, Number(todayMatch[3]));
  const days = Math.round((start - then) / 86_400_000);
  if (days === 0) return "today";
  if (days > 0 && days < 14) return days === 1 ? "1 day ago" : `${days} days ago`;
  return dayLabel(value);
}
