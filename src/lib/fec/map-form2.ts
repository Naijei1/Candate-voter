import { isPostalState, stateName } from "../data/states";
import type { FecForm2Filing } from "./types";
import type { Candidate, FederalOffice, Filing, Race } from "../types";

export type SkipReason =
  | "missing-file-number"
  | "missing-load-timestamp"
  | "unsupported-office"
  | "invalid-election-year"
  | "missing-state"
  | "invalid-district";

export type MappedForm2 = {
  ok: true;
  race: Race;
  candidate: Candidate;
  filing: Filing;
  loadTimestamp: string;
};

export type MapForm2Result = MappedForm2 | { ok: false; reason: SkipReason };

const OFFICE_BY_CODE: Record<string, FederalOffice> = {
  P: "president",
  S: "senate",
  H: "house",
};

/**
 * Map one electronic Form 2 row into a race, candidate, and filing.
 * Street address, city, and ZIP are not read and not stored.
 */
export function mapForm2Filing(
  row: FecForm2Filing,
  input: { retrievedAt: string },
): MapForm2Result {
  const fileNumber = parseFileNumber(row.file_number);
  if (fileNumber == null) return { ok: false, reason: "missing-file-number" };

  const loadTimestamp = normalizeLoadTimestamp(row.load_timestamp);
  if (!loadTimestamp) return { ok: false, reason: "missing-load-timestamp" };

  const officeCode = (row.candidate_office ?? "").trim().toUpperCase();
  const office = OFFICE_BY_CODE[officeCode];
  if (!office) return { ok: false, reason: "unsupported-office" };

  const cycle = parseElectionYear(row.election_year);
  if (cycle == null) return { ok: false, reason: "invalid-election-year" };

  const state = normalizeState(row.election_state);
  if (office !== "president" && !state) {
    return { ok: false, reason: "missing-state" };
  }

  const district = office === "house" ? normalizeDistrict(row.candidate_district) : null;
  if (office === "house" && !district) {
    return { ok: false, reason: "invalid-district" };
  }

  const raceId = buildRaceId({ office, cycle, state, district });
  const fecCandidateId = normalizeCandidateId(row.candidate_id);
  const candidateId = fecCandidateId ?? `file-${fileNumber}`;
  const filingId = String(fileNumber);
  const sourceUrl = filingSourceUrl(row.pdf_url, row.image_number);
  const imageNumber = clean(row.image_number);
  const nameAsFiled = clean(row.candidate_name);
  const displayName = buildDisplayName(row) ?? nameAsFiled ?? "Unnamed candidate";

  const race: Race = {
    raceId,
    office,
    cycle,
    state: office === "president" ? null : state,
    district: office === "house" ? district : null,
    title: raceTitle({ office, state, district }),
    jurisdiction: raceJurisdiction({ office, state, district }),
    sourceUrl: raceSourceUrl({ office, cycle, state, district }),
    updatedAt: input.retrievedAt,
  };

  const candidate: Candidate = {
    candidateId,
    raceId,
    displayName,
    nameAsFiled,
    office,
    partyAffiliation: normalizeParty(row.candidate_party),
    fecCandidateId,
    sourceUrl: fecCandidateId
      ? `https://www.fec.gov/data/candidate/${fecCandidateId}/`
      : sourceUrl,
    sourceLoadedAt: loadTimestamp,
    updatedAt: input.retrievedAt,
  };

  const filing: Filing = {
    filingId,
    candidateId,
    raceId,
    formType: "F2",
    fecFilingId: filingId,
    imageNumber,
    filedAt: null,
    fecLoadTimestamp: loadTimestamp,
    sourceUrl,
    retrievedAt: input.retrievedAt,
    updatedAt: input.retrievedAt,
  };

  return { ok: true, race, candidate, filing, loadTimestamp };
}

export function normalizeLoadTimestamp(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace("T", " ");
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/.exec(trimmed);
  if (!match) return null;
  return `${match[1]} ${match[2]}`;
}

export function buildRaceId(input: {
  office: FederalOffice;
  cycle: number;
  state: string | null;
  district: string | null;
}): string {
  if (input.office === "president") return `${input.cycle}-president`;
  if (input.office === "senate") return `${input.cycle}-senate-${input.state}`;
  return `${input.cycle}-house-${input.state}-${input.district}`;
}

function parseFileNumber(value: FecForm2Filing["file_number"]): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseElectionYear(value: FecForm2Filing["election_year"]): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed < 1980 || parsed > 2100) return null;
  return parsed;
}

function normalizeState(value: string | null | undefined): string | null {
  const state = (value ?? "").trim().toUpperCase();
  if (!isPostalState(state)) return null;
  return state;
}

function normalizeDistrict(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!/^\d{1,2}$/.test(raw)) return null;
  return raw.padStart(2, "0");
}

function normalizeCandidateId(value: string | null | undefined): string | null {
  const id = (value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{9}$/.test(id)) return null;
  return id;
}

function normalizeParty(value: string | null | undefined): string | null {
  const party = (value ?? "").trim().toUpperCase();
  if (!party || party.length > 10) return null;
  return party;
}

function clean(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

function buildDisplayName(row: FecForm2Filing): string | null {
  const parts = [row.candidate_first_name, row.candidate_middle_name, row.candidate_last_name]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0);
  if (parts.length > 0) return parts.join(" ");

  const filed = clean(row.candidate_name);
  if (!filed) return null;
  const comma = filed.indexOf(",");
  if (comma === -1) return filed;
  const last = filed.slice(0, comma).trim();
  const rest = filed.slice(comma + 1).trim();
  if (!last || !rest) return filed;
  return `${rest} ${last}`;
}

function raceTitle(input: {
  office: FederalOffice;
  state: string | null;
  district: string | null;
}): string {
  if (input.office === "president") return "President";
  if (input.office === "senate") {
    return `U.S. Senate, ${stateName(input.state ?? "")}`;
  }
  const name = stateName(input.state ?? "");
  if (input.district === "00") return `U.S. House, ${name} at-large`;
  const districtNumber = Number(input.district);
  return `U.S. House, ${name} District ${districtNumber}`;
}

function raceJurisdiction(input: {
  office: FederalOffice;
  state: string | null;
  district: string | null;
}): string {
  if (input.office === "president") return "United States";
  if (input.office === "senate") return stateName(input.state ?? "");
  if (input.district === "00") return `${stateName(input.state ?? "")} at-large`;
  return `${stateName(input.state ?? "")} District ${Number(input.district)}`;
}

function raceSourceUrl(input: {
  office: FederalOffice;
  cycle: number;
  state: string | null;
  district: string | null;
}): string {
  const officeCode = input.office === "president" ? "P" : input.office === "senate" ? "S" : "H";
  const url = new URL("https://www.fec.gov/data/candidates/");
  url.searchParams.set("election_year", String(input.cycle));
  url.searchParams.set("office", officeCode);
  if (input.office !== "president" && input.state) {
    url.searchParams.set("state", input.state);
  }
  if (input.office === "house" && input.district) {
    url.searchParams.set("district", input.district);
  }
  return url.toString();
}

function filingSourceUrl(
  pdfUrl: string | null | undefined,
  imageNumber: string | null | undefined,
): string | null {
  const pdf = fecHttpsUrl(pdfUrl);
  if (pdf) return pdf;
  const image = (imageNumber ?? "").trim();
  if (!/^\d{6,}$/.test(image)) return null;
  return `https://docquery.fec.gov/cgi-bin/fecimg/?${image}`;
}

function fecHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host !== "fec.gov" && !host.endsWith(".fec.gov")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
