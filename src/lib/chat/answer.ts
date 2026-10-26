import { EMPTY_RECORDS_MARKDOWN } from "./prompt";
import type { ChatAnswer, ChatSource } from "./types";

const MAX_ANSWER = 8000;
const ENTITY_ID_SOURCE =
  "\\b(?:(?:19|20)\\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\\d{2})|[HSP]\\d[A-Z]{2}\\d{5})\\b";
const URL_SOURCE = "https?:\\/\\/[^\\s)\\\">]+";

type ModelAnswer = {
  answer_markdown: string;
  sources: ChatSource[];
  refused: boolean;
};

/**
 * When tools returned records, keep the model's prose if it parsed and fill
 * sources from the tool payload when the model omitted them or cited a URL
 * the tools did not return. Empty tool results become a refusal.
 */
export function finalizeAnswer(input: {
  modelText: string | null;
  toolRecords: number;
  toolSources: readonly ChatSource[];
  snippets: readonly string[];
  groundedText: string;
  toolsCalled: number;
}): ChatAnswer {
  const allowed = dedupe(input.toolSources);
  const allowedUrls = new Set(allowed.map((source) => source.url));
  const grounded = idsIn(input.groundedText);
  const parsed = input.modelText ? parseModelAnswer(input.modelText) : null;

  if (input.toolRecords > 0) {
    const prose =
      parsed?.answer_markdown.trim() || summaryFromSnippets(input.snippets);
    if (hasUngroundedId(prose, grounded) || hasUngroundedUrl(prose, allowedUrls)) {
      return {
        answer_markdown: EMPTY_RECORDS_MARKDOWN,
        sources: allowed,
        refused: true,
      };
    }
    const cited = (parsed?.sources ?? []).filter((source) => allowedUrls.has(source.url));
    const sources = cited.length > 0 ? cited : allowed;
    if (sources.length === 0) {
      return {
        answer_markdown: EMPTY_RECORDS_MARKDOWN,
        sources: [],
        refused: true,
      };
    }
    return {
      answer_markdown: cap(prose),
      sources,
      refused: parsed?.refused === true,
    };
  }

  if (input.toolsCalled > 0 || !parsed) {
    const prose = parsed?.answer_markdown.trim() || EMPTY_RECORDS_MARKDOWN;
    if (hasUngroundedId(prose, grounded) || hasUngroundedUrl(prose, allowedUrls)) {
      return { answer_markdown: EMPTY_RECORDS_MARKDOWN, sources: [], refused: true };
    }
    return { answer_markdown: cap(prose), sources: [], refused: true };
  }

  if (
    hasUngroundedId(parsed.answer_markdown, grounded) ||
    hasUngroundedUrl(parsed.answer_markdown, allowedUrls)
  ) {
    return { answer_markdown: EMPTY_RECORDS_MARKDOWN, sources: [], refused: true };
  }
  return {
    answer_markdown: cap(parsed.answer_markdown.trim()),
    sources: [],
    refused: parsed.refused,
  };
}

export function parseModelAnswer(text: string): ModelAnswer | null {
  const parsed = parseJsonObject(text);
  if (!parsed) return null;
  const markdown = parsed.answer_markdown;
  if (typeof markdown !== "string" || markdown.trim().length === 0) return null;
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.flatMap((item) => {
        const source = cleanSource(item);
        return source ? [source] : [];
      })
    : [];
  return {
    answer_markdown: markdown,
    sources,
    refused: parsed.refused === true,
  };
}

export function idsIn(text: string): Set<string> {
  return new Set(text.match(new RegExp(ENTITY_ID_SOURCE, "g")) ?? []);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1]?.trim() ?? text.trim();
  const direct = tryParse(body);
  if (direct) return direct;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return tryParse(body.slice(start, end + 1));
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cleanSource(value: unknown): ChatSource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.title !== "string" ||
    typeof record.url !== "string" ||
    typeof record.as_of !== "string"
  ) {
    return null;
  }
  const title = record.title.trim();
  const url = record.url.trim();
  const asOf = record.as_of.trim();
  if (!title || !url || !asOf) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    title: title.slice(0, 200),
    url: url.slice(0, 500),
    as_of: asOf.slice(0, 80),
  };
}

function hasUngroundedId(answer: string, grounded: Set<string>): boolean {
  for (const id of idsIn(answer)) {
    if (!grounded.has(id)) return true;
  }
  return false;
}

function hasUngroundedUrl(answer: string, allowed: Set<string>): boolean {
  const matches = answer.match(new RegExp(URL_SOURCE, "gi")) ?? [];
  for (const match of matches) {
    const url = match.replace(/[.,]$/, "");
    if (!allowed.has(url)) return true;
  }
  return false;
}

function summaryFromSnippets(snippets: readonly string[]): string {
  const lines = snippets.slice(0, 12).map((snippet) => `- ${snippet}`);
  if (lines.length === 0) return EMPTY_RECORDS_MARKDOWN;
  return `Stored Candate-voter records:\n\n${lines.join("\n")}`;
}

function dedupe(sources: readonly ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  const unique: ChatSource[] = [];
  for (const source of sources) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    unique.push(source);
  }
  return unique.slice(0, 12);
}

function cap(text: string): string {
  return text.length > MAX_ANSWER ? `${text.slice(0, MAX_ANSWER - 1)}…` : text;
}
