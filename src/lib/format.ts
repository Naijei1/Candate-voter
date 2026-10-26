import type { FederalOffice } from "./types";

const INSTANT_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
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
 * Common names for FEC party codes. The code is the affiliation on the
 * filing. A name is a readable label for that code, not an endorsement.
 * Codes without a known name stay visible as filed.
 */
const PARTY_NAMES: Record<string, string> = {
  DEM: "Democratic",
  DFL: "Democratic-Farmer-Labor",
  REP: "Republican",
  IND: "Independent",
  LIB: "Libertarian",
  GRE: "Green",
  GRN: "Green",
  CON: "Conservative",
  CST: "Constitution",
  REF: "Reform",
  AIP: "American Independent",
  IAP: "Independent American",
  NPA: "No Party Affiliation",
  NNE: "None",
  NON: "Nonpartisan",
  UNK: "Unknown",
  OTH: "Other",
  WFP: "Working Families",
  PFP: "Peace and Freedom",
  SWP: "Socialist Workers",
  IDP: "Independence",
  NLP: "Natural Law",
  PRO: "Progressive",
  WRI: "Write-in",
};

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
  return PARTY_NAMES[code] ?? code;
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

export function fecCandidateLabel(id: string | null | undefined): string {
  const text = id?.trim() ?? "";
  if (!text) return "FEC candidate id not reported";
  return `FEC ${text}`;
}
