import type { FederalOffice } from "../types";
import { personMatchKey } from "./dedupe";

/** One FEC id on one contest. Rows are not removed when this list is long. */
export type PersonFiling = {
  fecId: string | null;
  office: FederalOffice;
  state: string | null;
  district: string | null;
  raceId: string;
  writeIn: boolean;
  candidateId: string;
};

const WRITE_IN_CODE = new Set(["W", "WRI"]);

export function isWriteInParty(
  code: string | null | undefined,
  label?: string | null,
): boolean {
  const normalized = (code ?? "").trim().toUpperCase();
  if (WRITE_IN_CODE.has(normalized)) return true;
  return /^write[-\s]?in$/i.test((label ?? "").trim());
}

export function contestPlace(
  raceId: string,
  office: FederalOffice,
): { cycle: number | null; state: string | null; district: string | null; office: FederalOffice } {
  const cycleMatch = /^(\d{4})-/.exec(raceId);
  const cycle = cycleMatch ? Number(cycleMatch[1]) : null;
  const senate = /^\d{4}-senate-([A-Z]{2})$/.exec(raceId);
  if (senate?.[1]) return { cycle, state: senate[1], district: null, office: "senate" };
  const house = /^\d{4}-house-([A-Z]{2})-(\d{2})$/.exec(raceId);
  if (house?.[1] && house[2]) {
    return { cycle, state: house[1], district: house[2], office: "house" };
  }
  return { cycle, state: null, district: null, office };
}

type AlternateLike = {
  candidateId: string;
  fecCandidateId: string | null;
  partyCode: string | null;
  partyLabel: string;
};

export type PersonRow = {
  candidateId: string;
  displayName: string;
  fecCandidateId: string | null;
  partyCode: string | null;
  partyLabel: string;
  raceId: string;
  office: FederalOffice;
  alternateFilings?: readonly AlternateLike[];
  filings?: readonly PersonFiling[];
  writeIn?: boolean;
  multiFiling?: boolean;
};

/** Same-race FEC ids for one display row, keeper first. */
export function personFilingsForRow(row: PersonRow): PersonFiling[] {
  const place = contestPlace(row.raceId, row.office);
  const rows: Array<AlternateLike & { raceId: string }> = [
    {
      candidateId: row.candidateId,
      fecCandidateId: row.fecCandidateId,
      partyCode: row.partyCode,
      partyLabel: row.partyLabel,
      raceId: row.raceId,
    },
    ...(row.alternateFilings ?? []).map((alternate) => ({
      ...alternate,
      raceId: row.raceId,
    })),
  ];
  return dedupeFilings(
    rows.map((item) => ({
      fecId: item.fecCandidateId,
      office: place.office,
      state: place.state,
      district: place.district,
      raceId: item.raceId,
      writeIn: isWriteInParty(item.partyCode, item.partyLabel),
      candidateId: item.candidateId,
    })),
  );
}

/**
 * Attach the same person's filings across contests in one state and year.
 * Every input row is returned. Nothing is hidden.
 */
export function linkPersonFilings<T extends PersonRow>(rows: readonly T[]): T[] {
  const prepared = rows.map((row) => {
    const place = contestPlace(row.raceId, row.office);
    const name = personMatchKey(row.displayName);
    const key = name ? `${place.cycle ?? ""}|${place.state ?? ""}|${name}` : null;
    const filings =
      row.filings && row.filings.length > 0 ? [...row.filings] : personFilingsForRow(row);
    return { row, key, filings };
  });
  const groups = new Map<string, PersonFiling[]>();
  for (const item of prepared) {
    if (!item.key) continue;
    const list = groups.get(item.key) ?? [];
    list.push(...item.filings);
    groups.set(item.key, list);
  }
  return prepared.map((item) => {
    const filings = dedupeFilings(item.key ? (groups.get(item.key) ?? item.filings) : item.filings);
    const writeIn =
      filings.some((filing) => filing.writeIn) ||
      isWriteInParty(item.row.partyCode, item.row.partyLabel);
    return {
      ...item.row,
      filings,
      writeIn,
      multiFiling: filings.length > 1,
    };
  });
}

function dedupeFilings(filings: readonly PersonFiling[]): PersonFiling[] {
  const seen = new Set<string>();
  const unique: PersonFiling[] = [];
  for (const filing of filings) {
    const key = `${filing.raceId}|${filing.candidateId}|${filing.fecId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(filing);
  }
  return unique.sort(
    (a, b) => a.raceId.localeCompare(b.raceId) || (a.fecId ?? "").localeCompare(b.fecId ?? ""),
  );
}
