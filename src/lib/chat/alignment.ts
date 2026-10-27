import { logReadError } from "../data/read";
import { humanRaceTitle } from "./polish";
import { executeChatTool, type ToolContext } from "./tools";
import type { ChatAnswer, ChatRequest } from "./types";
import type { PublicCandidate } from "../data/view";

const INSUFFICIENT =
  "Based on public FEC records, these **FEC Form 2 filings** include name, party, race, and dates. Those filings do not include votes or position statements, so I can't compare viewpoints. This is not an endorsement.";

export const ALIGNMENT_NEEDS_RACE_MARKDOWN = `${INSUFFICIENT}

Which state or race should I cite? For example, U.S. Senate, California.`;

export const ALIGNMENT_DISABLED_MARKDOWN =
  "I can't compare viewpoints or tell you who to support. Based on public FEC records, Candate-voter lists FEC Form 2 filings. Ask about a race, candidate, or filing and I will cite that record.";

/**
 * Viewpoint alignment is explicit-only. The table has no vote or position
 * fields, so this path cites the filing records and says the comparison
 * cannot be made yet.
 */
export async function answerAlignment(input: {
  request: ChatRequest;
  ctx: ToolContext;
}): Promise<ChatAnswer | { unavailable: true; message: string }> {
  const refreshedAt = await refreshedAtFrom(input.ctx);
  if (input.request.raceId) {
    return withFreshness(
      await fromTool(
        await executeChatTool("get_race", { raceId: input.request.raceId }, input.ctx),
        "race",
      ),
      refreshedAt,
    );
  }
  if (input.request.candidateId) {
    return withFreshness(
      await fromTool(
        await executeChatTool(
          "get_candidate",
          { candidateId: input.request.candidateId },
          input.ctx,
        ),
        "candidate",
      ),
      refreshedAt,
    );
  }
  return {
    answer_markdown: ALIGNMENT_NEEDS_RACE_MARKDOWN,
    sources: [],
    refused: false,
    mode: "alignment",
    refreshedAt,
  };
}

async function refreshedAtFrom(ctx: ToolContext): Promise<string | null> {
  try {
    return (await ctx.repo.getWatermark())?.updatedAt ?? null;
  } catch (error) {
    logReadError("getWatermark", error);
    return null;
  }
}

function withFreshness(
  answer: ChatAnswer | { unavailable: true; message: string },
  refreshedAt: string | null,
): ChatAnswer | { unavailable: true; message: string } {
  if ("unavailable" in answer) return answer;
  return { ...answer, refreshedAt };
}

function fromTool(
  result: Awaited<ReturnType<typeof executeChatTool>>,
  kind: "race" | "candidate",
): ChatAnswer | { unavailable: true; message: string } {
  if (!result.ok) {
    if (result.unavailable) return { unavailable: true, message: result.message };
    return {
      answer_markdown: `${INSUFFICIENT}\n\nI couldn't look up that record (${result.message}).`,
      sources: [],
      refused: true,
      mode: "alignment",
    };
  }
  const candidates = readCandidates(result.content);
  const title = readTitle(result.content);
  if (result.records === 0 || (kind === "race" && !title && candidates.length === 0)) {
    return {
      answer_markdown: `Nothing in the public FEC records matched that, so I can't compare viewpoints.\n\n${INSUFFICIENT}`,
      sources: [],
      refused: true,
      mode: "alignment",
    };
  }
  const lines = candidates.slice(0, 12).map((candidate) => {
    const party = candidate.partyCode
      ? `${candidate.partyLabel} (${candidate.partyCode})`
      : candidate.partyLabel;
    const note = candidate.multiFilingNote ? ` ${candidate.multiFilingNote}` : "";
    return `- **${candidate.displayName}** — ${party}.${note}`;
  });
  const extra = candidates.length - lines.length;
  const heading = title ? `**Filings on file for ${title}:**` : "**Filings on file:**";
  const more =
    extra > 0
      ? `\n\n${extra} more filing${extra === 1 ? "" : "s"} are on the race page linked below.`
      : "";
  const list = lines.length > 0 ? `\n\n${heading}\n\n${lines.join("\n")}${more}` : "";
  return {
    answer_markdown: `I can't compare viewpoints from public FEC records.\n\n${INSUFFICIENT}${list}`,
    sources: result.sources,
    refused: false,
    mode: "alignment",
  };
}

function readCandidates(content: Record<string, unknown>): PublicCandidate[] {
  const direct = content.candidates;
  if (Array.isArray(direct)) return direct.filter(isCandidate);
  const one = content.candidate;
  if (isCandidate(one)) return [one];
  return [];
}

function readTitle(content: Record<string, unknown>): string | null {
  const race = content.race;
  if (!race || typeof race !== "object" || Array.isArray(race)) return null;
  const record = race as {
    title?: unknown;
    raceId?: unknown;
    office?: unknown;
    cycle?: unknown;
  };
  if (typeof record.raceId === "string") {
    return humanRaceTitle({
      raceId: record.raceId,
      title: typeof record.title === "string" ? record.title : null,
      office: typeof record.office === "string" ? record.office : null,
      cycle: typeof record.cycle === "number" ? record.cycle : null,
    });
  }
  return typeof record.title === "string" && record.title.trim() ? record.title.trim() : null;
}

function isCandidate(value: unknown): value is PublicCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as { displayName?: unknown; partyLabel?: unknown };
  return typeof record.displayName === "string" && typeof record.partyLabel === "string";
}
