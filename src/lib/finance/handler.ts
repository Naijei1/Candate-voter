import { cyclesFromEnv } from "../data/cycles";
import { createDynamoRepository } from "../data/repository";
import { FecClient, fecApiKeyFromEnv } from "../fec/client";
import { runTotalsIngest, type TotalsIngestSummary } from "./ingest";

let repo: ReturnType<typeof createDynamoRepository> | undefined;

export async function handler(): Promise<TotalsIngestSummary> {
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
  });
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}
