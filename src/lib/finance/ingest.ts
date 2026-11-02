import type { VoterRepository } from "../data/repository";
import type { FecClient } from "../fec/client";
import { mapCandidateCycleTotal, mapCommitteeReport, mapScheduleEByCandidate, principalCommittee } from "./map";
import type { TotalsWatermark } from "./model";

export type TotalsIngestSummary = {
  startedAt: string;
  finishedAt: string;
  candidatesSeen: number;
  directUpserted: number;
  periodsUpserted: number;
  outsideUpserted: number;
  skipped: number;
  status: "success" | "partial" | "error";
  error: string | null;
  cursorCycle: number | null;
  cursorCandidateId: string | null;
};

type WorkItem = {
  cycle: number;
  fecId: string;
  raceId: string;
  name: string;
};

/**
 * Stop about a minute before the Lambda is killed.
 * `shouldContinue` returns false when the remaining time is inside that reserve.
 */
export async function runTotalsIngest(options: {
  repo: VoterRepository;
  fec: Pick<FecClient, "getCandidateTotals" | "getCandidateCommittees" | "getScheduleEByCandidate" | "iterateCommitteeReports">;
  cycles: number[];
  now?: () => Date;
  shouldContinue?: () => boolean;
}): Promise<TotalsIngestSummary> {
  const now = options.now ?? (() => new Date());
  const shouldContinue = options.shouldContinue ?? (() => true);
  const startedAt = now().toISOString();
  let candidatesSeen = 0;
  let directUpserted = 0;
  let periodsUpserted = 0;
  let outsideUpserted = 0;
  let skipped = 0;
  const prior = await options.repo.getTotalsWatermark();
  const resume = prior?.lastStatus === "partial" || prior?.lastStatus === "error";
  let cursorCycle = resume ? prior?.cursorCycle ?? null : null;
  let cursorCandidateId = resume ? prior?.cursorCandidateId ?? null : null;

  const save = async (status: TotalsIngestSummary["status"], error: string | null) => {
    const updatedAt = now().toISOString();
    await options.repo.saveTotalsWatermark(
      watermark({
        updatedAt,
        status,
        error,
        candidatesSeen,
        directUpserted,
        periodsUpserted,
        outsideUpserted,
        cursorCycle: status === "success" ? null : cursorCycle,
        cursorCandidateId: status === "success" ? null : cursorCandidateId,
      }),
    );
    return {
      startedAt,
      finishedAt: updatedAt,
      candidatesSeen,
      directUpserted,
      periodsUpserted,
      outsideUpserted,
      skipped,
      status,
      error,
      cursorCycle: status === "success" ? null : cursorCycle,
      cursorCandidateId: status === "success" ? null : cursorCandidateId,
    };
  };

  try {
    const work = await listWork(options.repo, options.cycles);
    for (const item of work) {
      if (isAtOrBeforeCursor(item, cursorCycle, cursorCandidateId)) continue;
      if (!shouldContinue()) {
        return save("partial", "Stopped with time reserved so the next run can continue.");
      }
      candidatesSeen += 1;
      const updatedAt = now().toISOString();
      const committees = await options.fec.getCandidateCommittees(item.fecId, item.cycle);
      const principal = principalCommittee(committees);
      const totals = await options.fec.getCandidateTotals(item.fecId, item.cycle);
      if (totals) {
        const direct = mapCandidateCycleTotal(totals, {
          raceId: item.raceId,
          name: item.name,
          committeeId: principal?.committeeId ?? null,
          committeeName: principal?.committeeName ?? null,
          updatedAt,
        });
        if (direct) {
          await options.repo.upsertFinanceDirect(direct);
          directUpserted += 1;
        } else skipped += 1;
      }
      if (principal) {
        for await (const page of options.fec.iterateCommitteeReports(principal.committeeId, item.cycle)) {
          for (const report of page) {
            const period = mapCommitteeReport(report, {
              candidateId: item.fecId,
              raceId: item.raceId,
              name: item.name,
              committeeId: principal.committeeId,
              committeeName: principal.committeeName,
              updatedAt,
            });
            if (!period) continue;
            await options.repo.upsertFinanceDirect(period);
            periodsUpserted += 1;
          }
        }
      }
      const outsideRows = await options.fec.getScheduleEByCandidate(item.fecId, item.cycle);
      for (const row of outsideRows) {
        const outside = mapScheduleEByCandidate(row, {
          raceId: item.raceId,
          candidateName: item.name,
          updatedAt,
        });
        if (!outside) {
          skipped += 1;
          continue;
        }
        await options.repo.upsertFinanceOutside(outside);
        outsideUpserted += 1;
      }
      cursorCycle = item.cycle;
      cursorCandidateId = item.fecId;
    }
    return save("success", null);
  } catch (error) {
    const message = error instanceof Error ? error.name : "Error";
    try {
      return await save("error", message);
    } catch {
      return {
        startedAt,
        finishedAt: now().toISOString(),
        candidatesSeen,
        directUpserted,
        periodsUpserted,
        outsideUpserted,
        skipped,
        status: "error",
        error: message,
        cursorCycle,
        cursorCandidateId,
      };
    }
  }
}

async function listWork(repo: VoterRepository, cycles: number[]): Promise<WorkItem[]> {
  const work: WorkItem[] = [];
  const seen = new Set<string>();
  for (const cycle of [...cycles].sort((a, b) => a - b)) {
    const races = await repo.listRacesByCycle(cycle);
    for (const race of races) {
      if (race.cycle !== cycle) continue;
      const candidates = await repo.listCandidatesForRace(race.raceId);
      for (const candidate of candidates) {
        const fecId = candidate.fecCandidateId;
        if (!fecId) continue;
        const key = `${cycle}#${fecId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        work.push({ cycle, fecId, raceId: candidate.raceId, name: candidate.displayName });
      }
    }
  }
  work.sort((a, b) => a.cycle - b.cycle || a.fecId.localeCompare(b.fecId));
  return work;
}

function isAtOrBeforeCursor(item: WorkItem, cycle: number | null, candidateId: string | null): boolean {
  if (cycle == null || !candidateId) return false;
  if (item.cycle < cycle) return true;
  if (item.cycle === cycle && item.fecId <= candidateId) return true;
  return false;
}

function watermark(input: {
  updatedAt: string;
  status: TotalsWatermark["lastStatus"];
  error: string | null;
  candidatesSeen: number;
  directUpserted: number;
  periodsUpserted: number;
  outsideUpserted: number;
  cursorCycle: number | null;
  cursorCandidateId: string | null;
}): TotalsWatermark {
  return {
    source: "fec-totals",
    lastRunAt: input.updatedAt,
    lastStatus: input.status,
    lastError: input.error,
    candidatesSeen: input.candidatesSeen,
    directUpserted: input.directUpserted,
    periodsUpserted: input.periodsUpserted,
    outsideUpserted: input.outsideUpserted,
    cursorCycle: input.cursorCycle,
    cursorCandidateId: input.cursorCandidateId,
    updatedAt: input.updatedAt,
  };
}
