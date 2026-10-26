import { createDynamoRepository } from "../data/repository";
import { FecClient, fecApiKeyFromEnv } from "../fec/client";
import { runIngest, type IngestSummary } from "./run";

export type IngestLambdaEvent = {
  maxPages?: number;
  perPage?: number;
  resetWatermark?: boolean;
  minLoadTimestamp?: string | null;
};

/**
 * EventBridge target. The DynamoDB client is cached for the execution
 * environment on first use. The function reads `CANDATE_TABLE_NAME` and
 * `FEC_API_KEY` from the environment.
 */
let repo: ReturnType<typeof createDynamoRepository> | undefined;

export async function handler(
  event: IngestLambdaEvent = {},
): Promise<IngestSummary> {
  repo ??= createDynamoRepository();
  const fec = new FecClient({
    apiKey: fecApiKeyFromEnv(),
    baseUrl: process.env.FEC_API_BASE_URL,
    minDelayMs: numberFromEnv(process.env.FEC_MIN_DELAY_MS) ?? 250,
  });

  return runIngest({
    repo,
    fec,
    maxPages: event.maxPages ?? numberFromEnv(process.env.INGEST_MAX_PAGES),
    perPage: event.perPage ?? numberFromEnv(process.env.INGEST_PER_PAGE),
    resetWatermark: event.resetWatermark ?? false,
    minLoadTimestamp: event.minLoadTimestamp,
    dryRun: false,
  });
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}
