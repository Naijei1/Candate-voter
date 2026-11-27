/**
 * One short line for compare cells. The line is the start of the stored text,
 * cut where a complete clause ends, never inside a noun phrase. The words are
 * not rewritten; the full text stays behind "More".
 */

export type ShortLine = {
  /** The first complete clause, without trailing punctuation. */
  short: string;
  /** True when `short` is not the whole text. */
  cut: boolean;
  /** The stored text, unchanged. */
  full: string;
};

const TARGET_WORDS = 14;
const MAX_WORDS = 20;
const MIN_WORDS = 4;

/** Leading context such as "At a July 7, 2026 Commerce Lexington forum, said". */
const CONTEXT = /^(?:at|in|during|on)\b.{0,80}?,\s+(said|says)\b/i;
/** "As a House member," and similar openers are not clauses. */
const OPENER = /^(?:as|at|in|during|after|before|on|for|with|under|while|since)\b/i;
/** Joins that start a new clause or a trailing modifier. */
const BOUNDARY = /(;\s+|,\s+(?:and that|and|but|or|which|with|while|so)\s+|,\s+|\s+(?:and that|so that|so|before|because|while|after|until|which)\s+)/g;
/** "food, gas, utilities, and housing": a cut inside a short series leaves a fragment. */
const ITEM = "(?!(?:including|especially|not|such|and|or)\\b)[\\w'’$-]+(?:\\s+[\\w'’$-]+){0,2}";
const MIDDLE = "(?!(?!housing|spending|funding|building|training)[a-z]+ing\\b)" + ITEM;
const SERIES = new RegExp(`\\b${ITEM},\\s+(?:${MIDDLE},\\s+)+(?:and|or)\\s+(?!that\\b)[\\w'’$-]+`, "g");
const VERB = "(?:is|are|was|were|will|would|has|have|had|remains?|should|must|can|could|may|might)\\b";
/** A main verb right after the cut means the head is only the subject. */
const PREDICATE = new RegExp(`^${VERB}`, "i");
/** "the cost of living, especially fuel prices, is a priority": the aside closes and the main verb follows. */
const APPOSITIVE = new RegExp(`^(?:especially|including|particularly|notably|such as|like|which|who|whose)\\b[^;]*?,\\s+${VERB}`, "i");
/** Words a complete clause cannot end on. */
const DANGLING = /\b(?:the|a|an|of|to|for|in|on|at|by|with|and|or|but|his|her|their|its|our|that|this|these|those|more|most|very)$/i;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentenceEnd(text: string): number | null {
  const abbreviation = /\b(?:[A-Z](?:\.[A-Z])+|U\.S|Mr|Mrs|Ms|Dr|Sen|Rep|Gov|Jr|Sr|St|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/;
  for (const match of text.matchAll(/[.!?](?=\s+[A-Z"“])/g)) {
    const end = match.index + 1;
    if (!abbreviation.test(text.slice(0, end))) return end;
  }
  return null;
}

/** Drops "At a July 7, 2026 forum, " and capitalizes the verb that follows. */
export function withoutContext(text: string): string {
  const match = CONTEXT.exec(text);
  if (!match) return text;
  const rest = text.slice(match[0].length - match[1].length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function shortLine(text: string): ShortLine {
  const full = text.trim();
  const body = withoutContext(full);
  const stripped = body.replace(/[.!?]$/, "");
  if (words(body) <= TARGET_WORDS && sentenceEnd(body) == null) {
    return { short: stripped, cut: body !== full, full };
  }

  const end = sentenceEnd(body);
  const first = end != null ? body.slice(0, end).replace(/[.!?]$/, "") : stripped;
  if (words(first) <= TARGET_WORDS) return { short: first, cut: true, full };

  const series = [...first.matchAll(SERIES)].map((match) => [match.index, match.index + match[0].length] as const);
  const cuts: string[] = [];
  let firstComma = true;
  let aside = false;
  for (const match of first.matchAll(BOUNDARY)) {
    const head = first.slice(0, match.index).trim();
    const isComma = match[0].trimStart().startsWith(",");
    const opener = isComma && firstComma && OPENER.test(head);
    if (isComma) firstComma = false;
    if (opener) continue;
    if (series.some(([start, end]) => match.index >= start && match.index < end)) continue;
    if (aside) {
      if (isComma) aside = false;
      continue;
    }
    const rest = first.slice(match.index + match[0].length);
    if (isComma && /^not\s/i.test(rest)) {
      aside = true;
      continue;
    }
    const tail = first.slice(match.index).replace(/^[,;]?\s+/, "");
    if (PREDICATE.test(rest) || (isComma && APPOSITIVE.test(tail))) continue;
    if (words(head) < MIN_WORDS || DANGLING.test(head)) continue;
    cuts.push(head.replace(/[,;:]$/, ""));
  }
  const fitting = cuts.find((head) => words(head) <= TARGET_WORDS);
  if (fitting) return { short: fitting, cut: true, full };
  const longer = cuts.find((head) => words(head) <= MAX_WORDS);
  if (longer) return { short: longer, cut: true, full };
  return { short: first, cut: first !== stripped || body !== full, full };
}

/** First complete clause of a longer list for compact cells, e.g. a career entry. */
export function clauseLine(text: string): string {
  return shortLine(text).short;
}

/** First sentence and the rest, for statements that run longer than one sentence. */
export function splitSentence(text: string): [string, string] {
  const full = text.trim();
  const end = sentenceEnd(full);
  if (end == null) return [full, ""];
  return [full.slice(0, end), full.slice(end)];
}
