import snapshot from "@/content/fec/2026-senate-ky.json";
import { normalizePersonName } from "@/lib/data/names";
import type { PublicCandidate } from "@/lib/data/view";

export const SHOWCASE_RACE_ID = "2026-senate-KY";

const STATUS_LABEL: Record<string, string> = {
  C: "Statutory candidate",
  F: "Statutory candidate for future election",
  N: "Not yet a statutory candidate",
  P: "Statutory candidate in prior cycle",
};

export type ShowcaseCandidate = {
  fecCandidateId: string;
  displayName: string;
  nameAsFiled: string;
  partyCode: string | null;
  partyLabel: string;
  incumbentCode: string | null;
  incumbentLabel: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  filingPdf: string | null;
  filingDate: string | null;
  committeeName: string | null;
  committeeId: string | null;
  committeeWebsite: string | null;
  profileUrl: string;
  committeeUrl: string | null;
};

export type ShowcaseRace = {
  raceId: string;
  retrievedAt: string;
  sourcePage: string;
  dictionary: string;
  candidates: ShowcaseCandidate[];
};

const raw = snapshot as {
  raceId: string;
  retrievedAt: string;
  sourcePage: string;
  dictionary: string;
  candidates: Array<{
    fecCandidateId: string;
    name: string;
    party: string | null;
    partyFull: string | null;
    incumbentChallenge: string | null;
    incumbentChallengeFull: string | null;
    candidateStatus: string | null;
    filingPdf: string | null;
    filingReceiptDate: string | null;
    committeeId: string | null;
    committeeName: string | null;
    committeeWebsite: string | null;
  }>;
};

export function showcaseRace(): ShowcaseRace | null {
  if (raw.raceId !== SHOWCASE_RACE_ID) return null;
  return {
    raceId: raw.raceId,
    retrievedAt: raw.retrievedAt,
    sourcePage: raw.sourcePage,
    dictionary: raw.dictionary,
    candidates: raw.candidates.map(presentShowcase),
  };
}

export function showcaseCandidate(id: string): ShowcaseCandidate | null {
  return showcaseRace()?.candidates.find((candidate) => candidate.fecCandidateId === id) ?? null;
}

export type RaceCard = {
  id: string;
  name: string;
  party: string;
  line: string;
};

export function cardsForRace(
  raceId: string,
  live: readonly PublicCandidate[],
  filingsLoaded: boolean,
): { cards: RaceCard[]; summary: string | null; fecList: boolean } {
  const showcase = raceId === SHOWCASE_RACE_ID ? showcaseRace() : null;
  if (filingsLoaded && live.length > 0) {
    const cards = live.map((candidate) => {
      const extra = showcase?.candidates.find((row) => row.fecCandidateId === candidate.fecCandidateId);
      const incumbency = extra?.incumbentLabel;
      return {
        id: candidate.candidateId,
        name: candidate.displayName,
        party: candidate.partyLabel,
        line: incumbency ? `Filing stored · ${incumbency}` : "Filing stored · Ballot not verified",
      };
    });
    return { cards, summary: null, fecList: false };
  }
  if (!showcase) return { cards: [], summary: null, fecList: false };
  return {
    fecList: true,
    summary: `${showcase.candidates.length} on the FEC candidate list.`,
    cards: showcase.candidates.map((candidate) => ({
      id: candidate.fecCandidateId,
      name: candidate.displayName,
      party: candidate.partyLabel,
      line: [candidate.statusLabel, candidate.incumbentLabel].filter(Boolean).join(" · "),
    })),
  };
}

function presentShowcase(row: (typeof raw.candidates)[number]): ShowcaseCandidate {
  const filed = row.name?.trim() || row.fecCandidateId;
  return {
    fecCandidateId: row.fecCandidateId,
    displayName: displayFromFec(filed),
    nameAsFiled: filed,
    partyCode: row.party,
    partyLabel: partyText(row.partyFull, row.party),
    incumbentCode: row.incumbentChallenge,
    incumbentLabel: row.incumbentChallengeFull,
    statusCode: row.candidateStatus,
    statusLabel: row.candidateStatus ? STATUS_LABEL[row.candidateStatus] ?? null : null,
    filingPdf: httpsOrNull(row.filingPdf),
    filingDate: row.filingReceiptDate,
    committeeName: row.committeeName,
    committeeId: row.committeeId,
    committeeWebsite: reportedWebsite(row.committeeWebsite),
    profileUrl: `https://www.fec.gov/data/candidate/${row.fecCandidateId}/`,
    committeeUrl: row.committeeId
      ? `https://www.fec.gov/data/committee/${row.committeeId}/`
      : null,
  };
}

function displayFromFec(name: string): string {
  const normalized = normalizePersonName(name) ?? name;
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0] && parts[1]) return `${parts[1]} ${parts[0]}`;
  return normalized;
}

function partyText(full: string | null, code: string | null): string {
  const text = full?.trim();
  if (text) {
    return text
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return code?.trim() || "Affiliation not reported";
}

function httpsOrNull(value: string | null): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function reportedWebsite(value: string | null): string | null {
  const text = value?.trim() ?? "";
  if (!text || /^none$/i.test(text)) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
