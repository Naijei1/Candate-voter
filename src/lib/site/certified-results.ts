import data from "../../../data/ky-certified-results.json";
import calendar from "../../../data/ky-election-calendar.json";
import { calendarDay } from "../format";
import { stateConfig } from "../states";

const KY = stateConfig("KY");

// Literal list keeps exact race-id types for the results importer; a test checks it matches the registry.
export const KY_FEDERAL_RACES = [
  "2026-senate-KY",
  "2026-house-KY-01",
  "2026-house-KY-02",
  "2026-house-KY-03",
  "2026-house-KY-04",
  "2026-house-KY-05",
  "2026-house-KY-06",
] as const;

export const KY_ELECTION_CALENDAR = calendar;
export const CONGRESSIONAL_TERM_START = "2027-01-03T17:00:00Z";
export const KY_RESULTS_SOURCE = KY.results.sourceName;

export type CertifiedCandidate = {
  name: string;
  party?: string;
  candidateId?: string;
  votes: number;
  winner: boolean;
};

type ResultSource = { raceId: string; sourceUrl: string; retrievedAt: string };
export type CertifiedResult = ResultSource & {
  status: "certified";
  candidates: CertifiedCandidate[];
  sourcePages: number[];
  countyCount: number;
} & ({ election: "primary"; party: string; certificationDate: string | null } | { election: "general"; certificationDate: string });

export type PendingResult = ResultSource & {
  election: "general";
  status: "pending";
  scheduledCertificationDate: string;
};

const results = data as (CertifiedResult | PendingResult)[];
type Primary = CertifiedResult & { election: "primary" };

export function generalResult(raceId: string) {
  return results.find((result): result is PendingResult | (CertifiedResult & { election: "general" }) =>
    result.raceId === raceId && result.election === "general",
  );
}

export function primaryResults(raceId: string): Primary[] {
  return results.filter((result): result is Primary =>
    result.raceId === raceId && result.election === "primary" && result.status === "certified",
  );
}

export function certifiedWinner(result: CertifiedResult) {
  return result.candidates.find((person) => person.winner);
}

export function shortElectionDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date));
}

/** Past, present, or future wording for a certification deadline. Does not name a winner. */
export function certificationPhrase(date: string, now = new Date()): string {
  const today = calendarDay(now);
  const label = shortElectionDate(date);
  if (date < today) return `Certification was due ${label}.`;
  if (date === today) return `Certification is due ${label}.`;
  return `Certification due ${label}.`;
}

export type ElectionStatus = {
  elected?: boolean;
  primary?: "won" | "lost";
  primaryVotes?: number;
};

function normalizedName(name: string) {
  return name.normalize("NFKD").toLowerCase().replace(/['’"“”.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function resultCandidateMatches(candidate: Pick<CertifiedCandidate, "name" | "candidateId">, person: { id?: string; name: string }) {
  if (candidate.candidateId && person.id) return candidate.candidateId === person.id;
  return normalizedName(candidate.name) === normalizedName(person.name);
}

export function primaryProfileId(result: Primary, candidate: CertifiedCandidate) {
  return `${result.raceId}-primary-${normalizedName(result.party).replaceAll(" ", "-")}-${normalizedName(candidate.name).replaceAll(" ", "-")}`;
}

export function primaryCandidateById(id: string) {
  for (const raceId of KY_FEDERAL_RACES) {
    for (const result of primaryResults(raceId)) {
      const candidate = result.candidates.find((person) => person.candidateId === id || primaryProfileId(result, person) === id);
      if (candidate) return { raceId, result, candidate };
    }
  }
  return null;
}

export function candidateElectionStatus(raceId: string, person: { id?: string; name: string; party: string }): ElectionStatus {
  const general = generalResult(raceId);
  const winner = general?.status === "certified" ? certifiedWinner(general) : null;
  const primary = primaryResults(raceId)
    .find((result) => result.party === person.party)
    ?.candidates.find((candidate) => resultCandidateMatches(candidate, person));
  return {
    elected: Boolean(winner && resultCandidateMatches(winner, person)),
    primary: primary ? (primary.winner ? "won" : "lost") : undefined,
    primaryVotes: primary?.votes,
  };
}
