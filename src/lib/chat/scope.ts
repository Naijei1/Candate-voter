import { stateName } from "../data/states";
import { stateRaces } from "../landing";
import type { Race } from "../types";
import { askedChamber, chamberFromRaceId, type AskedChamber } from "./intent";
import type { ChatAnswer, ChatSource } from "./types";
import type { ChatContextInput } from "./ui";

/**
 * Exact line for alignment answers. Factual mode does not show this slot.
 * The drawer intro may reuse the sentence. Do not send a mode flag.
 */
export const ALIGNMENT_DISCLAIMER =
  "Viewpoint similarity uses public records only. This is not a voting recommendation.";

export const ASK_INTRO = "Ask factual questions about federal races and filings.";

const MAX_MESSAGE = 2000;

export type AskScope = {
  kind: "year" | "state" | "race" | "candidate";
  label: string;
  cycle?: number;
  raceId?: string;
  candidateId?: string;
  /** Real Senate and House ids on a state panel. Display and message prefix only. */
  panelRaceIds?: readonly string[];
  /** Two-letter postal code when the page is a state or ZIP sheet. */
  state?: string;
  /** Five-digit ZIP when the page was opened from a ZIP lookup. */
  zip?: string;
};

export type ChatPostBody = {
  message: string;
  raceId?: string;
  candidateId?: string;
  cycle?: number;
  /** Same integer as `cycle`. The server rejects the pair when they differ. */
  year?: number;
  state?: string;
  zip?: string;
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
    state: postal.trim().toUpperCase(),
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

/** Page-context note plus the visitor's question, still inside the message field. */
export function applyPagePrefix(prefix: string | undefined, message: string): string {
  const note = prefix?.trim() ?? "";
  if (!note.startsWith("Page context:")) return message.trim();
  return fitMessage(note, message.trim());
}

export function pageContextFromScope(scope: AskScope): {
  raceId?: string;
  candidateId?: string;
  cycle?: number;
  state?: string;
  zip?: string;
  messagePrefix?: string;
} {
  const prefix = stateContextPrefix(scope);
  return {
    ...(scope.raceId ? { raceId: scope.raceId } : {}),
    ...(scope.candidateId ? { candidateId: scope.candidateId } : {}),
    ...(scope.cycle != null ? { cycle: scope.cycle } : {}),
    ...(scope.state ? { state: scope.state } : {}),
    ...(scope.zip ? { zip: scope.zip } : {}),
    ...(prefix ? { messagePrefix: prefix } : {}),
    ...(scope.kind === "year" ? {} : { label: scope.label }),
  };
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
  const cycle = scope?.raceId ? cycleForRace(scope.cycle, scope.raceId) : scope?.cycle;
  return {
    message,
    ...(scope?.raceId ? { raceId: scope.raceId } : {}),
    ...(scope?.candidateId ? { candidateId: scope.candidateId } : {}),
    ...(cycle != null ? { cycle, year: cycle } : {}),
    ...(scope?.state ? { state: scope.state } : {}),
    ...(scope?.zip ? { zip: scope.zip } : {}),
    ...(input.threadId ? { threadId: input.threadId } : {}),
  };
}

function cycleForRace(cycle: number | null | undefined, raceId: string): number | undefined {
  const prefix = /^(\d{4})-/.exec(raceId);
  const raceYear = prefix?.[1] ? Number(prefix[1]) : null;
  if (raceYear != null && cycle != null && cycle !== raceYear) return raceYear;
  return cycle ?? raceYear ?? undefined;
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

const RACE_ID_IN_TEXT = /\b(?:19|20)\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})\b/g;

export type AskHistoryScope = "senate" | "house" | "president" | "mixed" | "open";

/**
 * Scope the visible thread belongs to. A state panel that names Senate and
 * House together is mixed, so it cannot be shown on a Senate page.
 */
export function askHistoryScope(context: ChatContextInput): AskHistoryScope {
  const ids = new Set<string>();
  if (context.raceId) ids.add(context.raceId);
  for (const id of raceIdsIn(context.messagePrefix ?? "")) ids.add(id);
  const chambers = new Set<AskedChamber>();
  for (const id of ids) {
    const chamber = chamberFromRaceId(id);
    if (chamber) chambers.add(chamber);
  }
  if (chambers.size > 1) return "mixed";
  const only = chambers.values().next().value;
  return only ?? "open";
}

/** Session key for the Ask thread. Year, place, race, and scope each change it. */
export function askHistoryKey(context: ChatContextInput): string {
  return [
    context.cycle ?? "",
    context.state ?? "",
    context.raceId ?? "",
    context.candidateId ?? "",
    askHistoryScope(context),
  ].join("|");
}

export function scopeFromHistoryKey(key: string): AskHistoryScope {
  const scope = key.split("|").at(-1);
  if (
    scope === "senate" ||
    scope === "house" ||
    scope === "president" ||
    scope === "mixed" ||
    scope === "open"
  ) {
    return scope;
  }
  return "open";
}

/**
 * A Senate question must not sit under a House-mixed thread.
 * Follow-up Senate questions keep a thread that is already Senate-only.
 */
export function shouldDropHistoryForSend(
  historyScope: AskHistoryScope | null,
  message: string,
  context: ChatContextInput,
): boolean {
  const scoped = narrowAskContext(message, context);
  if (askHistoryScope(scoped) !== "senate") return false;
  if (historyScope === "senate") return false;
  return historyScope === "mixed" || askHistoryScope(context) === "mixed";
}
const HOUSE_RACE_ID = /\b((?:19|20)\d{2}-house-[A-Z]{2}-\d{2})\b/;

/**
 * One chamber in the question replaces a state-panel list of every district.
 * A Senate question keeps the Senate id. A House question on one district
 * keeps that district. Other House ids stay out of the request.
 */
export function narrowAskContext(message: string, context: ChatContextInput): ChatContextInput {
  const asked = askedChamber(message);
  if (!asked) return context;
  const listed = raceIdsIn(context.messagePrefix ?? "");
  const raceId = pickScopedRaceId(asked, context.raceId, listed);
  const prefix = rewritePanelPrefix(context.messagePrefix, asked, raceId, listed);
  const sameRace = Boolean(context.raceId) && chamberFromRaceId(context.raceId) === asked;
  return {
    cycle: context.cycle,
    ...(context.state ? { state: context.state } : {}),
    ...(context.zip ? { zip: context.zip } : {}),
    ...(context.label ? { label: context.label } : {}),
    ...(raceId ? { raceId } : {}),
    ...(context.candidateId && sameRace ? { candidateId: context.candidateId } : {}),
    ...(prefix ? { messagePrefix: prefix } : {}),
  };
}

/**
 * Drop House candidates from districts outside the asked race.
 * A Senate question, or a Senate race page, keeps Senate only.
 * A single House race keeps that district. A full state list is unchanged.
 */
export function limitAnswerToRaceScope(
  answer: ChatAnswer,
  request: { message: string; raceId?: string },
): ChatAnswer {
  const asked = askedChamber(request.message);
  const page = chamberFromRaceId(request.raceId);
  const listed = raceIdsIn(request.message);
  const statePanel = /Stored (?:Senate and House|Senate|House|presidential) race ids:/.test(request.message);
  const truncated = /\(\+\d+ more\)/.test(request.message);
  const senateOnly = asked === "senate" || (page === "senate" && asked !== "house" && !statePanel);
  const oneHouse =
    page === "house" &&
    asked !== "senate" &&
    Boolean(request.raceId) &&
    (asked === "house" || !statePanel);
  const listedHouse = listed.filter((id) => chamberFromRaceId(id) === "house");
  const completePanel = statePanel && !truncated && listedHouse.length > 0 && !senateOnly && !oneHouse;
  if (!senateOnly && !oneHouse && !completePanel) return answer;

  const keep = new Set<string>();
  if (!senateOnly) {
    for (const id of listedHouse) keep.add(id);
    if (oneHouse && request.raceId) keep.add(request.raceId);
  }
  const markdown = stripHouseDistricts(answer.answer_markdown, keep);
  const keepDistrict = districtNumbers(keep);
  return {
    ...answer,
    answer_markdown: markdown.trim()
      ? markdown
      : senateOnly
        ? "No Senate filing is stored for that contest."
        : "No House filing is stored for that district.",
    sources: answer.sources.filter((source) => sourceKept(source, keep, keepDistrict, senateOnly)),
  };
}

function pickScopedRaceId(
  chamber: AskedChamber,
  current: string | undefined,
  listed: readonly string[],
): string | undefined {
  if (current && chamberFromRaceId(current) === chamber) return current;
  const matches = listed.filter((id) => chamberFromRaceId(id) === chamber);
  if (chamber === "house") return matches.length === 1 ? matches[0] : undefined;
  return matches[0];
}

function rewritePanelPrefix(
  prefix: string | undefined,
  chamber: AskedChamber,
  raceId: string | undefined,
  listed: readonly string[],
): string | undefined {
  if (!prefix?.startsWith("Page context:")) return prefix;
  const ids =
    chamber === "house" && raceId
      ? [raceId]
      : [...new Set(listed.filter((id) => chamberFromRaceId(id) === chamber))];
  if (raceId && chamberFromRaceId(raceId) === chamber && !ids.includes(raceId)) ids.unshift(raceId);
  const label = chamber === "senate" ? "Senate" : chamber === "house" ? "House" : "presidential";
  const list = ids.length === 0 ? "none" : ids.join(", ");
  return prefix.replace(/Stored Senate and House race ids:[^.]*\./, `Stored ${label} race ids: ${list}.`);
}

function raceIdsIn(text: string): string[] {
  return text.match(RACE_ID_IN_TEXT) ?? [];
}

function districtNumbers(ids: ReadonlySet<string>): Set<number> {
  const numbers = new Set<number>();
  for (const id of ids) {
    const match = /-(\d{2})$/.exec(id);
    if (match?.[1]) numbers.add(Number(match[1]));
  }
  return numbers;
}

function stripHouseDistricts(markdown: string, keep: ReadonlySet<string>): string {
  const keepDistrict = districtNumbers(keep);
  const lines = markdown.split("\n").filter((line) => {
    const race = HOUSE_RACE_ID.exec(line);
    HOUSE_RACE_ID.lastIndex = 0;
    if (race?.[1] && !keep.has(race[1])) return false;
    const district = /\bDistrict\s+(\d+)\b/.exec(line);
    if (district?.[1] && /^\s*[-*]/.test(line) && !keepDistrict.has(Number(district[1]))) return false;
    if (keep.size === 0 && /^\s*[-*]/.test(line) && /\bat-large\b/i.test(line)) return false;
    if (keep.size === 0 && /^No House filing is stored\.?$/.test(line.trim())) return false;
    return true;
  });
  const compacted = lines.filter((line, index, all) => {
    if (!isHouseHeadingLine(line)) return true;
    if (keep.size === 0) return false;
    const next = all.slice(index + 1).find((item) => item.trim().length > 0);
    return Boolean(next && !isHouseHeadingLine(next));
  });
  return compacted.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isHouseHeadingLine(line: string): boolean {
  const text = line.trim();
  return /^\**\s*U\.S\. House\**\s*$/i.test(text) || /^House:\s*$/i.test(text);
}

function sourceKept(
  source: ChatSource,
  keep: ReadonlySet<string>,
  keepDistrict: ReadonlySet<number>,
  senateOnly: boolean,
): boolean {
  const blob = `${source.url} ${source.title}`;
  const race = HOUSE_RACE_ID.exec(blob);
  HOUSE_RACE_ID.lastIndex = 0;
  if (race?.[1]) return keep.has(race[1]);
  const district = /\bDistrict\s+(\d+)\b/.exec(source.title);
  if (district?.[1] && /house/i.test(source.title)) return keepDistrict.has(Number(district[1]));
  if (senateOnly && /U\.S\. House/i.test(source.title)) return false;
  return true;
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
