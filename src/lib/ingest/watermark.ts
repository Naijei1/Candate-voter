/**
 * Decide how far the cursor can move after a page of ascending timestamps.
 *
 * A short page is the end of the result set, so every timestamp on it is
 * complete. A full page may split a group that shares the maximum timestamp
 * onto the next page, so the cursor stops at the greatest timestamp strictly
 * below that maximum. The FEC filter is inclusive, and filing upserts are
 * idempotent, so re-reading the boundary is safe.
 *
 * When every row on a full page shares one timestamp, the cursor stays put.
 * The current run keeps going by page number. A later run repeats that
 * timestamp instead of skipping the rest of the group.
 */
export function nextWatermark(input: {
  current: string | null;
  timestamps: string[];
  pageIsFull: boolean;
}): string | null {
  if (input.timestamps.length === 0) return input.current;

  const sorted = [...input.timestamps].sort((a, b) => a.localeCompare(b));
  const max = sorted[sorted.length - 1] ?? null;
  if (!max) return input.current;
  if (!input.pageIsFull) return later(input.current, max);

  let belowMax: string | null = null;
  for (const timestamp of sorted) {
    if (timestamp < max) belowMax = timestamp;
  }
  if (!belowMax) return input.current;
  return later(input.current, belowMax);
}

function later(current: string | null, candidate: string): string {
  if (current == null || candidate > current) return candidate;
  return current;
}

/** Keep a cursor from moving backward when a run re-reads older filings. */
export function notBefore(
  floor: string | null,
  candidate: string | null,
): string | null {
  if (candidate == null) return floor;
  return later(floor, candidate);
}
