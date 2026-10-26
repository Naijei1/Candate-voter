import type { ChatRequest } from "./types";

export const CHAT_SYSTEM_PROMPT = `You are the Candate-voter records assistant. Candate-voter is a nonpartisan civic tracker of U.S. federal President, Senate, and House races built from FEC Form 2 filings stored in this site's database.

Rules:
- Answer only from tool results. The tools read the same stored races, candidates, filings, and ingest watermark as the public pages.
- Never invent a candidate, race, filing, party, date, or source. If the tools return no match, say so.
- Party is the affiliation code a filing reported. It is not an endorsement.
- Do not give voting advice. Do not rank, score, recommend, or endorse candidates. Do not say who someone should vote for or who is the better candidate. If asked, refuse.
- Cite the source links and as-of timestamps included in tool results. Do not cite a URL that was not in a tool result.
- Neutral tone. No partisan framing.

When you are done calling tools, reply with one JSON object and no other text:
{"answer_markdown":"string","sources":[{"title":"string","url":"string","as_of":"string"}],"refused":false}

Set refused to true when you are refusing voting advice, a ranking, or an endorsement, or when the tools returned no matching record. Put the visitor-facing copy in answer_markdown. Use an empty sources array when you found nothing. When tools returned records, copy title, url, and as_of from those tool results into sources.`;

const VOTING_ADVICE: readonly RegExp[] = [
  /\bwho should i vote\b/i,
  /\bwho (?:should|do|can) (?:i|we) vote\b/i,
  /\bwho to vote for\b/i,
  /\bvote for\b/i,
  /\bwhom should i (?:vote|support|elect|pick|choose)\b/i,
  /\bwhich candidate should i\b/i,
  /\bshould i (?:vote|support|elect|pick|choose)\b/i,
  /\bendorse\b/i,
  /\bendorsement\b/i,
  /\brank(?:ing)? (?:the |these )?candidates\b/i,
  /\bbest candidate\b/i,
  /\bworst candidate\b/i,
  /\bwho(?:'s| is) (?:the )?(?:better|best)\b/i,
  /\btell me who to (?:vote|support|pick|choose|elect)\b/i,
];

export const VOTING_ADVICE_MARKDOWN =
  "I can't recommend a candidate, rank the field, or tell you who to vote for. Candate-voter is a nonpartisan record of FEC Form 2 filings. Ask about a stored race, candidate, or filing and I will cite that record.";

export const EMPTY_RECORDS_MARKDOWN =
  "Nothing in the stored Candate-voter records matched that. I will not invent a candidate, race, or filing.";

/** Deterministic refuse before any model call. */
export function isVotingAdvice(message: string): boolean {
  return VOTING_ADVICE.some((pattern) => pattern.test(message));
}

export function userPrompt(request: ChatRequest): string {
  const lines = [request.message.trim()];
  const context: string[] = [];
  if (request.raceId) context.push(`raceId: ${request.raceId}`);
  if (request.candidateId) context.push(`candidateId: ${request.candidateId}`);
  if (request.cycle != null) context.push(`cycle: ${request.cycle}`);
  if (context.length > 0) {
    lines.push(
      "",
      "Page context from the site. Verify it with tools before stating it as fact:",
      ...context,
    );
  }
  return lines.join("\n");
}
