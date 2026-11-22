import type { ConverseFn } from "@/lib/chat/types";
import { REFUSALS, candidateEvidence, candidatesWithEvidence, type Claim, type CompareBasis, type Evidence } from "./evidence";

export type CompareSummary = {
  raceId: string;
  /** `ai`: a model wrote the differ/agree claims and every one passed the citation check. */
  mode: "ai" | "records";
  know: Claim[];
  differ: Claim[];
  agree: Claim[];
  /** Optional explanation for an empty section. */
  differRefusal: string | null;
  agreeRefusal: string | null;
  notice: string | null;
  /** The candidate records this answer could cite, for the side-by-side list and the source links. */
  evidence: Evidence[];
};

export const COMPARE_PROMPT_VERSION = "2026-11-22.1";

export const COMPARE_SYSTEM_PROMPT = `You compare candidates in one Kentucky race for voters who are short on time and new to politics.
Use ONLY the numbered records you are given. Do not use outside knowledge. Do not guess.
If the user message specifies a topic, limit the comparison to that topic.
Write plain, neutral sentences of 40 words or fewer. Name the candidates. Never say who is better, who to vote for, or who will win. No ratings or predictions.
"differ": points where two or more candidates took different positions or votes on the same topic.
"agree": points where two or more candidates took the same position or vote, or explicitly pursued the same policy goal. When their proposals differ, name only the shared goal. Mentioning the same topic is not agreement.
Compare candidates wherever the records support a point. A point need not cover everyone in the race.
Give up to three points per list, starting with the clearest.
Every claim must cite the record ids it relies on, and the cited records must come from at least two different candidates.
If the records do not support a point, leave that list empty. An empty list is a correct answer.
Reply with JSON only, no prose: {"differ":[{"text":"...","cites":["E1","E4"]}],"agree":[{"text":"...","cites":["E2","E5"]}]}`;

const MAX_CLAIMS = 4;
const MAX_TEXT = 320;
// Leave room for full-race answers and any reasoning tokens the model uses.
const MAX_OUTPUT_TOKENS = 1_800;
/** Endorsements, predictions and ratings. A claim that matches any of these is dropped, citations or not. */
const BANNED: readonly RegExp[] = [
  /\b(vote for|should vote|should (?:pick|choose|support)|we recommend|recommended)\b/i,
  /\b(will win|likely to win|expected to win|going to win|favou?red|favou?rite to|toss-?up|lean[s]? (republican|democrat)|flip(s|ped)?|front-?runner|underdog|ahead in the polls)\b/i,
  /\b(best|worst|strongest|weakest|better|worse|stronger|weaker|top|ideal|clear|right|wrong|smart|safe|obvious|superior|inferior)\s+(candidate|choice|pick|option|person|nominee)s?\b/i,
  /\b(is|are|was|were) the (best|worst|strongest|weakest|better|worse|stronger|weaker|superior|inferior)\b/i,
  /\b(rated|rating|ratings|ranked|ranking|grade[sd]?|scores? (higher|lower|better|worse))\b/i,
];
const banned = (text: string): boolean => BANNED.some((pattern) => pattern.test(text));

export function compareUserMessage(basis: CompareBasis): string {
  const lines = basis.evidence
    .filter((row) => row.personId)
    .map((row) => `${row.id} | ${row.personName} | ${row.kind}${row.issue ? ` | ${row.issue}` : ""} | ${row.text}`);
  const topic = basis.topic ? `\nTopic: ${basis.topic}.` : "";
  return `Race: ${basis.title}, Kentucky, November 3, 2026.\nCandidates: ${basis.people.map((person) => person.name).join("; ")}.${topic}\nRecords:\n${lines.join("\n")}`;
}

/** Keep only claims that cite real records from two or more candidates. Everything else is dropped. */
export function validateClaims(raw: unknown, basis: CompareBasis): Claim[] {
  if (!Array.isArray(raw)) return [];
  const owner = new Map(basis.evidence.filter((row) => row.personId).map((row) => [row.id, row.personId]));
  const out: Claim[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const text = typeof (item as { text?: unknown }).text === "string" ? (item as { text: string }).text.trim() : "";
    const cites = Array.isArray((item as { cites?: unknown }).cites)
      ? [...new Set(((item as { cites: unknown[] }).cites).filter((id): id is string => typeof id === "string" && owner.has(id)))]
      : [];
    if (!text || text.length > MAX_TEXT || banned(text) || /https?:\/\/|\]\(/i.test(text)) continue;
    const people = new Set(cites.map((id) => owner.get(id)));
    if (cites.length === 0 || people.size < 2) continue;
    out.push({ text, cites });
    if (out.length >= MAX_CLAIMS) break;
  }
  return out;
}

export function parseModelJson(text: string): { differ?: unknown; agree?: unknown } | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as { differ?: unknown; agree?: unknown }) : null;
  } catch {
    return null;
  }
}

export function recordsOnlySummary(basis: CompareBasis, notice: string | null): CompareSummary {
  const enough = candidatesWithEvidence(basis) >= 2;
  return {
    raceId: basis.raceId,
    mode: "records",
    know: basis.know,
    differ: [],
    agree: [],
    differRefusal: enough ? null : REFUSALS.notEnough,
    agreeRefusal: enough ? null : REFUSALS.notEnough,
    notice,
    evidence: candidateEvidence(basis),
  };
}

/**
 * Ask the model for differ/agree claims, then keep only the ones that pass
 * `validateClaims`. On any failure the visitor gets the records-only view.
 */
export async function summarizeRace(
  basis: CompareBasis,
  deps: { converse: ConverseFn | null; modelId: string; signal?: AbortSignal },
): Promise<CompareSummary> {
  if (candidatesWithEvidence(basis) < 2) return recordsOnlySummary(basis, null);
  if (!deps.converse) return recordsOnlySummary(basis, null);
  try {
    const response = await deps.converse({
      modelId: deps.modelId,
      system: COMPARE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: [{ text: compareUserMessage(basis) }] }],
      maxTokens: MAX_OUTPUT_TOKENS,
      signal: deps.signal,
      noTools: true,
    });
    if (response.stopReason !== "end_turn") {
      console.warn("compare summary ended early:", basis.raceId, response.stopReason);
      return recordsOnlySummary(basis, null);
    }
    const text = response.message.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("");
    const parsed = parseModelJson(text);
    if (!parsed) {
      console.warn("compare summary returned invalid JSON:", basis.raceId);
      return recordsOnlySummary(basis, null);
    }
    const differ = validateClaims(parsed.differ, basis);
    const agree = validateClaims(parsed.agree, basis);
    return {
      raceId: basis.raceId,
      mode: "ai",
      know: basis.know,
      differ,
      agree,
      differRefusal: differ.length > 0 ? null : REFUSALS.differ,
      agreeRefusal: agree.length > 0 ? null : REFUSALS.agree,
      notice: null,
      evidence: candidateEvidence(basis),
    };
  } catch (error) {
    console.error("compare summary failed:", error instanceof Error ? error.name : "Error");
    return recordsOnlySummary(basis, null);
  }
}
