import type { Race } from "../types";

/**
 * U.S. presidential general elections fall in years divisible by 4
 * (2024, 2028, 2032). Midterms are the other even years (2022, 2026, 2030).
 */

export function isPresidentialElectionYear(year: number): boolean {
  return year % 4 === 0;
}

export function isMidtermCycle(year: number): boolean {
  return year % 2 === 0 && !isPresidentialElectionYear(year);
}

export type BallotRole =
  | "presidential-general"
  | "out-of-cycle-presidential-filing"
  | "federal-contest";

export type ContestAnnotation = {
  ballotRole: BallotRole;
  /** Set when a stored presidential race is not the general election for that cycle. */
  ballotNote: string | null;
};

export type CycleCalendar = {
  cycle: number;
  presidentialGeneralElection: boolean;
  midterm: boolean;
  /** Offices on the general-election ballot. Out-of-cycle presidential filings are omitted. */
  onBallot: Array<"president" | "senate" | "house">;
  note: string | null;
};

export function cycleCalendar(cycle: number): CycleCalendar {
  const presidentialGeneralElection = isPresidentialElectionYear(cycle);
  return {
    cycle,
    presidentialGeneralElection,
    midterm: isMidtermCycle(cycle),
    onBallot: presidentialGeneralElection
      ? ["president", "senate", "house"]
      : ["senate", "house"],
    note: presidentialContestNote(cycle),
  };
}

export function contestAnnotation(race: Pick<Race, "office" | "cycle">): ContestAnnotation {
  if (race.office !== "president") {
    return { ballotRole: "federal-contest", ballotNote: null };
  }
  if (race.cycle != null && isPresidentialElectionYear(race.cycle)) {
    return { ballotRole: "presidential-general", ballotNote: null };
  }
  const cycle = race.cycle;
  return {
    ballotRole: "out-of-cycle-presidential-filing",
    ballotNote:
      cycle == null
        ? "This stored presidential race has no election year. It is not a general-election contest."
        : presidentialContestNote(cycle),
  };
}

/**
 * Chat lists should not open a midterm year with an out-of-cycle presidential
 * filing. On-cycle president stays first. Senate and House follow. An
 * out-of-cycle presidential race sorts last.
 */
export function upcomingRaceRank(race: Pick<Race, "office" | "cycle">): number {
  if (race.office === "president") {
    if (race.cycle != null && isPresidentialElectionYear(race.cycle)) return 0;
    return 3;
  }
  if (race.office === "senate") return 1;
  return 2;
}

export function presidentialContestNote(cycle: number): string | null {
  if (isPresidentialElectionYear(cycle)) return null;
  if (isMidtermCycle(cycle)) {
    return `${cycle} is a midterm year. There is no presidential general election. A stored presidential Form 2 for this cycle is an early or out-of-cycle filing, not the general election.`;
  }
  return `${cycle} is not a presidential election year. A stored presidential Form 2 for this cycle is an early, odd-year, or out-of-cycle filing, not the general election.`;
}
