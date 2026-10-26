import { planPresidentialDuplicates, type PresidentialDuplicatePlan } from "./dedupe";
import type { VoterRepository } from "./repository";

export type ConsolidationResult = {
  dryRun: boolean;
  plans: PresidentialDuplicatePlan[];
  copiedFilings: number;
};

/**
 * Copy filings from duplicate presidential candidate ids onto the keeper,
 * then mark the extras superseded so list reads skip them.
 * Existing rows stay in Dynamo until this runs. List reads already collapse
 * the same names. The app role cannot delete items.
 */
export async function consolidatePresidentialDuplicates(
  repo: VoterRepository,
  cycles: readonly number[],
  options: { apply: boolean },
): Promise<ConsolidationResult> {
  const plans: PresidentialDuplicatePlan[] = [];
  for (const cycle of cycles) {
    const races = await repo.listRacesByCycle(cycle);
    for (const race of races) {
      if (race.office !== "president") continue;
      const candidates = await repo.listCandidatesForRace(race.raceId);
      plans.push(...planPresidentialDuplicates(candidates));
    }
  }
  if (!options.apply) return { dryRun: true, plans, copiedFilings: 0 };

  let copiedFilings = 0;
  for (const plan of plans) {
    for (const drop of plan.drop) {
      const filings = await repo.listFilingsForCandidate(drop);
      for (const filing of filings) {
        await repo.upsertFiling({ ...filing, candidateId: plan.keep });
        copiedFilings += 1;
      }
      await repo.markCandidateSuperseded(drop, plan.keep);
    }
  }
  return { dryRun: false, plans, copiedFilings };
}
