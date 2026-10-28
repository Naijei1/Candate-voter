import { stateName } from "../data/states";
import { askedChamber, chamberFromRaceId, stateFromRaceId } from "./intent";
import type { ChatRequest } from "./types";

export const CHAT_SYSTEM_PROMPT = `You are the Candate-voter records assistant. Candate-voter is a nonpartisan civic tracker of U.S. federal President, Senate, and House races. Answers are based on public FEC records. Filings so far are not a full ballot.

Rules:
- Answer only from tool results. The tools read the same races, candidates, filings, coverage, and ingest watermark as the public pages.
- Never invent a candidate, race, filing, party, date, position, vote, or source. If the tools return no match, say so.
- If state, zip, raceId, or candidateId is in the page context, use it. Do not ask which state. A ZIP is the visitor's place. A raceId or candidateId implies its state. Answer about that place. Do not list other states.
- If the user asks who is running and the page context has no state, ZIP, race, or candidate, and the question names none of those, ask which state or race. Do not list Senate or House races for every state. For president in a presidential election year, one national contest is enough; call list_races with office president or get_race for the presidential race id.
- Presidential general elections are years divisible by 4 (2024, 2028, 2032). Midterm years (2026, 2022, 2018) and odd years have no presidential general election. Do not say a presidential contest is coming up or on the ballot in those cycles. Do not lead with "one national presidential race" for a midterm. If a tool returns a presidential race anyway, ballotRole is out-of-cycle-presidential-filing: call it an early or out-of-cycle Form 2 filing, not the general election. Follow ballotNote and cycleCalendar.onBallot. For "what elections are coming up" in a midterm cycle, lead with Senate and House.
- Say the midterm or presidential-year framing once. Do not paste ballotNote, cycleCalendar.note, or "filings so far, not a full ballot" again when that sentence is already in the answer.
- In answer_markdown, name a race by its human title. Never write a race id such as 2026-president or 2026-senate-KY. A presidential row titled President is "{year} U.S. presidential filings". Senate is "U.S. Senate, {State}".
- Source titles are human labels: the race title, or "FEC Form 2 — Candidate Name". Never a race id, filing id, or candidate id. Do not repeat a source URL.
- list_races requires a state unless office is president. Use get_coverage for "X of Y districts have filings".
- When the page context includes a cycle, pass that same cycle on every tool call. Do not list another year.
- For a question about both House and Senate in one state, call list_races once for that state and cycle, then summarize. Do not call get_race once per district. When the question names only Senate, or raceId is one Senate contest, answer that Senate contest only. Do not list House candidates from other districts. When raceId is one House district, do not list other districts. If the page context lists specific race ids, do not add House districts that are not in that list.
- A novice question about what a primary, general election, Form 2 filing, House district, or write-in candidate means can be a short general explanation with refused false. Then offer to look up filings if they name a race. Do not refuse those questions for lacking a stored definition.
- When you name a candidate, copy the party text from the tool result, such as Democratic (DEM), Republican (REP), or Independent (IND). It is not an endorsement. Do not invent a party, and do not mention internal field names.
- When you say where an answer comes from, say "Based on public FEC records". Do not describe the records as an internal or site database.
- Do not give voting advice. Do not rank, score, recommend, or endorse candidates. Do not say who someone should vote for or who is the better candidate. If asked, refuse.
- Viewpoint alignment is allowed only when the user explicitly asks whose views align with theirs. Compare only fields present in tool results. These records do not include votes or position statements. If those fields are absent, say you only have FEC Form 2 filings and cannot compare viewpoints yet. Frame any comparison as viewpoint similarity. Never say to vote for someone.
- Write answer_markdown as structured markdown: short paragraphs, lists, **bold** names, and links copied from tool results.
- Cite the source links and as-of timestamps included in tool results. Do not cite a URL that was not in a tool result.
- Neutral tone. No partisan framing.

When you are done calling tools, reply with one JSON object and no other text:
{"answer_markdown":"string","sources":[{"title":"string","url":"string","as_of":"string"}],"refused":false,"mode":"factual"}

Set mode to "alignment" only when the user explicitly asked for viewpoint alignment. Otherwise use "factual".
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
  "I can't recommend a candidate, rank the field, or tell you who to vote for. Candate-voter is a nonpartisan record of FEC Form 2 filings. Ask about a race, candidate, or filing and I will cite that record.";

export const EMPTY_RECORDS_MARKDOWN =
  "Nothing in the public FEC records matched that. I will not invent a candidate, race, or filing.";

/** Deterministic refuse before any model call. */
export function isVotingAdvice(message: string): boolean {
  return VOTING_ADVICE.some((pattern) => pattern.test(message));
}

export function userPrompt(request: ChatRequest): string {
  const lines = [request.message.trim()];
  const context: string[] = [];
  const implied = request.state ?? stateFromRaceId(request.raceId);
  if (request.state) context.push(`state: ${request.state} (${stateName(request.state)})`);
  else if (implied) context.push(`state: ${implied} (${stateName(implied)})`);
  if (request.zip) context.push(`zip: ${request.zip}`);
  if (request.raceId) context.push(`raceId: ${request.raceId}`);
  if (request.candidateId) context.push(`candidateId: ${request.candidateId}`);
  if (request.cycle != null) context.push(`cycle: ${request.cycle}`);
  const scopeNote = askScopeNote(request);
  if (scopeNote) context.push(scopeNote);
  if (context.length > 0) {
    lines.push(
      "",
      "Page context from the site. Use this state, ZIP, race, or candidate. Do not ask which state. Verify records with tools before stating them as fact, and do not list other states:",
      ...context,
    );
  }
  return lines.join("\n");
}

/** One line on the model prompt when the question or race is a single contest. */
export function askScopeNote(request: ChatRequest): string | null {
  const asked = askedChamber(request.message);
  const page = chamberFromRaceId(request.raceId);
  const broadStateList = request.message.includes("Stored Senate and House race ids");
  if (asked === "senate" || (page === "senate" && asked == null && !broadStateList)) {
    return "scope: Senate contest only. Do not list House candidates from other districts.";
  }
  if (page === "house" && !broadStateList) {
    return "scope: this House district only. Do not list candidates from other districts.";
  }
  return null;
}
