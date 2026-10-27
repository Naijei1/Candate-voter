import { houseContestTitle } from "../data/at-large";
import { leadSentences, presidentialContestNote } from "../data/calendar";
import { stateName } from "../data/states";
import { collapseRepeatedParty } from "../format";
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
    answer_markdown: collapseBoilerplate(
      replaceRaceSlugs(humanizeAskProse(answer.answer_markdown)),
      priorText,
    ),
    sources: polishSources(answer.sources),
  };
}

const PARTY_CODE = String.raw`([A-Za-z][A-Za-z0-9/]{0,8})`;
const PARTY_LABEL = String.raw`(?:"([^"\n]+)"|“([^”\n]+)”|'([^'\n]+)'|([A-Za-z][^,.;\n"“”()]*))`;
const PAREN_PARTY_ECHO = new RegExp(
  String.raw`\(\s*${PARTY_CODE}\s*,\s*partyLabel\s*:\s*${PARTY_LABEL}\s*\)`,
  "gi",
);
const BARE_PARTY_ECHO = new RegExp(
  String.raw`\b${PARTY_CODE}\s*,\s*partyLabel\s*:\s*${PARTY_LABEL}`,
  "gi",
);
const PARTY_LABEL_KEY = new RegExp(String.raw`\bpartyLabel\s*:\s*${PARTY_LABEL}`, "gi");

const PROVENANCE_SENTENCE =
  /\b(?:(?:These|Those|The|Our)\s+)?records\s+come\s+from\s+[^.\n]*?\bdatabase\b\.?/gi;

const STORAGE_PHRASE = new RegExp(
  [
    String.raw`\bFEC\s+Form\s+2\s+filings\s+stored\s+in\s+(?:(?:(?:this|the)\s+)?site['’]s|our|an\s+internal|the)\s+database\b`,
    String.raw`\bstored\s+in\s+(?:(?:(?:this|the)\s+)?site['’]s|our|an\s+internal|the)\s+database\b`,
    String.raw`\bin\s+(?:(?:(?:this|the)\s+)?site['’]s|our|an\s+internal)\s+database\b`,
    String.raw`\b(?:(?:this|the)\s+)?site['’]s\s+database\b`,
  ].join("|"),
  "gi",
);

/**
 * Last pass for visitor copy. Tool JSON and the system prompt already use
 * a readable party and public-FEC wording; this catches an echo anyway.
 * Party echoes include `DEM, partyLabel: Democratic` with or without
 * parentheses or quotes. Provenance sentences open with public FEC records.
 */
function humanizeAskProse(markdown: string): string {
  return cleanup(
    collapseRepeatedParty(stripDatabaseWord(replaceInternalStorage(stripPartyFieldEcho(markdown)))),
  );
}

function stripPartyFieldEcho(markdown: string): string {
  return markdown
    .replace(PAREN_PARTY_ECHO, replacePartyEcho)
    .replace(BARE_PARTY_ECHO, replacePartyEcho)
    .replace(PARTY_LABEL_KEY, (_match, quoted?: string, curly?: string, single?: string, bare?: string) =>
      partyLabelText(quoted, curly, single, bare),
    )
    .replace(/\bparty(?:Code|Affiliation)\s*:\s*"?[^",;\n)]*"?/g, "")
    .replace(/\bpartyLabel\b:?/gi, "");
}

function replacePartyEcho(
  _match: string,
  code: string,
  quoted?: string,
  curly?: string,
  single?: string,
  bare?: string,
): string {
  return readableParty(code, partyLabelText(quoted, curly, single, bare));
}

function partyLabelText(quoted?: string, curly?: string, single?: string, bare?: string): string {
  return (quoted ?? curly ?? single ?? bare ?? "").trim().replace(/\s+/g, " ");
}

function readableParty(code: string, label: string): string {
  const name = label.trim();
  const trimmed = code.trim();
  if (!name) return trimmed;
  if (name.toUpperCase() === trimmed.toUpperCase()) return name;
  return `${name} (${trimmed})`;
}

/**
 * Last pass before Ask text is shown. Server answers are already cleaned;
 * this still runs so a regression cannot show field names or "database".
 */
export function presentAskMarkdown(markdown: string): string {
  return cleanup(replaceRaceSlugs(humanizeAskProse(markdown)));
}

function stripDatabaseWord(markdown: string): string {
  return markdown.replace(/\bdatabase\b/gi, (_match, offset: number, whole: string) => {
    const before = whole.slice(0, offset);
    if (before.trim().length === 0 || /[.!?]\s*$/.test(before)) return "Records";
    return "records";
  });
}

function replaceInternalStorage(markdown: string): string {
  const grounded = markdown.replace(
    PROVENANCE_SENTENCE,
    (match: string, offset: number, whole: string) => {
      if (!isSentenceStart(whole, offset)) return match;
      if (match.endsWith(".")) return "Based on public FEC records.";
      const after = whole.slice(offset + match.length);
      if (after.trim().length === 0) return "Based on public FEC records.";
      return "Based on public FEC records";
    },
  );
  return grounded.replace(STORAGE_PHRASE, (match: string, offset: number, whole: string) =>
    storageReplacement(match, offset, whole),
  );
}

function storageReplacement(match: string, offset: number, whole: string): string {
  const atStart = isSentenceStart(whole, offset);
  if (/^in\b/i.test(match)) return atStart ? "In public FEC records" : "in public FEC records";
  const after = whole.slice(offset + match.length).replace(/^[*_\s]+/, "");
  const sourceClause = /^(?:stored|fec)\b/i.test(match);
  const opensSentence = atStart && (after.length === 0 || /^[.!?]/.test(after) || sourceClause);
  if (opensSentence) return "Based on public FEC records";
  if (/^stored\b/i.test(match)) return "based on public FEC records";
  return atStart ? "Public FEC records" : "public FEC records";
}

function isSentenceStart(whole: string, offset: number): boolean {
  const before = whole.slice(0, offset).replace(/[*_]+/g, "");
  if (before.trim().length === 0) return true;
  if (/[.!?:]\s*$/.test(before) || /\n\s*$/.test(before)) return true;
  return /(?:^|\n)\s*(?:[-*+]|\d+[.)])\s+$/.test(before);
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
