import {
  cycleCalendar,
  isMidtermCycle,
  isPresidentialElectionYear,
  presidentialContestNote,
} from "../data/calendar";
import { logReadError } from "../data/read";
import { visibleRaces } from "../data/view";
import type { Race } from "../types";
import { cycleMentionedIn, stateMentionedIn } from "./intent";
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
  const state = stateMentionedIn(input.request.message);
  try {
    const stored = visibleRaces(await input.ctx.repo.listRacesByCycle(cycle));
    return renderUpcoming({
      cycle,
      state,
      races: stored,
      root: input.ctx.root,
    });
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return { unavailable: true, message: "Stored records are unavailable." };
  }
}

export function renderUpcoming(input: {
  cycle: number;
  state: string | null;
  races: readonly Race[];
  root: string;
}): ChatAnswer {
  const calendar = cycleCalendar(input.cycle);
  const senate = filterOffice(input.races, "senate", input.state);
  const house = filterOffice(input.races, "house", input.state);
  const president = input.races.filter((race) => race.office === "president");
  const paragraphs: string[] = [lead(input.cycle)];
  paragraphs.push(
    "Stored records are FEC Form 2 filings so far, not a full ballot.",
  );

  if (input.state) {
    paragraphs.push(stateFilings(input.cycle, input.state, senate, house));
  } else if (calendar.presidentialGeneralElection) {
    paragraphs.push(
      "Ask for a state to list Senate and House filings. In a presidential year, one national presidential contest is the presidential race when Form 2 filings are stored.",
    );
  } else {
    paragraphs.push("Ask for a state to list the stored Senate and House filings.");
  }

  const cited: Race[] = [];
  if (calendar.presidentialGeneralElection) {
    cited.push(...president, ...senate.slice(0, LIST_CAP), ...house.slice(0, LIST_CAP));
  } else {
    cited.push(...senate.slice(0, LIST_CAP), ...house.slice(0, LIST_CAP));
  }

  if (president.length > 0 && !calendar.presidentialGeneralElection) {
    const race = president[0];
    if (race) {
      paragraphs.push(outOfCycleParagraph(input.cycle, race));
      cited.push(race);
    }
  } else if (president.length > 0 && calendar.presidentialGeneralElection) {
    const race = president[0];
    if (race) {
      paragraphs.push(`Presidential filings for ${input.cycle} are stored as \`${race.raceId}\`.`);
    }
  }

  const sources = cited.flatMap((race) => sourcesForRace(race, input.root)).slice(0, 8);
  return {
    answer_markdown: paragraphs.join("\n\n"),
    sources: dedupeSources(sources),
    refused: false,
    mode: "factual",
  };
}

function resolveCycle(request: ChatRequest, now: Date): number {
  if (request.cycle != null) return request.cycle;
  const mentioned = cycleMentionedIn(request.message);
  if (mentioned != null) return mentioned;
  const fromRace = /^(\d{4})-/.exec(request.raceId ?? "");
  if (fromRace?.[1]) {
    const parsed = Number(fromRace[1]);
    if (Number.isInteger(parsed)) return parsed;
  }
  return now.getUTCFullYear();
}

function lead(cycle: number): string {
  if (isMidtermCycle(cycle)) {
    return `**${cycle} is a midterm year.** Federal contests on the ballot are U.S. Senate and U.S. House. There is no presidential general election.`;
  }
  if (!isPresidentialElectionYear(cycle)) {
    return `**${cycle} is not a presidential election year.** There is no presidential general election. Federal contests that can appear are U.S. Senate and U.S. House, including special elections when a filing uses this year.`;
  }
  return `**${cycle} is a presidential election year.** Federal contests on the ballot are President, U.S. Senate, and U.S. House.`;
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
  const shown = races.slice(0, LIST_CAP).map((race) => `- ${race.title} (\`${race.raceId}\`)`);
  const extra = races.length - shown.length;
  if (extra > 0) shown.push(`- ${extra} more House or Senate race${extra === 1 ? "" : "s"} are stored.`);
  return shown;
}

function outOfCycleParagraph(cycle: number, race: Race): string {
  const note = presidentialContestNote(cycle);
  return `A stored race \`${race.raceId}\` (${race.title}) is an early or out-of-cycle presidential Form 2 filing. ${note ?? "It is not the general election."}`;
}

function filterOffice(races: readonly Race[], office: Race["office"], state: string | null): Race[] {
  return races
    .filter((race) => race.office === office && (!state || race.state === state))
    .sort((a, b) => a.raceId.localeCompare(b.raceId));
}

function sourcesForRace(race: Race, root: string): ChatSource[] {
  const asOf = race.updatedAt?.trim() || "unknown";
  const sources: ChatSource[] = [
    {
      title: race.title.trim() || "Candate record",
      url: `${root}/races/${encodeURIComponent(race.raceId)}`,
      as_of: asOf,
    },
  ];
  if (race.sourceUrl && /^https:\/\//i.test(race.sourceUrl)) {
    sources.push({ title: race.title.trim() || "FEC source", url: race.sourceUrl, as_of: asOf });
  }
  return sources;
}

function dedupeSources(sources: readonly ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  const unique: ChatSource[] = [];
  for (const source of sources) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    unique.push(source);
  }
  return unique;
}
