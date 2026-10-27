import { isResourceId } from "../api/ids";
import { resolveCycle } from "../data/cycles";
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

export type ChatErrorKind = "bad_request" | "rate_limit" | "unavailable" | "network";

export type ChatContextInput = {
  raceId?: string;
  candidateId?: string;
  cycle?: number;
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
  if (input.pathname === "/chat") {
    return {
      raceId: validId(input.searchParams.get("raceId")),
      candidateId: validId(input.searchParams.get("candidateId")),
      cycle,
      messagePrefix: pageNote(input.searchParams.get("note")),
      panel: false,
    };
  }

  const raceMatch = /^\/races\/([^/]+)$/.exec(input.pathname);
  const candidateMatch = /^\/candidates\/([^/]+)$/.exec(input.pathname);
  return {
    raceId: raceMatch ? validId(decodeURIComponent(raceMatch[1])) : undefined,
    candidateId: candidateMatch ? validId(decodeURIComponent(candidateMatch[1])) : undefined,
    cycle,
    panel: input.pathname === "/" || raceMatch != null || candidateMatch != null,
  };
}

export function isAskPanelPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    /^\/races\/[^/]+$/.test(pathname) ||
    /^\/candidates\/[^/]+$/.test(pathname)
  );
}

/** Short factual chip. A page label wins. Otherwise a race or candidate id. */
export function contextLabel(context: ChatContextInput): string | null {
  const custom = context.label?.trim();
  if (custom) return custom;
  const parts: string[] = [];
  if (context.raceId) parts.push(raceChipLabel(context.raceId));
  if (context.candidateId) parts.push(`Candidate ${context.candidateId}`);
  if (parts.length === 0) return null;
  if (context.cycle != null) parts.push(String(context.cycle));
  return parts.join(" · ");
}

/** Link text for a source. A raw URL is never the label. */
export function citationLabel(source: { title: string; url: string }): string {
  const title = source.title.trim();
  const url = source.url.trim();
  if (!title || title === url || looksLikeUrl(title)) return "Source";
  return title.replace(/\bFEC Form 2\b/g, "Statement of candidacy (Form 2)");
}

export function chatPageHref(context: ChatContextInput, draft?: string): string {
  const params = new URLSearchParams();
  if (context.raceId) params.set("raceId", context.raceId);
  if (context.candidateId) params.set("candidateId", context.candidateId);
  if (context.cycle != null) params.set("year", String(context.cycle));
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
  threadId?: string;
}): { ok: true; body: ChatRequest } | { ok: false; reason: "empty" | "too_long" } {
  const message = input.message.trim();
  if (message.length === 0) return { ok: false, reason: "empty" };
  if (message.length > MAX_CHAT_MESSAGE) return { ok: false, reason: "too_long" };
  const threadId =
    input.threadId && THREAD_ID.test(input.threadId) ? input.threadId : undefined;
  return {
    ok: true,
    body: {
      message,
      ...(input.raceId ? { raceId: input.raceId } : {}),
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
      ...(input.cycle != null ? { cycle: input.cycle } : {}),
      ...(threadId ? { threadId } : {}),
    },
  };
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
            nodes.push({
              type: "link",
              href: link.href,
              external: link.external,
              children: parseInlines(label, options, inBold),
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

function raceChipLabel(raceId: string): string {
  const senate = /^(\d{4})-senate-([A-Z]{2})$/.exec(raceId);
  if (senate) return `${senate[2]} Senate`;
  const house = /^(\d{4})-house-([A-Z]{2})-(\d{2})$/.exec(raceId);
  if (house) {
    const district = house[3] === "00" ? "at large" : String(Number(house[3]));
    return `${house[2]} House ${district}`;
  }
  if (/^\d{4}-president$/.test(raceId)) return "President";
  return raceId;
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
