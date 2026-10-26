import {
  planPresidentialDuplicates,
  planSamePersonDuplicates,
  type PresidentialDuplicatePlan,
  type SamePersonDuplicatePlan,
} from "./dedupe";
import type { VoterRepository } from "./repository";
import type { FederalOffice } from "../types";

export type ConsolidationResult = {
  dryRun: boolean;
  plans: PresidentialDuplicatePlan[];
  copiedFilings: number;
};

/**
 * Copy filings from duplicate candidate ids onto the keeper, then mark the
 * extras superseded so list reads skip them. Rows stay in Dynamo. The app
 * role cannot delete items.
 *
 * Read paths already collapse the same normalized name on a race and keep
 * a multi-party note. Applying this script hides the extra rows, so that
 * note then has only the keeper's party. Leave the rows in place when the
 * note should keep listing every FEC id.
 */
export async function consolidateSamePersonDuplicates(
  repo: VoterRepository,
  cycles: readonly number[],
  options: { apply: boolean; office?: FederalOffice | "all" },
): Promise<ConsolidationResult> {
  const office = options.office ?? "all";
  const plans: SamePersonDuplicatePlan[] = [];
  for (const cycle of cycles) {
    const races = await repo.listRacesByCycle(cycle);
    for (const race of races) {
      if (office !== "all" && race.office !== office) continue;
      const candidates = await repo.listCandidatesForRace(race.raceId);
      plans.push(...planSamePersonDuplicates(candidates));
    }
  }
  if (!options.apply) return { dryRun: true, plans, copiedFilings: 0 };
  const copiedFilings = await applyPlans(repo, plans);
  return { dryRun: false, plans, copiedFilings };
}

/**
 * Presidential wrapper. Prefer consolidateSamePersonDuplicates, which
 * covers Senate and House as well.
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
  const copiedFilings = await applyPlans(repo, plans);
  return { dryRun: false, plans, copiedFilings };
}

async function applyPlans(
  repo: VoterRepository,
  plans: readonly SamePersonDuplicatePlan[],
): Promise<number> {
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
  return copiedFilings;
}
