export function candidateStatesFromEnv(value = process.env.CANDATE_STATES): ReadonlySet<string> | undefined {
  if (!value?.trim()) return undefined;
  return new Set(value.split(",").map((state) => state.trim().toUpperCase()).filter(Boolean));
}

export function includesCandidateState(states: ReadonlySet<string> | undefined, state: string | null): boolean {
  return states === undefined || (state !== null && states.has(state));
}
