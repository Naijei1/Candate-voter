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
  status: "success" | "error";
  error: string | null;
};

export async function runTotalsIngest(options: {
  repo: VoterRepository;
  fec: Pick<FecClient, "getCandidateTotals" | "getCandidateCommittees" | "getScheduleEByCandidate" | "iterateCommitteeReports">;
  cycles: number[];
  now?: () => Date;
}): Promise<TotalsIngestSummary> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  let candidatesSeen = 0;
  let directUpserted = 0;
  let periodsUpserted = 0;
  let outsideUpserted = 0;
  let skipped = 0;

  try {
    const seen = new Set<string>();
    for (const cycle of options.cycles) {
      const races = await options.repo.listRacesByCycle(cycle);
      for (const race of races) {
        if (race.cycle !== cycle) continue;
        const candidates = await options.repo.listCandidatesForRace(race.raceId);
        for (const candidate of candidates) {
          const fecId = candidate.fecCandidateId;
          if (!fecId || seen.has(`${cycle}#${fecId}`)) continue;
          seen.add(`${cycle}#${fecId}`);
          candidatesSeen += 1;
          const updatedAt = now().toISOString();
          const committees = await options.fec.getCandidateCommittees(fecId, cycle);
          const principal = principalCommittee(committees);
          const totals = await options.fec.getCandidateTotals(fecId, cycle);
          if (totals) {
            const direct = mapCandidateCycleTotal(totals, {
              raceId: candidate.raceId,
              name: candidate.displayName,
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
            for await (const page of options.fec.iterateCommitteeReports(principal.committeeId, cycle)) {
              for (const report of page) {
                const period = mapCommitteeReport(report, {
                  candidateId: fecId,
                  raceId: candidate.raceId,
                  name: candidate.displayName,
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
          const outsideRows = await options.fec.getScheduleEByCandidate(fecId, cycle);
          for (const row of outsideRows) {
            const outside = mapScheduleEByCandidate(row, {
              raceId: candidate.raceId,
              candidateName: candidate.displayName,
              updatedAt,
            });
            if (!outside) {
              skipped += 1;
              continue;
            }
            await options.repo.upsertFinanceOutside(outside);
            outsideUpserted += 1;
          }
        }
      }
    }
    const finishedAt = now().toISOString();
    await options.repo.saveTotalsWatermark(
      watermark({
        updatedAt: finishedAt,
        status: "success",
        error: null,
        candidatesSeen,
        directUpserted,
        periodsUpserted,
        outsideUpserted,
      }),
    );
    return {
      startedAt,
      finishedAt,
      candidatesSeen,
      directUpserted,
      periodsUpserted,
      outsideUpserted,
      skipped,
      status: "success",
      error: null,
    };
  } catch (error) {
    const finishedAt = now().toISOString();
    const message = error instanceof Error ? error.name : "Error";
    try {
      await options.repo.saveTotalsWatermark(
        watermark({
          updatedAt: finishedAt,
          status: "error",
          error: message,
          candidatesSeen,
          directUpserted,
          periodsUpserted,
          outsideUpserted,
        }),
      );
    } catch {
      // The caller still receives the failure.
    }
    throw error;
  }
}

function watermark(input: {
  updatedAt: string;
  status: TotalsWatermark["lastStatus"];
  error: string | null;
  candidatesSeen: number;
  directUpserted: number;
  periodsUpserted: number;
  outsideUpserted: number;
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
    updatedAt: input.updatedAt,
  };
}
