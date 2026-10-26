import type { FederalOffice } from "./types";

const INSTANT_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Display string for an ISO-8601 timestamp. Unparseable values stay visible. */
export function formatInstant(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${INSTANT_FORMAT.format(date)} UTC`;
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

/** Party as stored. The code is not renamed and not treated as an endorsement. */
export function partyLabel(party: string | null | undefined): string {
  const code = party?.trim() ?? "";
  if (!code) return "Party not reported";
  return `Party ${code}`;
}

export function fecCandidateLabel(id: string | null | undefined): string {
  const text = id?.trim() ?? "";
  if (!text) return "FEC candidate id not reported";
  return `FEC ${text}`;
}
