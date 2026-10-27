import { raceMatchesCycle } from "./cycle-match";
import { linkPersonFilings } from "./person-filings";
import type { Race } from "../types";
import { loadPublicCandidates, type PublicCandidate } from "./view";

type RaceReader = {
  listRacesByCycle(cycle: number): Promise<Race[]>;
  listCandidatesForRace(raceId: string): Promise<import("../types").Candidate[]>;
};

/**
 * Write-in rows also list the same normalized name on other contests in
 * this state and year. Other candidates keep the filings already on the row.
 * No row is removed.
 */
export async function withCrossContestFilings(
  repo: RaceReader,
  candidates: PublicCandidate[],
  race: Race,
): Promise<PublicCandidate[]> {
  if (race.cycle == null || !race.state) return candidates;
  if (!candidates.some((row) => row.writeIn || row.filings.some((filing) => filing.writeIn))) {
    return candidates;
  }
  const cycle = race.cycle;
  const siblings = (await repo.listRacesByCycle(cycle)).filter(
    (item) => item.state === race.state && item.raceId !== race.raceId && raceMatchesCycle(item, cycle),
  );
  const extra = (await Promise.all(siblings.map((item) => loadPublicCandidates(repo, item.raceId)))).flat();
  const linked = linkPersonFilings([...candidates, ...extra]);
  const byId = new Map(linked.map((row) => [row.candidateId, row]));
  return candidates.map((row) => byId.get(row.candidateId) ?? row);
}
