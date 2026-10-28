import { logReadError } from "../data/read";
import type { ApiRepository } from "../api/deps";
import type { ChatSource } from "./types";

/**
 * Citation `as_of` for an Ask answer.
 * A stored ingest `updatedAt` is the same instant the race page prints as
 * "Data refreshed". A row `updatedAt` is only a fallback, and a year that
 * cannot be a refresh (the old 2028 stamp) is not shown.
 */
export function pageRefreshAsOf(
  refresh: string | null | undefined,
  recordAt: string | null | undefined,
  now: Date = new Date(),
): string {
  const page = refresh?.trim() ?? "";
  if (page) return page;
  const record = recordAt?.trim() ?? "";
  if (!record || record.toLowerCase() === "unknown") return record || "unknown";
  if (stampYearImplausible(record, now)) return "unknown";
  return record;
}

export function alignSourceAsOf(
  source: ChatSource,
  refreshedAt: string | null | undefined,
  now: Date = new Date(),
): ChatSource {
  return { ...source, as_of: pageRefreshAsOf(refreshedAt, source.as_of, now) };
}

/** Ingest cursor write time. Null when the cursor is missing or the read fails. */
export async function readIngestRefreshedAt(
  repo: Pick<ApiRepository, "getWatermark">,
): Promise<string | null> {
  try {
    return (await repo.getWatermark())?.updatedAt?.trim() || null;
  } catch (error) {
    logReadError("getWatermark", error);
    return null;
  }
}

function stampYearImplausible(value: string, now: Date): boolean {
  const year = /^(\d{4})\b/.exec(value);
  if (!year?.[1]) return false;
  const parsed = Number(year[1]);
  return parsed > now.getUTCFullYear() + 1 || parsed < 2000;
}
