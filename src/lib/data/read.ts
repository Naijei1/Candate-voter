import { cache } from "react";
import { cyclesFromEnv } from "./cycles";
import { createDynamoRepository, type VoterRepository } from "./repository";
import type { Candidate, Filing, IngestWatermark, Race } from "../types";

export { racesByOffice } from "../races";

/**
 * Server-component reads. Each function calls `createDynamoRepository()`.
 * Callers render an empty state when a query returns no rows.
 */

export function logReadError(operation: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`DynamoDB ${operation} failed: ${name}: ${message}`);
}

export async function listRacesForCycles(
  repo: Pick<VoterRepository, "listRacesByCycle">,
  cycles: readonly number[],
): Promise<Array<{ cycle: number; races: Race[] }>> {
  const groups = await Promise.all(
    cycles.map(async (cycle) => ({
      cycle,
      races: await repo.listRacesByCycle(cycle),
    })),
  );
  return groups.filter((group) => group.races.length > 0);
}

export async function readRaceIndex(
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): Promise<{ cycles: number[]; groups: Array<{ cycle: number; races: Race[] }> }> {
  const cycles = cyclesFromEnv(env, now);
  const groups = await listRacesForCycles(createDynamoRepository(), cycles);
  return { cycles, groups };
}

export const readRace = cache(async (raceId: string): Promise<Race | null> => {
  return createDynamoRepository().getRace(raceId);
});

export const readCandidate = cache(
  async (candidateId: string): Promise<Candidate | null> => {
    return createDynamoRepository().getCandidate(candidateId);
  },
);

export const readCandidatesForRace = cache(
  async (raceId: string): Promise<Candidate[]> => {
    const candidates = await createDynamoRepository().listCandidatesForRace(raceId);
    return sortCandidates(candidates);
  },
);

export const readWatermark = cache(
  async (): Promise<IngestWatermark | null> => {
    return createDynamoRepository().getWatermark();
  },
);

export const readFilingsForCandidate = cache(
  async (candidateId: string): Promise<Filing[]> => {
    const filings =
      await createDynamoRepository().listFilingsForCandidate(candidateId);
    return sortFilings(filings);
  },
);

/** Alphabetical by display name. Party is not a sort key. */
export function sortCandidates(candidates: readonly Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    const byName = a.displayName.localeCompare(b.displayName, "en");
    if (byName !== 0) return byName;
    return a.candidateId.localeCompare(b.candidateId);
  });
}

/** Newest FEC load timestamp first. This is chronology, not a ranking. */
export function sortFilings(filings: readonly Filing[]): Filing[] {
  return [...filings].sort((a, b) => {
    const byLoad = (b.fecLoadTimestamp ?? "").localeCompare(a.fecLoadTimestamp ?? "");
    if (byLoad !== 0) return byLoad;
    return b.filingId.localeCompare(a.filingId);
  });
}
