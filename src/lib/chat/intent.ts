import { isPostalState, stateOptions } from "../data/states";
import type { ChatRequest } from "./types";

const RACE_ID = /\b(?:19|20)\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})\b/;

const VAGUE_RUNNING: readonly RegExp[] = [
  /\bwho(?:'s|’s|s| is| are)\s+running\b/i,
  /\bwho(?:'s|’s| is)\s+on the ballot\b/i,
  /\bwho are the candidates\b/i,
  /\bwhich candidates\b/i,
  /\bcandidates?\s+(?:are\s+)?running\b/i,
  /\bwho(?:'s|’s| is)\s+in the race\b/i,
  /\bwho(?:'s| has| have)?\s*filed\b/i,
  /\bwho is running\b/i,
];

/**
 * A who-is-running question with no race, candidate, state, or presidential
 * contest. Those questions used to become a national Senate list.
 */
export function needsRaceClarification(request: ChatRequest): boolean {
  if (request.raceId || request.candidateId) return false;
  const message = request.message.trim();
  if (RACE_ID.test(message)) return false;
  if (/\bpresidents?\b/i.test(message)) return false;
  if (mentionsState(message)) return false;
  return VAGUE_RUNNING.some((pattern) => pattern.test(message));
}

const ALIGNMENT: readonly RegExp[] = [
  /\bwhose views\b/i,
  /\bviews align\b/i,
  /\balign(?:s|ed)? with (?:my|our)\b/i,
  /\bwho shares my (?:views|values|positions|politics)\b/i,
  /\bviewpoint\b/i,
  /\bwhose (?:positions|policies) match\b/i,
  /\bwho agrees with me\b/i,
  /\bwhich candidate(?:'s|s)? views\b/i,
  /\bclosest to my (?:views|values|positions)\b/i,
];

/** Explicit request to compare the user's views with candidates. */
export function isAlignmentRequest(message: string): boolean {
  return ALIGNMENT.some((pattern) => pattern.test(message));
}

export const CLARIFY_RACE_MARKDOWN = `Which state or race should I look at?

I can list **who has an FEC Form 2 filing** once I know the contest. For example, a state and office such as the California Senate, or a race id like \`2026-senate-CA\`.

I won't guess a national list. Stored records are **Form 2 filings so far**, not a full ballot.`;

function mentionsState(message: string): boolean {
  const lower = message.toLowerCase();
  for (const option of stateOptions()) {
    if (option.name.length < 4) continue;
    if (lower.includes(option.name.toLowerCase())) return true;
  }
  const prefixed = /\b(?:in|for|from|of)\s+([a-z]{2})\b/gi;
  for (const match of message.matchAll(prefixed)) {
    const code = match[1]?.toUpperCase() ?? "";
    if (isPostalState(code)) return true;
  }
  for (const match of message.matchAll(/\b([A-Z]{2})\b/g)) {
    const code = match[1] ?? "";
    if (isPostalState(code)) return true;
  }
  return false;
}
