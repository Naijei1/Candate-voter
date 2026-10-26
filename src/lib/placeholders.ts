import type { Candidate, Filing, Race } from "@/lib/types";

/**
 * Layout fixtures only. These are not candidates, races, or FEC filings.
 * Replace this module with DynamoDB reads after ingest exists.
 */
export const SAMPLE_LABEL = "Sample";

const races: Race[] = [
  {
    raceId: "president",
    office: "president",
    cycle: null,
    state: null,
    district: null,
    title: "President",
    jurisdiction: "United States",
    sourceUrl: null,
    updatedAt: null,
  },
  {
    raceId: "senate-example",
    office: "senate",
    cycle: null,
    state: null,
    district: null,
    title: "U.S. Senate",
    jurisdiction: "Example state",
    sourceUrl: null,
    updatedAt: null,
  },
  {
    raceId: "house-example",
    office: "house",
    cycle: null,
    state: null,
    district: null,
    title: "U.S. House",
    jurisdiction: "Example district",
    sourceUrl: null,
    updatedAt: null,
  },
];

const candidates: Candidate[] = [
  {
    candidateId: "sample-president-a",
    raceId: "president",
    displayName: "Sample candidate A",
    nameAsFiled: null,
    office: "president",
    partyAffiliation: null,
    fecCandidateId: null,
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: null,
  },
  {
    candidateId: "sample-president-b",
    raceId: "president",
    displayName: "Sample candidate B",
    nameAsFiled: null,
    office: "president",
    partyAffiliation: null,
    fecCandidateId: null,
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: null,
  },
  {
    candidateId: "sample-senate-a",
    raceId: "senate-example",
    displayName: "Sample candidate C",
    nameAsFiled: null,
    office: "senate",
    partyAffiliation: null,
    fecCandidateId: null,
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: null,
  },
  {
    candidateId: "sample-house-a",
    raceId: "house-example",
    displayName: "Sample candidate D",
    nameAsFiled: null,
    office: "house",
    partyAffiliation: null,
    fecCandidateId: null,
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: null,
  },
];

/** Filings stay empty until the Form 2 worker writes them. */
const filings: Filing[] = [];

export function listRaces(): Race[] {
  return races;
}

export function getRace(raceId: string): Race | undefined {
  return races.find((race) => race.raceId === raceId);
}

export function listCandidatesForRace(raceId: string): Candidate[] {
  return candidates.filter((candidate) => candidate.raceId === raceId);
}

export function getCandidate(candidateId: string): Candidate | undefined {
  return candidates.find((candidate) => candidate.candidateId === candidateId);
}

export function listFilingsForCandidate(candidateId: string): Filing[] {
  return filings.filter((filing) => filing.candidateId === candidateId);
}

export function listCandidateIds(): string[] {
  return candidates.map((candidate) => candidate.candidateId);
}

export function listRaceIds(): string[] {
  return races.map((race) => race.raceId);
}
