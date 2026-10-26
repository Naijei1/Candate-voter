/**
 * Election years the home index queries.
 *
 * Races are listed with Query on `gsi1pk = CYCLE#<year>`. The page does not
 * scan the table. The default window is the previous UTC calendar year
 * through six years ahead, which covers the current House cycle, odd-year
 * specials, and the next presidential cycle. `CANDATE_CYCLES` overrides it
 * with a comma-separated list of years.
 */

const MIN_CYCLE = 1980;
const MAX_CYCLE = 2100;

/** Election year in the same range `CANDATE_CYCLES` accepts. */
export function parseCycle(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < MIN_CYCLE || parsed > MAX_CYCLE) {
    return null;
  }
  return parsed;
}

export function defaultCycles(now: Date = new Date()): number[] {
  const year = now.getUTCFullYear();
  const start = Math.max(MIN_CYCLE, year - 1);
  const end = Math.min(MAX_CYCLE, year + 6);
  const cycles: number[] = [];
  for (let cycle = start; cycle <= end; cycle += 1) {
    cycles.push(cycle);
  }
  return cycles;
}

export function cyclesFromEnv(
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): number[] {
  const raw = env.CANDATE_CYCLES?.trim();
  if (!raw) return defaultCycles(now);

  const cycles = new Set<number>();
  for (const part of raw.split(",")) {
    const parsed = parseCycle(part);
    if (parsed == null) continue;
    cycles.add(parsed);
  }
  return [...cycles].sort((a, b) => a - b);
}

/** Compact label for the years a query actually asked for. */
export function formatCycleList(cycles: readonly number[]): string {
  if (cycles.length === 0) return "none";
  const sorted = [...cycles].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  const contiguous = sorted.every(
    (year, index) => index === 0 || year === (sorted[index - 1] ?? year) + 1,
  );
  if (contiguous) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.join(", ");
}
