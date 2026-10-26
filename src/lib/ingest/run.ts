import { mapForm2Filing, normalizeLoadTimestamp } from "../fec/map-form2";
import type { FecClient } from "../fec/client";
import { nextWatermark, notBefore } from "./watermark";
import type { VoterRepository } from "../data/repository";
import type { IngestWatermark } from "../types";

export type IngestLogger = {
  info: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
};

export type IngestSummary = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  pagesFetched: number;
  filingsSeen: number;
  filingsUpserted: number;
  candidatesApplied: number;
  candidatesKeptNewer: number;
  racesTouched: number;
  cyclesTouched: number[];
  skipped: number;
  skipReasons: Record<string, number>;
  watermark: string | null;
  stoppedBecause: "complete" | "max_pages";
};

export type RunIngestOptions = {
  repo: VoterRepository;
  fec: Pick<FecClient, "iterateForm2">;
  now?: () => Date;
  maxPages?: number;
  perPage?: number;
  /** Overrides the stored cursor for this run. */
  minLoadTimestamp?: string | null;
  resetWatermark?: boolean;
  dryRun?: boolean;
  logger?: IngestLogger;
};

export async function runIngest(options: RunIngestOptions): Promise<IngestSummary> {
  const now = options.now ?? (() => new Date());
  const logger = options.logger ?? consoleLogger();
  const startedAt = now().toISOString();
  const stored = options.resetWatermark ? null : await options.repo.getWatermark();
  const storedCursor = stored?.lastLoadTimestamp ?? null;
  let cursor =
    options.minLoadTimestamp !== undefined
      ? options.minLoadTimestamp
      : storedCursor;

  const skipReasons: Record<string, number> = {};
  const races = new Set<string>();
  const cycles = new Set<number>();
  let pagesFetched = 0;
  let filingsSeen = 0;
  let filingsUpserted = 0;
  let candidatesApplied = 0;
  let candidatesKeptNewer = 0;
  let skipped = 0;
  let stoppedBecause: IngestSummary["stoppedBecause"] = "complete";

  const perPage = options.perPage ?? 100;

  try {
    for await (const page of options.fec.iterateForm2({
      minLoadTimestamp: cursor,
      perPage,
      maxPages: options.maxPages,
    })) {
      pagesFetched += 1;
      const retrievedAt = now().toISOString();
      const timestamps: string[] = [];

      for (const row of page.results) {
        filingsSeen += 1;
        const normalized = normalizeLoadTimestamp(row.load_timestamp);
        if (normalized) timestamps.push(normalized);

        const mapped = mapForm2Filing(row, { retrievedAt });
        if (!mapped.ok) {
          skipped += 1;
          skipReasons[mapped.reason] = (skipReasons[mapped.reason] ?? 0) + 1;
          continue;
        }

        await options.repo.upsertRace(mapped.race);
        races.add(mapped.race.raceId);
        if (mapped.race.cycle != null) cycles.add(mapped.race.cycle);
        const candidateResult = await options.repo.upsertCandidate(mapped.candidate);
        if (candidateResult === "applied") candidatesApplied += 1;
        else candidatesKeptNewer += 1;
        await options.repo.upsertFiling(mapped.filing);
        filingsUpserted += 1;
      }

      cursor = nextWatermark({
        current: cursor,
        timestamps,
        pageIsFull: page.results.length >= page.perPage,
      });
      const persistedCursor = notBefore(storedCursor, cursor);

      await options.repo.saveWatermark(
        watermarkBody({
          cursor: persistedCursor,
          now: retrievedAt,
          status: "running",
          error: null,
          pagesFetched,
          filingsUpserted,
          skipped,
        }),
      );

      logger.info("ingest page stored", {
        page: page.page,
        pages: page.pages,
        rows: page.results.length,
        watermark: persistedCursor,
        dryRun: options.dryRun ?? false,
      });

      const hitCap = options.maxPages != null && pagesFetched >= options.maxPages;
      if (hitCap && page.results.length >= page.perPage) {
        stoppedBecause = "max_pages";
      }
      if (hitCap) break;
    }

    const finishedAt = now().toISOString();
    const persistedCursor = notBefore(storedCursor, cursor);
    await options.repo.saveWatermark(
      watermarkBody({
        cursor: persistedCursor,
        now: finishedAt,
        status: "success",
        error: null,
        pagesFetched,
        filingsUpserted,
        skipped,
      }),
    );

    return {
      dryRun: options.dryRun ?? false,
      startedAt,
      finishedAt,
      pagesFetched,
      filingsSeen,
      filingsUpserted,
      candidatesApplied,
      candidatesKeptNewer,
      racesTouched: races.size,
      cyclesTouched: [...cycles].sort((a, b) => a - b),
      skipped,
      skipReasons,
      watermark: persistedCursor,
      stoppedBecause,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    const persistedCursor = notBefore(storedCursor, cursor);
    logger.error("ingest failed", {
      message,
      watermark: persistedCursor,
      pagesFetched,
    });
    try {
      await options.repo.saveWatermark(
        watermarkBody({
          cursor: persistedCursor,
          now: now().toISOString(),
          status: "error",
          error: message,
          pagesFetched,
          filingsUpserted,
          skipped,
        }),
      );
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error ? saveError.message : "cursor save failed";
      logger.error("failed to save ingest cursor", { message: saveMessage });
    }
    throw error;
  }
}

function watermarkBody(input: {
  cursor: string | null;
  now: string;
  status: IngestWatermark["lastStatus"];
  error: string | null;
  pagesFetched: number;
  filingsUpserted: number;
  skipped: number;
}): IngestWatermark {
  return {
    source: "fec-efile-form2",
    lastLoadTimestamp: input.cursor,
    lastRunAt: input.now,
    lastStatus: input.status,
    lastError: input.error,
    pagesFetched: input.pagesFetched,
    filingsUpserted: input.filingsUpserted,
    skipped: input.skipped,
  };
}

function consoleLogger(): IngestLogger {
  return {
    info: (message, extra) => {
      console.log(JSON.stringify({ level: "info", message, ...extra }));
    },
    error: (message, extra) => {
      console.error(JSON.stringify({ level: "error", message, ...extra }));
    },
  };
}
