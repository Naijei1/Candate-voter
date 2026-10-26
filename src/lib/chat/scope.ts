import { stateName } from "../data/states";
import { stateRaces } from "../landing";
import type { Race } from "../types";
import type { ChatSource } from "./types";

/**
 * Exact line for alignment answers. Factual mode does not show this slot.
 * The drawer intro may reuse the sentence. Do not send a mode flag.
 */
export const ALIGNMENT_DISCLAIMER =
  "Viewpoint similarity uses public records only. This is not a voting recommendation.";

export const ASK_INTRO =
  "Factual answers are the default. Alignment is only when you ask whose views match yours. Viewpoint similarity uses public records only. This is not a voting recommendation.";

const MAX_MESSAGE = 2000;

export type AskScope = {
  kind: "year" | "state" | "race" | "candidate";
  label: string;
  cycle?: number;
  raceId?: string;
  candidateId?: string;
  /** Real Senate and House ids on a state panel. Display and message prefix only. */
  panelRaceIds?: readonly string[];
};

export type ChatPostBody = {
  message: string;
  raceId?: string;
  candidateId?: string;
  cycle?: number;
  threadId?: string;
};

export type ParsedChat = {
  answerMarkdown: string;
  sources: ChatSource[];
  refused: boolean;
  threadId?: string;
  /** Null when the response omits mode. Factual may also send `mode: "factual"`. */
  mode: "alignment" | "factual" | null;
};

export function askScopeForYear(year: number): AskScope {
  return { kind: "year", label: `${year} filings`, cycle: year };
}

export function askScopeForState(
  year: number,
  postal: string,
  races: readonly Race[],
): AskScope {
  const local = stateRaces(races, postal);
  return {
    kind: "state",
    label: `${stateName(postal)} · ${year}`,
    cycle: year,
    panelRaceIds: local.map((race) => race.raceId),
    ...optionalId(anchorRaceId(local)),
  };
}

export function askScopeForRace(race: Pick<Race, "raceId" | "title" | "cycle">): AskScope {
  return {
    kind: "race",
    label: race.title,
    raceId: race.raceId,
    ...(race.cycle != null ? { cycle: race.cycle } : {}),
  };
}

export function askScopeForCandidate(input: {
  candidateId: string;
  raceId: string;
  displayName: string;
  cycle: number | null;
}): AskScope {
  return {
    kind: "candidate",
    label: input.displayName,
    candidateId: input.candidateId,
    raceId: input.raceId,
    ...(input.cycle != null ? { cycle: input.cycle } : {}),
  };
}

/**
 * One real id from rows already on the panel.
 * A single contest uses that id. Several contests prefer the first Senate
 * race, then the first House race. Empty panels return undefined — no invented id.
 */
export function anchorRaceId(local: readonly Race[]): string | undefined {
  if (local.length === 0) return undefined;
  if (local.length === 1) return local[0]?.raceId;
  const senate = local.find((race) => race.office === "senate");
  if (senate) return senate.raceId;
  return local.find((race) => race.office === "house")?.raceId;
}

export function buildChatPayload(input: {
  message: string;
  scope: AskScope | null;
  threadId?: string;
}): ChatPostBody {
  const text = input.message.trim();
  const scope = input.scope;
  const prefix = scope ? stateContextPrefix(scope) : null;
  const message = fitMessage(prefix, text);
  return {
    message,
    ...(scope?.raceId ? { raceId: scope.raceId } : {}),
    ...(scope?.candidateId ? { candidateId: scope.candidateId } : {}),
    ...(scope?.cycle != null ? { cycle: scope.cycle } : {}),
    ...(input.threadId ? { threadId: input.threadId } : {}),
  };
}

export function parseChatResponse(body: unknown): ParsedChat | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.answer_markdown !== "string") return null;
  if (typeof record.refused !== "boolean") return null;
  const mode =
    record.mode === "alignment" || record.mode === "factual" ? record.mode : null;
  const threadId = typeof record.threadId === "string" ? record.threadId : undefined;
  return {
    answerMarkdown: record.answer_markdown,
    sources: parseSources(record.sources),
    refused: record.refused,
    mode,
    ...(threadId ? { threadId } : {}),
  };
}

export function retryAfterSeconds(header: string | null): number | null {
  if (!header) return null;
  const value = header.trim();
  if (!/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds;
}

function stateContextPrefix(scope: AskScope): string | null {
  if (scope.kind !== "state") return null;
  const ids = scope.panelRaceIds ?? [];
  const shown = ids.slice(0, 12);
  const extra = ids.length - shown.length;
  const list = shown.length === 0 ? "none" : shown.join(", ");
  const more = extra > 0 ? ` (+${extra} more)` : "";
  return `Page context: browsing ${scope.label}. Stored Senate and House race ids: ${list}${more}.`;
}

function fitMessage(prefix: string | null, text: string): string {
  const question = text.slice(0, MAX_MESSAGE);
  if (!prefix) return question;
  const glue = "\n\n";
  const combined = `${prefix}${glue}${question}`;
  if (combined.length <= MAX_MESSAGE) return combined;
  const room = MAX_MESSAGE - glue.length - question.length;
  if (room < 24) return question;
  return `${prefix.slice(0, room)}${glue}${question}`;
}

function optionalId(raceId: string | undefined): { raceId: string } | Record<string, never> {
  return raceId ? { raceId } : {};
}

function parseSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];
  const sources: ChatSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.url !== "string") continue;
    if (typeof row.as_of !== "string") continue;
    sources.push({ title: row.title, url: row.url, as_of: row.as_of });
  }
  return sources;
}
