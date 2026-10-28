import { raceMatchesCycle } from "../data/cycle-match";
import { logReadError } from "../data/read";
import { personMatchKey } from "../data/dedupe";
import { linkPersonFilings } from "../data/person-filings";
import { stateName } from "../data/states";
import { loadPublicCandidates, loadVisibleRace, visibleRaces, type PublicCandidate } from "../data/view";
import { partyLabel } from "../format";
import type { Race } from "../types";
import { isAbortError } from "./errors";
import { pageRefreshAsOf, readIngestRefreshedAt } from "./freshness";
import { askedChamber, chamberFromRaceId, cycleMentionedIn, isExplicitListQuestion, stateFromRaceId, stateMentionedIn, visitorQuestion, yearFromRaceId } from "./intent";
import { FORM2_FILINGS_SENTENCE, humanRaceTitle } from "./polish";
import type { ToolContext } from "./tools";
import type { ChatAnswer, ChatRequest, ChatSource } from "./types";

const NAME_CAP = 12;
const COUNT_NAME_CAP = 6;
const SOURCE_CAP = 8;

const ROSTER = /\b(?:compare|all|every|list|who|candidates|running|filed)\b/i;

/**
 * One state, both chambers. Answer from stored rows instead of a tool loop
 * that calls get_race once per district.
 */
export function isStateRosterQuestion(message: string, state?: string | null): boolean {
  const question = visitorQuestion(message);
  if (!state && !stateMentionedIn(question) && !stateMentionedIn(message)) return false;
  if (!/\bhouse\b/i.test(question) || !/\bsenate\b/i.test(question)) return false;
  return ROSTER.test(question);
}

export async function answerStateRoster(input: {
  request: ChatRequest;
  ctx: ToolContext;
}): Promise<ChatAnswer | { unavailable: true; message: string }> {
  const state = input.request.state ?? stateMentionedIn(input.request.message);
  if (!state) {
    return {
      answer_markdown: "Name a state and I can list the Senate and House filings stored for it.",
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  const cycle = resolveCycle(input.request, input.ctx.now);
  const chamber = askedChamber(input.request.message);
  try {
    const stored = visibleRaces(await input.ctx.repo.listRacesByCycle(cycle)).filter((race) =>
      raceMatchesCycle(race, cycle),
    );
    let filed = stored.filter(
      (race) =>
        race.state === state &&
        race.empty !== true &&
        (race.office === "senate" || race.office === "house"),
    );
    if (chamber === "senate" || chamber === "house") {
      filed = filed.filter((race) => race.office === chamber);
    }
    const pageChamber = chamberFromRaceId(input.request.raceId);
    if (
      input.request.raceId &&
      (chamber === "senate" || chamber === "house") &&
      pageChamber === chamber
    ) {
      const focused = filed.filter((race) => race.raceId === input.request.raceId);
      if (focused.length > 0) filed = focused;
    }
    const [presented, refreshedAt] = await Promise.all([
      Promise.all(
        filed.map(async (race) => ({
          race,
          candidates: await loadPublicCandidates(input.ctx.repo, race.raceId),
        })),
      ),
      readIngestRefreshedAt(input.ctx.repo),
    ]);
    const linked = linkPersonFilings(presented.flatMap((group) => group.candidates));
    const byId = new Map(linked.map((row) => [row.candidateId, row]));
    const rendered = renderRoster({
      cycle,
      state,
      chamber,
      groups: presented.map((group) => ({
        race: group.race,
        candidates: group.candidates.map((row) => byId.get(row.candidateId) ?? row),
      })),
      root: input.ctx.root,
      refreshedAt,
    });
    if (input.request.zip) {
      rendered.answer_markdown = `ZIP ${input.request.zip} is in ${stateName(state)}.\n\n${rendered.answer_markdown}`;
    }
    return { ...rendered, refreshedAt };
  } catch (error) {
    if (isAbortError(error)) throw error;
    logReadError("listRacesByCycle", error);
    return { unavailable: true, message: "Stored records are unavailable." };
  }
}

function renderRoster(input: {
  cycle: number;
  state: string;
  chamber: "senate" | "house" | "president" | null;
  groups: ReadonlyArray<{ race: Race; candidates: readonly PublicCandidate[] }>;
  root: string;
  refreshedAt: string | null;
}): ChatAnswer {
  const name = stateName(input.state);
  const office = input.chamber === "senate" || input.chamber === "house" ? input.chamber : null;
  const people = input.groups.flatMap((group) =>
    group.candidates.map((candidate) => ({ race: group.race, candidate })),
  );
  if (people.length === 0) {
    const which = office === "senate" ? "Senate" : office === "house" ? "House" : "Senate or House";
    return {
      answer_markdown: `No ${which} Form 2 filings are stored for ${name} in ${input.cycle}. Filings so far are not a full ballot.`,
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  const shown = people.slice(0, NAME_CAP);
  const senate = shown.filter((row) => row.race.office === "senate");
  const house = shown.filter((row) => row.race.office === "house");
  const blocks = [`**${name}, ${input.cycle}.** FEC Form 2 filings so far, not a full ballot.`];
  if (office !== "house") blocks.push(senateBlock(senate));
  if (office !== "senate") blocks.push(houseBlock(house));
  const extra = people.length - shown.length;
  if (extra > 0) {
    blocks.push(
      `And ${extra} more filings are stored for ${name}. Open the state for the full list.`,
    );
  }
  const note = crossContestNote(people.map((row) => row.candidate));
  if (note) blocks.push(note);
  return {
    answer_markdown: blocks.join("\n\n"),
    sources: rosterSources(
      input.groups.filter((group) => group.candidates.length > 0).map((group) => group.race),
      input.root,
      input.refreshedAt,
    ),
    refused: false,
    mode: "factual",
  };
}

function senateBlock(rows: ReadonlyArray<{ race: Race; candidate: PublicCandidate }>): string {
  if (rows.length === 0) return "**U.S. Senate**\n\nNo Senate filing is stored.";
  return `**U.S. Senate**\n\n${rows.map((row) => personLine(row.candidate, row.race)).join("\n")}`;
}

function houseBlock(rows: ReadonlyArray<{ race: Race; candidate: PublicCandidate }>): string {
  if (rows.length === 0) return "**U.S. House**\n\nNo House filing is stored.";
  return `**U.S. House**\n\n${rows.map((row) => personLine(row.candidate, row.race)).join("\n")}`;
}

function personLine(candidate: PublicCandidate, race: Race): string {
  const party = candidate.writeIn
    ? "Write-in"
    : partyLabel(candidate.partyCode, candidate.partyLabel);
  const district = houseDistrictLabel(race);
  return district
    ? `- **${candidate.displayName}** — ${party} — ${district}`
    : `- **${candidate.displayName}** — ${party}`;
}

function houseDistrictLabel(race: Race): string | null {
  if (race.office !== "house") return null;
  if (race.district === "00") return "at-large";
  if (race.district && /^\d{2}$/.test(race.district)) return `District ${Number(race.district)}`;
  return null;
}

function crossContestNote(candidates: readonly PublicCandidate[]): string | null {
  const seen = new Set<string>();
  const notes: string[] = [];
  for (const candidate of candidates) {
    const key = personMatchKey(candidate.displayName);
    if (!key || seen.has(key)) continue;
    const contests = new Set(candidate.filings.map((filing) => filing.raceId));
    if (contests.size < 2) continue;
    seen.add(key);
    const ids = [
      ...new Set(candidate.filings.map((filing) => filing.fecId).filter((id): id is string => Boolean(id))),
    ];
    const idNote = ids.length > 1 ? ` FEC ids ${ids.join(" and ")}.` : "";
    const writeIn = candidate.writeIn ? " write-in" : "";
    notes.push(
      `**${candidate.displayName}** is one${writeIn} filer with statements in more than one contest, not a separate person each time.${idNote}`,
    );
  }
  return notes.length > 0 ? notes.join(" ") : null;
}

function rosterSources(
  races: readonly Race[],
  root: string,
  refreshedAt: string | null,
): ChatSource[] {
  const sources: ChatSource[] = [];
  const seen = new Set<string>();
  for (const race of races) {
    const url = `${root}/races/${encodeURIComponent(race.raceId)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: humanRaceTitle(race),
      url,
      as_of: pageRefreshAsOf(refreshedAt, race.updatedAt),
    });
    if (sources.length >= SOURCE_CAP) break;
  }
  return sources;
}

/**
 * Who-is-running when the page already sent a state, ZIP, race, or candidate.
 * Never asks which state.
 */
export async function answerKnownPlace(input: {
  request: ChatRequest;
  ctx: ToolContext;
}): Promise<ChatAnswer | { unavailable: true; message: string }> {
  let state = input.request.state ?? stateFromRaceId(input.request.raceId);
  if (!state && input.request.candidateId) {
    try {
      const candidate = await input.ctx.repo.getCandidate(input.request.candidateId);
      if (candidate) {
        const race = await loadVisibleRace(input.ctx.repo, candidate.raceId);
        state = race?.state ?? stateFromRaceId(candidate.raceId);
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      logReadError("getCandidate", error);
      return { unavailable: true, message: "Stored records are unavailable." };
    }
  }
  if (!state) {
    const zip = input.request.zip;
    return {
      answer_markdown: zip
        ? `ZIP ${zip} didn't match a House district, so I can't list filings for a state.`
        : "I already have this page. Name a race if you want the filings for one contest.",
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  return answerStateRoster({
    request: { ...input.request, state },
    ctx: input.ctx,
  });
}

function resolveCycle(request: ChatRequest, now: Date): number {
  if (request.cycle != null) return request.cycle;
  return cycleMentionedIn(request.message) ?? yearFromRaceId(request.raceId) ?? now.getUTCFullYear();
}

/**
 * Count and list for one page contest. One race read, no state-wide scan,
 * no model call. House districts stay off a Senate race.
 */
export async function answerScopedRace(input: {
  request: ChatRequest;
  ctx: ToolContext;
}): Promise<ChatAnswer | { unavailable: true; message: string }> {
  const raceId = input.request.raceId;
  if (!raceId) {
    return {
      answer_markdown: "Name a race and I can count the FEC Form 2 filings stored for it.",
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  const cycle =
    input.request.cycle ?? yearFromRaceId(raceId) ?? input.ctx.now.getUTCFullYear();
  try {
    const [race, listed, refreshedAt] = await Promise.all([
      loadVisibleRace(input.ctx.repo, raceId),
      loadPublicCandidates(input.ctx.repo, raceId),
      readIngestRefreshedAt(input.ctx.repo),
    ]);
    const candidates = race ? listed : [];
    return {
      ...renderScopedRace({
        race,
        cycle,
        candidates,
        root: input.ctx.root,
        message: input.request.message,
        refreshedAt,
      }),
      refreshedAt,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    logReadError("getRace", error);
    return { unavailable: true, message: "Stored records are unavailable." };
  }
}

function renderScopedRace(input: {
  race: Race | null;
  cycle: number;
  candidates: readonly PublicCandidate[];
  root: string;
  message: string;
  refreshedAt: string | null;
}): ChatAnswer {
  const title = input.race ? humanRaceTitle(input.race) : "this contest";
  const office = input.race?.office ?? chamberFromRaceId(input.race?.raceId);
  const note = otherContestNote(input.message, office, title, input.cycle);
  const list = isExplicitListQuestion(input.message);
  const shown = input.candidates.slice(0, NAME_CAP);
  const blocks = [
    note,
    countSentence(
      input.candidates.length,
      title,
      input.cycle,
      list ? null : countNameClause(input.candidates),
    ),
  ].filter((block): block is string => Boolean(block));
  if (list && shown.length > 0 && input.race) {
    blocks.push(shown.map((candidate) => personLine(candidate, input.race as Race)).join("\n"));
  }
  const extra = list ? input.candidates.length - shown.length : 0;
  if (extra > 0) blocks.push(`And ${extra} more filings are stored for this contest.`);
  blocks.push(FORM2_FILINGS_SENTENCE);
  return {
    answer_markdown: blocks.join("\n\n"),
    sources: input.race ? rosterSources([input.race], input.root, input.refreshedAt) : [],
    refused: false,
    mode: "factual",
  };
}

function countNameClause(candidates: readonly PublicCandidate[]): string | null {
  if (candidates.length === 0) return null;
  const names = candidates.slice(0, COUNT_NAME_CAP).map((candidate) => candidate.displayName);
  const extra = candidates.length - names.length;
  if (extra > 0) return `${names.join(", ")}, and ${extra} more`;
  if (names.length === 1) return names[0] ?? null;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function countSentence(
  count: number,
  title: string,
  cycle: number,
  names: string | null,
): string {
  if (count === 0) return `No FEC Form 2 filings are stored for **${title}** in ${cycle}.`;
  const who = names ? `: ${names}` : "";
  if (count === 1) {
    return `**1** candidate has an FEC Form 2 filing for **${title}** in ${cycle}${who}.`;
  }
  return `**${count}** candidates have FEC Form 2 filings for **${title}** in ${cycle}${who}.`;
}

function otherContestNote(
  message: string,
  office: Race["office"] | null,
  title: string,
  cycle: number,
): string | null {
  if (!office) return null;
  const asksHouse = office !== "house" && /\bhouse\b/i.test(message);
  const asksSenate = office !== "senate" && /\bsenate\b/i.test(message);
  const asksPresident = office !== "president" && /\bpresidents?\b/i.test(message);
  if (!asksHouse && !asksSenate && !asksPresident) return null;
  return `This page is **${title}** in ${cycle}. The count stays on that contest.`;
}
