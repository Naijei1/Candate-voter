import { cycleCalendar, leadSentences } from "../data/calendar";
import { logReadError } from "../data/read";
import { visibleRaces } from "../data/view";
import type { Race } from "../types";
import { isAbortError } from "./errors";
import { pageRefreshAsOf, readIngestRefreshedAt } from "./freshness";
import { chamberFromRaceId, cycleMentionedIn, isSingleContestScope, stateMentionedIn, yearFromRaceId } from "./intent";
import {
  ASK_PRESIDENTIAL_YEAR_SENTENCE,
  ASK_STATE_SENTENCE,
  FORM2_FILINGS_SENTENCE,
  humanRaceTitle,
  polishSources,
} from "./polish";
import type { ToolContext } from "./tools";
import type { ChatAnswer, ChatRequest, ChatSource } from "./types";

const LIST_CAP = 8;

/**
 * Calendar answer for "what elections are coming up".
 * A midterm cycle leads with Senate and House. A stored presidential race
 * in a non-presidential year is described as an out-of-cycle Form 2 filing.
 */
export async function answerUpcoming(input: {
  request: ChatRequest;
  ctx: ToolContext;
}): Promise<ChatAnswer | { unavailable: true; message: string }> {
  const cycle = resolveCycle(input.request, input.ctx.now);
  const state = input.request.state ?? stateMentionedIn(input.request.message);
  const office = isSingleContestScope(input.request)
    ? chamberFromRaceId(input.request.raceId)
    : null;
  try {
    const [stored, refreshedAt] = await Promise.all([
      input.ctx.repo.listRacesByCycle(cycle).then((races) => visibleRaces(races)),
      readIngestRefreshedAt(input.ctx.repo),
    ]);
    return {
      ...renderUpcoming({
        cycle,
        state,
        races: stored,
        root: input.ctx.root,
        office,
        refreshedAt,
      }),
      refreshedAt,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    logReadError("listRacesByCycle", error);
    return { unavailable: true, message: "Stored records are unavailable." };
  }
}

export function renderUpcoming(input: {
  cycle: number;
  state: string | null;
  races: readonly Race[];
  root: string;
  /** When the page is one contest, list only that chamber's stored filings. */
  office?: Race["office"] | null;
  refreshedAt?: string | null;
}): ChatAnswer {
  const calendar = cycleCalendar(input.cycle);
  const office = input.office ?? null;
  const senate = office === "house" || office === "president" ? [] : filterOffice(input.races, "senate", input.state);
  const house = office === "senate" || office === "president" ? [] : filterOffice(input.races, "house", input.state);
  const president =
    office === "senate" || office === "house"
      ? []
      : input.races.filter((race) => race.office === "president");
  const paragraphs: string[] = [lead(input.cycle), FORM2_FILINGS_SENTENCE];
  const mentioned: Race[] = [];

  if (input.state) {
    paragraphs.push(stateFilings(input.cycle, input.state, senate, house));
    mentioned.push(...senate.slice(0, LIST_CAP), ...house.slice(0, LIST_CAP));
  } else if (calendar.presidentialGeneralElection) {
    paragraphs.push(ASK_PRESIDENTIAL_YEAR_SENTENCE);
  } else {
    paragraphs.push(ASK_STATE_SENTENCE);
  }

  const presidential = president[0];
  if (presidential && !calendar.presidentialGeneralElection) {
    paragraphs.push(outOfCycleParagraph(presidential));
    mentioned.push(presidential);
  } else if (presidential && calendar.presidentialGeneralElection) {
    paragraphs.push(`**${humanRaceTitle(presidential)}** are stored for the presidential contest.`);
    mentioned.push(presidential);
  }

  const sources = polishSources(
    mentioned.flatMap((race) => sourcesForRace(race, input.root, input.refreshedAt ?? null)),
  ).slice(0, 8);
  return {
    answer_markdown: paragraphs.join("\n\n"),
    sources,
    refused: false,
    mode: "factual",
  };
}

function resolveCycle(request: ChatRequest, now: Date): number {
  if (request.cycle != null) return request.cycle;
  const mentioned = cycleMentionedIn(request.message);
  if (mentioned != null && !isSingleContestScope(request)) return mentioned;
  return yearFromRaceId(request.raceId) ?? mentioned ?? now.getUTCFullYear();
}

function lead(cycle: number): string {
  const [first, ...rest] = leadSentences(cycle);
  if (!first) return "";
  const bold = `**${first.slice(0, -1)}.**`;
  return [bold, ...rest].join(" ");
}

function stateFilings(
  cycle: number,
  state: string,
  senate: readonly Race[],
  house: readonly Race[],
): string {
  if (senate.length === 0 && house.length === 0) {
    return `No Senate or House Form 2 filings are stored for ${state} in ${cycle}.`;
  }
  const lines = [`**Stored Form 2 filings for ${state} in ${cycle}:**`];
  if (senate.length > 0) {
    lines.push("", "Senate:", "", ...bulletRaces(senate));
  }
  if (house.length > 0) {
    lines.push("", "House:", "", ...bulletRaces(house));
  }
  return lines.join("\n");
}

function bulletRaces(races: readonly Race[]): string[] {
  const shown = races.slice(0, LIST_CAP).map((race) => `- ${humanRaceTitle(race)}`);
  const extra = races.length - shown.length;
  if (extra > 0) shown.push(`- ${extra} more House or Senate race${extra === 1 ? "" : "s"} are stored.`);
  return shown;
}

function outOfCycleParagraph(race: Race): string {
  return `**${humanRaceTitle(race)}** are stored as an early or out-of-cycle Form 2 filing, not the general election.`;
}

function filterOffice(races: readonly Race[], office: Race["office"], state: string | null): Race[] {
  return races
    .filter((race) => race.office === office && (!state || race.state === state))
    .sort((a, b) => a.raceId.localeCompare(b.raceId));
}

function sourcesForRace(race: Race, root: string, refreshedAt: string | null): ChatSource[] {
  const asOf = pageRefreshAsOf(refreshedAt, race.updatedAt);
  const title = humanRaceTitle(race);
  const sources: ChatSource[] = [
    {
      title,
      url: `${root}/races/${encodeURIComponent(race.raceId)}`,
      as_of: asOf,
    },
  ];
  if (race.sourceUrl && /^https:\/\//i.test(race.sourceUrl)) {
    sources.push({ title, url: race.sourceUrl, as_of: asOf });
  }
  return sources;
}
