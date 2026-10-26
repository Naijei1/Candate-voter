import { createDynamoRepository } from "../src/lib/data/repository";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { FecClient, fecApiKeyFromEnv } from "../src/lib/fec/client";
import { runIngest } from "../src/lib/ingest/run";
import type { VoterRepository } from "../src/lib/data/repository";

/**
 * Smoke-test and backfill entry.
 *
 *   FEC_API_KEY=DEMO_KEY npm run ingest -- --dry-run --max-pages 1
 *   FEC_API_KEY=... CANDATE_TABLE_NAME=candate-voter npm run ingest -- --max-pages 1
 *
 * `--dry-run` writes to memory and prints the records the accessors read back.
 * It does not call DynamoDB.
 */

type Cli = {
  dryRun: boolean;
  resetWatermark: boolean;
  maxPages?: number;
  from?: string;
};

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  const fec = new FecClient({
    apiKey: fecApiKeyFromEnv(),
    baseUrl: process.env.FEC_API_BASE_URL,
    minDelayMs: positiveInt(process.env.FEC_MIN_DELAY_MS) ?? 250,
  });
  const repo: VoterRepository = cli.dryRun
    ? new MemoryVoterRepository()
    : createDynamoRepository();

  const summary = await runIngest({
    repo,
    fec,
    dryRun: cli.dryRun,
    resetWatermark: cli.resetWatermark,
    maxPages: cli.maxPages,
    perPage: positiveInt(process.env.INGEST_PER_PAGE),
    minLoadTimestamp: cli.from,
  });

  const proof = cli.dryRun ? await readBack(repo, summary.cyclesTouched) : undefined;
  console.log(JSON.stringify({ summary, proof }, null, 2));
}

async function readBack(
  repo: VoterRepository,
  cycles: number[],
): Promise<unknown> {
  const watermarkRow = await repo.getWatermark();
  const races = [];
  for (const cycle of cycles) {
    for (const race of await repo.listRacesByCycle(cycle)) {
      const candidates = await repo.listCandidatesForRace(race.raceId);
      races.push({
        race,
        candidates: await Promise.all(
          candidates.slice(0, 3).map(async (candidate) => ({
            candidate,
            filings: await repo.listFilingsForCandidate(candidate.candidateId),
          })),
        ),
      });
    }
  }

  return {
    watermark: watermarkRow,
    races: races.slice(0, 5),
  };
}

function parseArgs(argv: string[]): Cli {
  const cli: Cli = { dryRun: false, resetWatermark: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") cli.dryRun = true;
    else if (arg === "--reset-watermark") cli.resetWatermark = true;
    else if (arg === "--max-pages") {
      cli.maxPages = requiredInt(argv[i + 1], "--max-pages");
      i += 1;
    } else if (arg === "--from") {
      const value = argv[i + 1];
      if (!value) throw new Error("--from requires a FEC load timestamp");
      cli.from = value;
      i += 1;
    } else if (arg === "--help") {
      console.log(
        "Usage: npm run ingest -- [--dry-run] [--max-pages N] [--from TIMESTAMP] [--reset-watermark]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument ${arg}`);
    }
  }
  return cli;
}

function requiredInt(value: string | undefined, flag: string): number {
  const parsed = positiveInt(value);
  if (!parsed) throw new Error(`${flag} requires a positive integer`);
  return parsed;
}

function positiveInt(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Ingest failed";
  console.error(message);
  process.exitCode = 1;
});
