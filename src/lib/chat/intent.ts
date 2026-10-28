import { parseCycle } from "../data/cycles";
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

const UPCOMING: readonly RegExp[] = [
  /\bwhat elections are coming up\b/i,
  /\bwhich elections are coming up\b/i,
  /\belections?\s+(?:are\s+)?coming up\b/i,
  /\bupcoming elections?\b/i,
  /\bwhat(?:'s| is| are) coming up\b/i,
  /\bwhat races are (?:coming up|next|on the ballot)\b/i,
  /\bwhat(?:'s| is) on the ballot\b/i,
  /\bwhat elections\b/i,
  /\bwhich elections\b/i,
];

/** "What elections are coming up" and the same calendar question. */
export function isUpcomingElectionsQuestion(message: string): boolean {
  return UPCOMING.some((pattern) => pattern.test(message));
}

/** Postal state named in the question, if any. */
export function stateMentionedIn(message: string): string | null {
  const lower = message.toLowerCase();
  for (const option of stateOptions()) {
    if (option.name.length < 4) continue;
    if (lower.includes(option.name.toLowerCase())) return option.postal;
  }
  const prefixed = /\b(?:in|for|from|of)\s+([a-z]{2})\b/gi;
  for (const match of message.matchAll(prefixed)) {
    const code = match[1]?.toUpperCase() ?? "";
    if (isPostalState(code)) return code;
  }
  for (const match of message.matchAll(/\b([A-Z]{2})\b/g)) {
    const code = match[1] ?? "";
    if (isPostalState(code)) return code;
  }
  return null;
}

/** First election year written in the question, when it is in range. */
export function cycleMentionedIn(message: string): number | null {
  const match = /\b(?:19|20)\d{2}\b/.exec(message);
  if (!match) return null;
  return parseCycle(match[0]);
}

/** Page already named a place. Answers must not ask which state. */
export function hasPlaceContext(request: ChatRequest): boolean {
  return Boolean(request.state || request.zip || request.raceId || request.candidateId);
}

/** State implied by a Senate or House race id. President has none. */
export function stateFromRaceId(raceId: string | null | undefined): string | null {
  if (!raceId) return null;
  const senate = /^(?:19|20)\d{2}-senate-([A-Z]{2})$/.exec(raceId);
  if (senate?.[1] && isPostalState(senate[1])) return senate[1];
  const house = /^(?:19|20)\d{2}-house-([A-Z]{2})-\d{2}$/.exec(raceId);
  if (house?.[1] && isPostalState(house[1])) return house[1];
  return null;
}

/**
 * The visitor's question, without a leading "Page context:" note.
 * That note names both chambers and real race ids, so chamber checks
 * have to ignore it.
 */
export function visitorQuestion(message: string): string {
  if (!message.startsWith("Page context:")) return message;
  const split = message.indexOf("\n\n");
  if (split < 0) return message;
  return message.slice(split + 2);
}

export type AskedChamber = "senate" | "house" | "president";

/** Senate, House, or president when the question names exactly one of them. */
export function askedChamber(message: string): AskedChamber | null {
  const question = visitorQuestion(message);
  const senate = /\bsenate\b/i.test(question);
  const house = /\bhouse\b/i.test(question);
  const president = /\bpresidents?\b/i.test(question);
  const count = Number(senate) + Number(house) + Number(president);
  if (count !== 1) return null;
  if (senate) return "senate";
  if (house) return "house";
  return "president";
}

/** Chamber implied by a race id. Unknown ids have none. */
export function chamberFromRaceId(raceId: string | null | undefined): AskedChamber | null {
  if (!raceId) return null;
  if (/^(?:19|20)\d{2}-senate-[A-Z]{2}$/.test(raceId)) return "senate";
  if (/^(?:19|20)\d{2}-house-[A-Z]{2}-\d{2}$/.test(raceId)) return "house";
  if (/^(?:19|20)\d{2}-president$/.test(raceId)) return "president";
  return null;
}

/** Who-is-running wording that used to become a national list. */
export function isVagueRunningQuestion(message: string): boolean {
  const text = visitorQuestion(message).trim();
  if (RACE_ID.test(text)) return false;
  if (/\bpresidents?\b/i.test(text)) return false;
  return VAGUE_RUNNING.some((pattern) => pattern.test(text));
}

/**
 * A who-is-running question with no race, candidate, state, ZIP, or
 * presidential contest. Those questions used to become a national Senate list.
 */
export function needsRaceClarification(request: ChatRequest): boolean {
  if (hasPlaceContext(request)) return false;
  if (mentionsState(request.message)) return false;
  return isVagueRunningQuestion(request.message);
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

I can list **who has an FEC Form 2 filing** once I know the contest. For example, a state and office such as the California Senate or U.S. Senate, California.

I won't guess a national list. Stored records are **Form 2 filings so far**, not a full ballot.`;

function mentionsState(message: string): boolean {
  return stateMentionedIn(message) != null;
}
