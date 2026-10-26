import { houseContestTitle } from "../data/at-large";
import { leadSentences, presidentialContestNote } from "../data/calendar";
import { stateName } from "../data/states";
import type { ChatAnswer, ChatSource } from "./types";

const RACE_SLUG_SOURCE =
  "(?:19|20)\\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\\d{2})";
const RACE_SLUG = new RegExp(RACE_SLUG_SOURCE, "g");
const RACE_SLUG_EXACT = new RegExp(`^${RACE_SLUG_SOURCE}$`);

export const FORM2_FILINGS_SENTENCE =
  "Stored records are FEC Form 2 filings so far, not a full ballot.";

export const ASK_STATE_SENTENCE =
  "Ask for a state to list the stored Senate and House filings.";

export const ASK_PRESIDENTIAL_YEAR_SENTENCE =
  "Ask for a state to list Senate and House filings. In a presidential year, one national presidential contest is the presidential race when Form 2 filings are stored.";

const STATIC_CLAUSES = [
  "There is no presidential general election.",
  FORM2_FILINGS_SENTENCE,
  ASK_STATE_SENTENCE,
  ASK_PRESIDENTIAL_YEAR_SENTENCE,
];

/**
 * Race title for prose and source labels.
 * A stored title is kept when it is already human. Presidential rows titled
 * "President", and any slug, become a readable label such as
 * "2026 U.S. presidential filings" or "U.S. Senate, Kentucky".
 */
export function humanRaceTitle(race: {
  raceId: string;
  title?: string | null;
  office?: string | null;
  cycle?: number | null;
}): string {
  const fromId = labelForRaceId(race.raceId);
  const title = race.title?.trim() ?? "";
  const presidential = race.office === "president" || /-president$/.test(race.raceId);
  if (presidential && (!title || /^president$/i.test(title) || isRaceSlug(title))) {
    return fromId ?? (title || "U.S. presidential filings");
  }
  if (title && !isRaceSlug(title) && !isRawKey(title)) return title;
  return fromId ?? (title || "Candate record");
}

export function labelForRaceId(raceId: string): string | null {
  const president = /^((?:19|20)\d{2})-president$/.exec(raceId);
  if (president?.[1]) return `${president[1]} U.S. presidential filings`;
  const senate = /^(?:19|20)\d{2}-senate-([A-Z]{2})$/.exec(raceId);
  if (senate?.[1]) return `U.S. Senate, ${stateName(senate[1])}`;
  const house = /^(?:19|20)\d{2}-house-([A-Z]{2})-(\d{2})$/.exec(raceId);
  if (house?.[1] && house[2]) return houseContestTitle(house[1], house[2]);
  return null;
}

export function isRaceSlug(value: string): boolean {
  return RACE_SLUG_EXACT.test(value.trim());
}

/** Drop race-id tokens from prose. Slugs inside URLs stay so links keep working. */
export function replaceRaceSlugs(markdown: string): string {
  const withoutCode = markdown.replace(
    new RegExp(`\`(${RACE_SLUG_SOURCE})\``, "g"),
    (_match, id: string) => labelForRaceId(id) ?? id,
  );
  return withoutCode.replace(RACE_SLUG, (id: string, offset: number, whole: string) => {
    const prev = whole[offset - 1] ?? "";
    if (prev === "/" || prev === "=" || prev === "?" || prev === "&") return id;
    return labelForRaceId(id) ?? id;
  });
}

/**
 * One copy of the midterm (or other calendar) framing and the Form 2 disclaimer.
 * Sentences already present in `priorText` are treated as said in-thread.
 */
export function collapseBoilerplate(markdown: string, priorText = ""): string {
  const clauses = boilerplateClauses(`${priorText}\n${markdown}`);
  const seen = new Set<string>();
  for (const clause of clauses) {
    if (containsClause(priorText, clause)) seen.add(normalizeClause(clause));
  }
  const seenParagraphs = new Set<string>();
  const kept: string[] = [];
  for (const paragraph of markdown.split(/\n{2,}/)) {
    let next = paragraph;
    for (const clause of clauses) {
      if (!containsClause(next, clause)) continue;
      const key = normalizeClause(clause);
      if (seen.has(key)) next = removeClause(next, clause);
      else {
        seen.add(key);
        next = keepFirstClause(next, clause);
      }
    }
    next = cleanup(next);
    if (!next) continue;
    const norm = normalizeClause(next);
    if (seenParagraphs.has(norm)) continue;
    seenParagraphs.add(norm);
    kept.push(next);
  }
  return kept.join("\n\n").trim();
}

export function polishChatAnswer(answer: ChatAnswer, priorText = ""): ChatAnswer {
  return {
    ...answer,
    answer_markdown: collapseBoilerplate(replaceRaceSlugs(answer.answer_markdown), priorText),
    sources: polishSources(answer.sources),
  };
}

export function polishSources(sources: readonly ChatSource[]): ChatSource[] {
  const byUrl = new Map<string, ChatSource>();
  const order: string[] = [];
  for (const source of sources) {
    const url = source.url.trim();
    if (!url) continue;
    const key = canonicalUrl(url);
    const title = humanSourceTitle(source.title, url).slice(0, 200);
    const next: ChatSource = { title, url, as_of: source.as_of };
    const current = byUrl.get(key);
    if (!current) {
      byUrl.set(key, next);
      order.push(key);
      continue;
    }
    if (titleScore(title) > titleScore(current.title)) byUrl.set(key, next);
  }
  return order.flatMap((key) => {
    const source = byUrl.get(key);
    return source ? [source] : [];
  }).slice(0, 12);
}

export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    const params = [...parsed.searchParams.entries()].filter(([key]) => !/^utm_/i.test(key));
    params.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    parsed.search = "";
    for (const [key, value] of params) parsed.searchParams.append(key, value);
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function humanSourceTitle(title: string, url: string): string {
  const cleaned = title.trim();
  if (isRaceSlug(cleaned)) return labelForRaceId(cleaned) ?? "Candate record";
  if (!isRawKey(cleaned)) return cleaned || "Candate record";
  const fromUrl = raceIdInText(url);
  if (fromUrl) return labelForRaceId(fromUrl) ?? "Candate record";
  if (/form\s*2/i.test(cleaned)) return "FEC Form 2";
  return "Candate record";
}

function isRawKey(title: string): boolean {
  const cleaned = title.trim();
  if (isRaceSlug(cleaned)) return true;
  if (/^[HSP]\d[A-Z]{2}\d{5}$/.test(cleaned)) return true;
  if (/^form\s*2\b/i.test(cleaned) && !/—/.test(cleaned)) return true;
  if (/^\d{4,}$/.test(cleaned)) return true;
  return false;
}

function titleScore(title: string): number {
  if (isRaceSlug(title) || isRawKey(title)) return 0;
  if (title === "Candate record" || title === "FEC Form 2") return 1;
  return 2;
}

function raceIdInText(value: string): string | null {
  const match = new RegExp(RACE_SLUG_SOURCE).exec(value);
  return match?.[0] ?? null;
}

function boilerplateClauses(text: string): string[] {
  const years = new Set(text.match(/\b(?:19|20)\d{2}\b/g) ?? []);
  const clauses = [...STATIC_CLAUSES];
  for (const year of years) {
    const cycle = Number(year);
    clauses.push(...leadSentences(cycle));
    const note = presidentialContestNote(cycle);
    if (note) clauses.push(...note.split(/(?<=\.)\s+/).map((sentence) => sentence.trim()));
  }
  return [...new Set(clauses.filter(Boolean))].sort((a, b) => b.length - a.length);
}

function containsClause(text: string, clause: string): boolean {
  return clausePattern(clause).test(text);
}

function removeClause(text: string, clause: string): string {
  return text.replace(clauseFlags(clause, "gi"), "");
}

function keepFirstClause(text: string, clause: string): string {
  const match = clauseFlags(clause, "i").exec(text);
  if (!match) return text;
  const end = match.index + match[0].length;
  return text.slice(0, end) + removeClause(text.slice(end), clause);
}

function clauseFlags(clause: string, flags: string): RegExp {
  return new RegExp(clausePattern(clause).source, flags);
}

function clausePattern(clause: string): RegExp {
  const parts = clause
    .replace(/\.$/, "")
    .split(/\s+/)
    .map((part) => `\\*{0,2}${escapeRegExp(part)}\\*{0,2}`);
  return new RegExp(`${parts.join("\\s+")}\\.?`, "i");
}

function normalizeClause(value: string): string {
  return value
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanup(text: string): string {
  return text
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
