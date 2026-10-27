import { raceMatchesCycle } from "../data/cycle-match";
import { logReadError } from "../data/read";
import { personMatchKey } from "../data/dedupe";
import { linkPersonFilings } from "../data/person-filings";
import { stateName } from "../data/states";
import { loadPublicCandidates, loadVisibleRace, visibleRaces, type PublicCandidate } from "../data/view";
import { partyLabel } from "../format";
import type { Race } from "../types";
import { cycleMentionedIn, stateFromRaceId, stateMentionedIn } from "./intent";
import { humanRaceTitle } from "./polish";
import type { ToolContext } from "./tools";
import type { ChatAnswer, ChatRequest, ChatSource } from "./types";

const NAME_CAP = 24;
const SOURCE_CAP = 8;

const ROSTER = /\b(?:compare|all|every|list|who|candidates|running|filed)\b/i;

/**
 * One state, both chambers. Answer from stored rows instead of a tool loop
 * that calls get_race once per district.
 */
export function isStateRosterQuestion(message: string, state?: string | null): boolean {
  if (!state && !stateMentionedIn(message)) return false;
  if (!/\bhouse\b/i.test(message) || !/\bsenate\b/i.test(message)) return false;
  return ROSTER.test(message);
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
  try {
    const stored = visibleRaces(await input.ctx.repo.listRacesByCycle(cycle)).filter((race) =>
      raceMatchesCycle(race, cycle),
    );
    const filed = stored.filter(
      (race) =>
        race.state === state &&
        race.empty !== true &&
        (race.office === "senate" || race.office === "house"),
    );
    const presented = await Promise.all(
      filed.map(async (race) => ({
        race,
        candidates: await loadPublicCandidates(input.ctx.repo, race.raceId),
      })),
    );
    const linked = linkPersonFilings(presented.flatMap((group) => group.candidates));
    const byId = new Map(linked.map((row) => [row.candidateId, row]));
    let refreshedAt: string | null = null;
    try {
      refreshedAt = (await input.ctx.repo.getWatermark())?.updatedAt ?? null;
    } catch (error) {
      logReadError("getWatermark", error);
    }
    const rendered = renderRoster({
      cycle,
      state,
      groups: presented.map((group) => ({
        race: group.race,
        candidates: group.candidates.map((row) => byId.get(row.candidateId) ?? row),
      })),
      root: input.ctx.root,
    });
    if (input.request.zip) {
      rendered.answer_markdown = `ZIP ${input.request.zip} is in ${stateName(state)}.\n\n${rendered.answer_markdown}`;
    }
    return { ...rendered, refreshedAt };
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return { unavailable: true, message: "Stored records are unavailable." };
  }
}

function renderRoster(input: {
  cycle: number;
  state: string;
  groups: ReadonlyArray<{ race: Race; candidates: readonly PublicCandidate[] }>;
  root: string;
}): ChatAnswer {
  const name = stateName(input.state);
  const people = input.groups.flatMap((group) =>
    group.candidates.map((candidate) => ({ race: group.race, candidate })),
  );
  if (people.length === 0) {
    return {
      answer_markdown: `No Senate or House Form 2 filings are stored for ${name} in ${input.cycle}. Filings so far are not a full ballot.`,
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  const shown = people.slice(0, NAME_CAP);
  const senate = shown.filter((row) => row.race.office === "senate");
  const house = shown.filter((row) => row.race.office === "house");
  const blocks = [
    `**${name}, ${input.cycle}.** FEC Form 2 filings so far, not a full ballot.`,
    senateBlock(senate),
    houseBlock(house),
  ];
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

function rosterSources(races: readonly Race[], root: string): ChatSource[] {
  const sources: ChatSource[] = [];
  const seen = new Set<string>();
  for (const race of races) {
    const url = `${root}/races/${encodeURIComponent(race.raceId)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: humanRaceTitle(race),
      url,
      as_of: race.updatedAt?.trim() || "unknown",
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
  return cycleMentionedIn(request.message) ?? now.getUTCFullYear();
}
