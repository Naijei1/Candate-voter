import { isResourceId } from "../api/ids";
import { resolveCycle } from "../data/cycles";
import { isPostalState, stateName } from "../data/states";
import { normalizeZip } from "../lookup/zip-view";
import {
  CHAT_INCOMPLETE_MESSAGE,
  CHAT_MODEL_UNAVAILABLE_MESSAGE,
  CHAT_TIMEOUT_MESSAGE,
} from "./errors";
import { isRaceSlug, labelForRaceId, presentAskMarkdown } from "./polish";
import type { ChatMode, ChatRequest, ChatSource } from "./types";

export const MAX_CHAT_MESSAGE = 2000;

const THREAD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const AS_OF_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export type ChatErrorKind =
  | "bad_request"
  | "rate_limit"
  | "unavailable"
  | "network"
  | "timeout"
  | "model_unavailable"
  | "incomplete";

/** Optional 503 `code` from the chat contract. Absent codes stay on HTTP status. */
export type ChatFailureCode = "timeout" | "model_unavailable" | "incomplete";

export type ChatContextInput = {
  raceId?: string;
  candidateId?: string;
  cycle?: number;
  /** Two-letter postal code from the page URL or sheet. */
  state?: string;
  /** Five-digit ZIP from the page URL or sheet. */
  zip?: string;
  /**
   * Prepended to the question in the POST body. Not a request field.
   * Only a "Page context:" note from the state panel is forwarded.
   */
  messagePrefix?: string;
  /** Visitor-facing chip. A name or race title, not a raw id. */
  label?: string;
};

export type CitationView = {
  href: string;
  external: boolean;
};

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "link"; href: string; external: boolean; children: InlineNode[] };

export type MarkdownBlock =
  | { type: "h"; level: 1 | 2 | 3; inlines: InlineNode[] }
  | { type: "p"; lines: InlineNode[][] }
  | { type: "ul"; items: InlineNode[][] }
  | { type: "ol"; items: InlineNode[][] };

export type CitationOptions = {
  origin?: string;
  basePath?: string;
};

/** Page context for `/`, a race, a candidate, or `/chat` query params. */
export function contextFromLocation(input: {
  pathname: string;
  searchParams: { get(name: string): string | null };
  cycles: readonly number[];
  now?: Date;
}): ChatContextInput & { panel: boolean } {
  const requested = input.searchParams.get("year") ?? undefined;
  const cycle = resolveCycle(input.cycles, requested, input.now) ?? undefined;
  const geo = pageGeo(input.searchParams.get("state"), input.searchParams.get("zip"));
  if (input.pathname === "/chat") {
    return withoutMismatchedRace({
      raceId: validId(input.searchParams.get("raceId")),
      candidateId: validId(input.searchParams.get("candidateId")),
      cycle,
      messagePrefix: pageNote(input.searchParams.get("note")),
      panel: false,
      ...geo,
    });
  }

  const raceMatch = /^\/races\/([^/]+)$/.exec(input.pathname);
  const candidateMatch = /^\/candidates\/([^/]+)$/.exec(input.pathname);
  return withoutMismatchedRace({
    raceId: raceMatch ? validId(decodeURIComponent(raceMatch[1])) : undefined,
    candidateId: candidateMatch ? validId(decodeURIComponent(candidateMatch[1])) : undefined,
    cycle,
    panel: input.pathname === "/" || raceMatch != null || candidateMatch != null,
    ...geo,
  });
}

/**
 * Ask shows the year in the header control. A race from another year is not
 * that context: the chip and the request stay on the selected year.
 */
export function presentedAskContext<T extends ChatContextInput>(
  located: T,
  page: ChatContextInput | null,
): T {
  if (!page) return withoutMismatchedRace(located);
  const cycle = located.cycle ?? page.cycle;
  return withoutMismatchedRace({
    ...located,
    cycle,
    ...(page.raceId || located.raceId ? { raceId: page.raceId ?? located.raceId } : {}),
    ...(page.candidateId || located.candidateId
      ? { candidateId: page.candidateId ?? located.candidateId }
      : {}),
    ...(page.messagePrefix || located.messagePrefix
      ? { messagePrefix: page.messagePrefix ?? located.messagePrefix }
      : {}),
    ...(page.label || located.label ? { label: page.label ?? located.label } : {}),
    ...(page.state || located.state ? { state: page.state ?? located.state } : {}),
    ...(page.zip || located.zip ? { zip: page.zip ?? located.zip } : {}),
  });
}

/** Drop a race whose id year is not the selected year. State and ZIP stay. */
export function withoutMismatchedRace<T extends ChatContextInput>(context: T): T {
  const raceYear = raceYearOf(context.raceId);
  if (context.cycle == null || raceYear == null || raceYear === context.cycle) return context;
  const next = { ...context };
  delete next.raceId;
  delete next.candidateId;
  delete next.messagePrefix;
  delete next.label;
  return next;
}

function raceYearOf(raceId: string | undefined): number | null {
  if (!raceId) return null;
  const match = /^((?:19|20)\d{2})-/.exec(raceId);
  if (!match?.[1]) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
}

export function isAskPanelPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    /^\/races\/[^/]+$/.test(pathname) ||
    /^\/candidates\/[^/]+$/.test(pathname)
  );
}

/** Short factual chip. A page label wins. Raw ids stay off the chip. */
export function contextLabel(context: ChatContextInput): string | null {
  const custom = friendlyChip(context.label);
  if (custom) return custom;
  const parts: string[] = [];
  if (context.raceId) parts.push(raceChipLabel(context.raceId));
  if (context.candidateId) parts.push("This candidate");
  if (parts.length === 0 && context.state) parts.push(stateName(context.state));
  else if (parts.length === 0 && context.zip) parts.push(`ZIP ${context.zip}`);
  if (parts.length === 0) return null;
  if (context.cycle != null) parts.push(String(context.cycle));
  return parts.join(" · ");
}

/** Link text for a source. A raw URL or race id is never the label. */
export function citationLabel(source: { title: string; url: string }): string {
  const url = source.url.trim();
  const title = presentAskMarkdown(source.title).trim();
  if (title && title !== url && !looksLikeUrl(title) && !isRaceSlug(title) && !isRawVisitorKey(title)) {
    return title.replace(/\bFEC Form 2\b/g, "Statement of candidacy (Form 2)");
  }
  return friendlyFromUrl(url) ?? "Source";
}

export function chatPageHref(context: ChatContextInput, draft?: string): string {
  const params = new URLSearchParams();
  if (context.raceId) params.set("raceId", context.raceId);
  if (context.candidateId) params.set("candidateId", context.candidateId);
  if (context.cycle != null) params.set("year", String(context.cycle));
  if (context.state) params.set("state", context.state);
  if (context.zip) params.set("zip", context.zip);
  const note = pageNote(context.messagePrefix ?? null);
  if (note) params.set("note", note);
  const question = draft?.trim() ?? "";
  if (question) params.set("q", question.slice(0, MAX_CHAT_MESSAGE));
  const query = params.toString();
  return query ? `/chat?${query}` : "/chat";
}

export function suggestedPrompts(context: ChatContextInput): string[] {
  if (context.raceId && context.candidateId) {
    return [
      "Who filed in this race?",
      "What was the last FEC update for this candidate?",
      "Show sources for this race",
      "List candidates in this race with filing dates",
    ];
  }
  if (context.candidateId) {
    return [
      "What was the last FEC update for this candidate?",
      "Show sources for this candidate",
      "Which race is this candidate filed in?",
    ];
  }
  if (context.raceId) {
    return [
      "Who filed in this race?",
      "Show sources for this race",
      "List candidates in this race with filing dates",
      "What was the last FEC update for this race?",
    ];
  }
  return [
    "Who filed in Alaska Senate?",
    "Show sources for a Senate race",
    "What was the last FEC update for a candidate?",
    "List candidates in a race with filing dates",
  ];
}

export function buildChatRequestBody(input: {
  message: string;
  raceId?: string;
  candidateId?: string;
  cycle?: number;
  state?: string;
  zip?: string;
  threadId?: string;
}): { ok: true; body: ChatRequest } | { ok: false; reason: "empty" | "too_long" } {
  const message = input.message.trim();
  if (message.length === 0) return { ok: false, reason: "empty" };
  if (message.length > MAX_CHAT_MESSAGE) return { ok: false, reason: "too_long" };
  const threadId =
    input.threadId && THREAD_ID.test(input.threadId) ? input.threadId : undefined;
  const cycle = alignedCycle(input.cycle, input.raceId);
  const state = readPostal(input.state);
  const zip = readZip(input.zip);
  return {
    ok: true,
    body: {
      message,
      ...(input.raceId ? { raceId: input.raceId } : {}),
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
      ...(cycle != null ? { cycle, year: cycle } : {}),
      ...(state ? { state } : {}),
      ...(zip ? { zip } : {}),
      ...(threadId ? { threadId } : {}),
    },
  };
}

/** `year` is an alias of `cycle`. A race id prefix wins when the two years differ. */
function alignedCycle(cycle: number | undefined, raceId: string | undefined): number | undefined {
  const prefix = raceId ? /^(\d{4})-/.exec(raceId) : null;
  const raceYear = prefix?.[1] ? Number(prefix[1]) : null;
  if (raceYear != null && cycle != null && cycle !== raceYear) return raceYear;
  return cycle ?? raceYear ?? undefined;
}

export function parseChatSuccess(data: unknown):
  | {
      ok: true;
      answer_markdown: string;
      sources: ChatSource[];
      refused: boolean;
      /** Null only when an older payload omitted `mode`. Alignment is never inferred. */
      mode: ChatMode | null;
      threadId?: string;
    }
  | { ok: false } {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false };
  const record = data as Record<string, unknown>;
  if (typeof record.answer_markdown !== "string") return { ok: false };
  const answer = record.answer_markdown.trim();
  if (!answer || answer.length > 20_000) return { ok: false };
  return {
    ok: true,
    answer_markdown: record.answer_markdown,
    sources: parseSources(record.sources),
    refused: record.refused === true,
    mode: record.mode === "alignment" || record.mode === "factual" ? record.mode : null,
    ...(typeof record.threadId === "string" && THREAD_ID.test(record.threadId)
      ? { threadId: record.threadId }
      : {}),
  };
}

/** `Retry-After` as delta-seconds, or an HTTP-date relative to `nowMs`. */
export function parseRetryAfterSeconds(header: string | null, nowMs: number): number | null {
  if (header == null) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const when = Date.parse(trimmed);
  if (Number.isNaN(when)) return null;
  return Math.max(0, Math.ceil((when - nowMs) / 1000));
}

export function classifyChatStatus(status: number): ChatErrorKind {
  if (status === 400) return "bad_request";
  if (status === 429) return "rate_limit";
  return "unavailable";
}

/**
 * Upcoming chat errors may send `code` beside `{ error, message }`.
 * A known code picks the visitor sentence. Anything else stays unset so
 * the HTTP status keeps today's classification.
 */
export function chatFailureCode(data: unknown): ChatFailureCode | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const code = (data as { code?: unknown }).code;
  if (code === "timeout" || code === "model_unavailable" || code === "incomplete") return code;
  return null;
}

export function errorCopy(kind: ChatErrorKind, remainingSeconds: number | null): string {
  if (kind === "bad_request") {
    return "Please shorten or rephrase your question (max 2,000 characters).";
  }
  if (kind === "rate_limit") {
    if (remainingSeconds != null && remainingSeconds > 0) {
      return `Too many questions right now — wait ${waitPhrase(remainingSeconds)} and retry.`;
    }
    if (remainingSeconds === 0) return "Too many questions right now. You can retry.";
    return "Too many questions right now — wait a minute and retry.";
  }
  if (kind === "network") return "Check your connection and try again.";
  if (kind === "timeout") return CHAT_TIMEOUT_MESSAGE;
  if (kind === "incomplete") return CHAT_INCOMPLETE_MESSAGE;
  if (kind === "model_unavailable") return CHAT_MODEL_UNAVAILABLE_MESSAGE;
  return "Answers are temporarily unavailable. Try again shortly.";
}

export function rateLimitRemainingSeconds(retryAtMs: number | null, nowMs: number): number {
  if (retryAtMs == null) return 0;
  return Math.max(0, Math.ceil((retryAtMs - nowMs) / 1000));
}

/** America/New_York when the value is ISO-8601. Anything else stays verbatim. */
export function formatAsOf(value: string): string {
  const text = value.trim();
  if (!text || text.toLowerCase() === "unknown") return "As of unknown";
  if (!ISO_INSTANT.test(text)) return `As of ${text}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return `As of ${text}`;
  return `As of ${AS_OF_FORMAT.format(date)}`;
}

/**
 * In-app paths and same-site race, candidate, agent, and chat URLs stay in
 * this tab. Other https URLs open in a new tab. Unsafe schemes are dropped.
 */
export function citationLink(url: string, options: CitationOptions = {}): CitationView | null {
  const text = url.trim();
  if (!text || text.length > 2_000 || /[\u0000-\u001F\s]/.test(text)) return null;
  if (text.startsWith("/") && !text.startsWith("//")) {
    return { href: text, external: false };
  }
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return null;
  }
  if (parsed.username || parsed.password) return null;
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const appPath = inAppPath(parsed.pathname, options.basePath ?? "");
  const sameOrigin = options.origin != null && parsed.origin === options.origin;
  if (appPath && (sameOrigin || appPath !== "/")) {
    return { href: `${appPath}${parsed.search}${parsed.hash}`, external: false };
  }
  if (parsed.protocol !== "https:") return null;
  return { href: parsed.toString(), external: true };
}

export function parseMarkdown(source: string, options: CitationOptions = {}): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      type: "p",
      lines: paragraph.map((line) => parseInlines(line, options, false)),
    });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? "";
    const heading = /^(#{1,3})\s+(\S.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const marks = heading[1] ?? "#";
      const level = marks.length === 1 ? 1 : marks.length === 2 ? 2 : 3;
      blocks.push({
        type: "h",
        level,
        inlines: parseInlines(heading[2] ?? "", options, false),
      });
      index += 1;
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (!unordered && !ordered) {
      if (line.trim() === "") flushParagraph();
      else paragraph.push(line);
      index += 1;
      continue;
    }
    flushParagraph();
    const orderedList = ordered != null;
    const items: InlineNode[][] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      const match = (orderedList ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/).exec(current);
      if (!match) break;
      items.push(parseInlines(match[1] ?? "", options, false));
      index += 1;
    }
    blocks.push(orderedList ? { type: "ol", items } : { type: "ul", items });
  }
  flushParagraph();
  return blocks;
}

export function plainText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.text;
      return plainText(node.children);
    })
    .join("");
}

function parseSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];
  const sources: ChatSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.url !== "string" || typeof row.as_of !== "string") {
      continue;
    }
    const title = row.title.trim();
    const url = row.url.trim();
    const asOf = row.as_of.trim();
    if (!title || !url || !asOf) continue;
    sources.push({ title, url, as_of: asOf });
  }
  return sources;
}

function parseInlines(text: string, options: CitationOptions, inBold: boolean): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: "text", text: buffer });
    buffer = "";
  };

  for (let index = 0; index < text.length; ) {
    if (!inBold && text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2);
      if (end > index + 2) {
        flush();
        nodes.push({
          type: "bold",
          children: parseInlines(text.slice(index + 2, end), options, true),
        });
        index = end + 2;
        continue;
      }
    }
    if (text[index] === "[") {
      const close = text.indexOf("]", index + 1);
      if (close > index + 1 && text[close + 1] === "(") {
        const endParen = text.indexOf(")", close + 2);
        if (endParen > close + 2) {
          const label = text.slice(index + 1, close);
          const rawHref = text.slice(close + 2, endParen).trim();
          const link = label.trim() ? citationLink(rawHref, options) : null;
          if (link) {
            flush();
            const safe = linkText(label, rawHref);
            nodes.push({
              type: "link",
              href: link.href,
              external: link.external,
              children: safe
                ? [{ type: "text", text: safe }]
                : parseInlines(label, options, inBold),
            });
            index = endParen + 1;
            continue;
          }
        }
      }
    }
    buffer += text[index];
    index += 1;
  }
  flush();
  return nodes;
}

function inAppPath(pathname: string, basePath: string): string | null {
  const base = basePath.replace(/\/+$/, "");
  let path = pathname;
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || "/";
  }
  if (!path.startsWith("/")) return null;
  if (path === "/") return "/";
  if (/^\/(races|candidates|agent|chat)(\/|$)/.test(path)) return path;
  return null;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function isRawVisitorKey(value: string): boolean {
  const cleaned = value.trim();
  if (isRaceSlug(cleaned)) return true;
  if (/^[HSP]\d[A-Z]{2}\d{5}$/.test(cleaned)) return true;
  if (/^\d{4,}$/.test(cleaned)) return true;
  if (/\bpartyLabel\b/i.test(cleaned) || /\bdatabase\b/i.test(cleaned)) return true;
  return false;
}

function friendlyFromUrl(url: string): string | null {
  const match = /((?:19|20)\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2}))/.exec(url);
  return match?.[1] ? labelForRaceId(match[1]) : null;
}

function friendlyChip(label: string | undefined): string | null {
  const custom = label?.trim() ?? "";
  if (!custom) return null;
  const cleaned = presentAskMarkdown(custom);
  if (cleaned && !looksLikeUrl(cleaned) && !isRaceSlug(cleaned) && !isRawVisitorKey(cleaned)) {
    return cleaned;
  }
  if (isRaceSlug(custom)) return labelForRaceId(custom);
  return null;
}

function linkText(label: string, href: string): string | null {
  const trimmed = label.trim();
  if (!looksLikeUrl(trimmed) && trimmed !== href.trim() && !isRaceSlug(trimmed)) return null;
  return citationLabel({ title: trimmed, url: href });
}

function raceChipLabel(raceId: string): string {
  const senate = /^(\d{4})-senate-([A-Z]{2})$/.exec(raceId);
  if (senate) return `${senate[2]} Senate`;
  const house = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/.exec(raceId);
  if (house) {
    const district = house[3] === "00" ? "at large" : String(Number(house[3]));
    return `${house[2]} House ${district}`;
  }
  if (/^\d{4}-president$/.test(raceId)) return "President";
  return labelForRaceId(raceId) ?? "This race";
}

function pageGeo(state: string | null, zip: string | null): { state?: string; zip?: string } {
  const postal = readPostal(state);
  const code = readZip(zip);
  return {
    ...(postal ? { state: postal } : {}),
    ...(code ? { zip: code } : {}),
  };
}

export function readPostal(value: string | null | undefined): string | undefined {
  const postal = value?.trim().toUpperCase() ?? "";
  return isPostalState(postal) ? postal : undefined;
}

export function readZip(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return normalizeZip(value) ?? undefined;
}

function pageNote(value: string | null): string | undefined {
  const text = value?.trim() ?? "";
  if (!text.startsWith("Page context:")) return undefined;
  return text.slice(0, 500);
}

function validId(value: string | null): string | undefined {
  if (!value) return undefined;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  return isResourceId(decoded) ? decoded : undefined;
}

function waitPhrase(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? "1 second" : `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
