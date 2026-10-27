import type { Race } from "../types";
import { parseCycle } from "./cycles";

/** Election year encoded in a race id, such as `2026-senate-KY`. */
export function cycleFromRaceId(raceId: string): number | null {
  const match = /^(\d{4})-/.exec(raceId.trim());
  if (!match?.[1]) return null;
  return parseCycle(match[1]);
}

/**
 * A row belongs to `cycle` only when both the stored cycle and the race id
 * year agree. A 2024 id indexed under 2026 is not a 2026 contest.
 */
export function raceMatchesCycle(
  race: Pick<Race, "raceId" | "cycle">,
  cycle: number,
): boolean {
  if (race.cycle != null && race.cycle !== cycle) return false;
  const fromId = cycleFromRaceId(race.raceId);
  if (fromId != null && fromId !== cycle) return false;
  return true;
}
