import type { ConverseFn } from "@/lib/chat/types";
import { REFUSALS, candidatesWithEvidence, type Claim, type CompareBasis } from "./evidence";

export type CompareSummary = {
  raceId: string;
  /** `ai`: a model wrote the differ/agree claims and every one passed the citation check. */
  mode: "ai" | "records";
  know: Claim[];
  differ: Claim[];
  agree: Claim[];
  /** Shown instead of an empty section. Null when the section has claims. */
  differRefusal: string | null;
  agreeRefusal: string | null;
  notice: string | null;
};

export const COMPARE_PROMPT_VERSION = "2026-11-19.1";

export const COMPARE_SYSTEM_PROMPT = `You compare candidates in one Kentucky race for voters who are short on time and new to politics.
Use ONLY the numbered records you are given. Do not use outside knowledge. Do not guess.
Write plain, neutral sentences of 40 words or fewer. Name the candidates. Never say who is better, who to vote for, or who will win. No ratings or predictions.
"differ": points where two or more candidates took different positions or votes on the same topic.
"agree": points where two or more candidates took the same position or vote on the same topic.
Every claim must cite the record ids it relies on, and the cited records must come from at least two different candidates.
If the records do not support a point, leave that list empty. An empty list is a correct answer.
Reply with JSON only, no prose: {"differ":[{"text":"...","cites":["E1","E4"]}],"agree":[{"text":"...","cites":["E2","E5"]}]}`;

const MAX_CLAIMS = 4;
const MAX_TEXT = 320;
const BANNED = /\b(vote for|should vote|better candidate|best candidate|will win|likely to win|favored|toss-?up|lean[s]? (republican|democrat)|flip)\b/i;

export function compareUserMessage(basis: CompareBasis): string {
  const lines = basis.evidence
    .filter((row) => row.personId)
    .map((row) => `${row.id} | ${row.personName} | ${row.kind}${row.issue ? ` | ${row.issue}` : ""} | ${row.text}`);
  return `Race: ${basis.title}, Kentucky, November 3, 2026.\nCandidates: ${basis.people.map((person) => person.name).join("; ")}.\nRecords:\n${lines.join("\n")}`;
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
    if (!text || text.length > MAX_TEXT || BANNED.test(text)) continue;
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
    differRefusal: enough ? REFUSALS.unavailable : REFUSALS.notEnough,
    agreeRefusal: enough ? REFUSALS.unavailable : REFUSALS.notEnough,
    notice,
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
      maxTokens: 900,
      signal: deps.signal,
      noTools: true,
    });
    if (response.stopReason !== "end_turn") return recordsOnlySummary(basis, null);
    const text = response.message.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("");
    const parsed = parseModelJson(text);
    if (!parsed) return recordsOnlySummary(basis, null);
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
    };
  } catch (error) {
    console.error("compare summary failed:", error instanceof Error ? error.name : "Error");
    return recordsOnlySummary(basis, null);
  }
}
