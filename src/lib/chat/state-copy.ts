import { stateConfig, type StateConfig } from "../states";

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"] as const;

/** "its six U.S. House districts", or the at-large seat when a state has one. */
export function houseDistrictPhrase(state: StateConfig = stateConfig()): string {
  if (state.houseDistricts === 1) return "its at-large U.S. House seat";
  const word = COUNT_WORDS[state.houseDistricts] ?? String(state.houseDistricts);
  return `its ${word} U.S. House districts`;
}

export function askIntro(state: StateConfig = stateConfig()): string {
  return `Ask about ${state.name}’s races.`;
}

export function askPlaceholder(state: StateConfig = stateConfig()): string {
  return `Ask about ${state.name}’s races…`;
}

export function clarifyRaceMarkdown(state: StateConfig = stateConfig()): string {
  const example = state.houseDistricts <= 1
    ? "the at-large U.S. House seat"
    : `U.S. House District ${Math.min(3, state.houseDistricts)}`;
  return `This guide covers ${state.name}. Which race should I look at?\n\nI can list who officially filed to run. For example, U.S. Senate or ${example}.`;
}

export function votingAdviceMarkdown(state: StateConfig = stateConfig()): string {
  return `I can't tell you who to vote for. I can show who filed for each ${state.name} race and what they've reported.`;
}

export function outOfScopeMarkdown(state: StateConfig = stateConfig()): string {
  return `THE VOTE covers ${state.name} elections only.`;
}

export function whichRaceMarkdown(state: StateConfig = stateConfig()): string {
  return `Which ${state.name} federal race?`;
}

/** Sample questions shown when Ask has no page context. */
export function askSampleQuestions(state: StateConfig = stateConfig()): readonly string[] {
  const place = state.houseDistricts <= 1
    ? "the at-large seat"
    : `District ${Math.min(3, state.houseDistricts)}`;
  return [
    `Who is running for U.S. Senate in ${state.name}?`,
    `Who is running in ${place}?`,
    `What did ${state.name} candidates say about health care?`,
  ];
}
