import { calendarDay, longDayLabel } from "@/lib/format";
import { stateConfig, type StateConfig } from "@/lib/states";

export type ElectionStatus = { over: boolean; day: string; text: string };

/** Plain status of the general election, e.g. "Kentucky’s general election was Tuesday, November 3, 2026." */
export function electionStatus(state: StateConfig = stateConfig(), now: Date = new Date()): ElectionStatus {
  const today = calendarDay(now, state.displayTimeZone);
  const day = longDayLabel(state.generalElection);
  if (today > state.generalElection) return { over: true, day, text: `${state.name}’s general election was ${day}. It is over.` };
  if (today === state.generalElection) return { over: false, day, text: `Today is election day in ${state.name}: ${day}.` };
  return { over: false, day, text: `${state.name}’s general election is ${day}.` };
}
