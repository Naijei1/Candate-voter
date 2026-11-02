import { cyclesFromEnv } from "../data/cycles";
import { createDynamoRepository } from "../data/repository";
import { FecClient, fecApiKeyFromEnv } from "../fec/client";
import { runTotalsIngest, type TotalsIngestSummary } from "./ingest";

/** Leave this much of the Lambda lifetime so the status row can be written. */
export const TOTALS_TIME_RESERVE_MS = 60_000;

type LambdaContext = {
  getRemainingTimeInMillis?: () => number;
};

let repo: ReturnType<typeof createDynamoRepository> | undefined;

export async function handler(event: unknown = {}, context?: LambdaContext): Promise<TotalsIngestSummary> {
  void event;
  repo ??= createDynamoRepository();
  const fec = new FecClient({
    apiKey: fecApiKeyFromEnv(),
    baseUrl: process.env.FEC_API_BASE_URL,
    minDelayMs: numberFromEnv(process.env.FEC_MIN_DELAY_MS) ?? 250,
  });
  return runTotalsIngest({
    repo,
    fec,
    cycles: cyclesFromEnv(),
    shouldContinue: () => remainingMs(context) > TOTALS_TIME_RESERVE_MS,
  });
}

function remainingMs(context: LambdaContext | undefined): number {
  const reported = context?.getRemainingTimeInMillis?.();
  if (typeof reported === "number") return reported;
  return TOTALS_TIME_RESERVE_MS + 1;
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}
