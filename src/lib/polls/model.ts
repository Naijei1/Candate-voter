/** A poll row. None are loaded until a named source is connected. */

export type PollResult = {
  label: string;
  percent: number;
};

export type Poll = {
  pollId: string;
  raceId: string;
  pollster: string;
  sponsor: string | null;
  fieldStart: string;
  fieldEnd: string;
  sampleSize: number | null;
  marginOfError: number | null;
  population: string | null;
  sourceUrl: string;
  results: PollResult[];
};

/** Unweighted mean by label. Returns null when there is nothing to average. */
export function averagePolls(polls: readonly Poll[]): PollResult[] | null {
  if (polls.length === 0) return null;
  const sums = new Map<string, { total: number; count: number }>();
  for (const poll of polls) {
    for (const result of poll.results) {
      if (!Number.isFinite(result.percent)) continue;
      const current = sums.get(result.label) ?? { total: 0, count: 0 };
      current.total += result.percent;
      current.count += 1;
      sums.set(result.label, current);
    }
  }
  if (sums.size === 0) return null;
  return [...sums.entries()]
    .map(([label, value]) => ({ label, percent: Math.round((value.total / value.count) * 10) / 10 }))
    .sort((a, b) => b.percent - a.percent);
}
