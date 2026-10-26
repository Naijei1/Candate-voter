import type { ApiRepository } from "../api/deps";
import { contestAnnotation, cycleCalendar, upcomingRaceRank } from "../data/calendar";
import { FORM2_SCOPE, FORM2_SCOPE_NOTE, houseCoverageForRaces } from "../data/coverage";
import { cyclesFromEnv, parseCycle } from "../data/cycles";
import { isPostalState } from "../data/states";
import { logReadError, sortFilings } from "../data/read";
import {
  loadPublicCandidates,
  loadVisibleRace,
  presentCandidate,
  visibleRaces,
  type PublicCandidate,
} from "../data/view";
import type { Filing, Race } from "../types";
import { isResourceId } from "../api/ids";
import { canonicalUrl, humanRaceTitle } from "./polish";
import type { ChatSource } from "./types";

const LIST_DEFAULT = 20;
const LIST_MAX = 40;
const SEARCH_DEFAULT = 10;
const SEARCH_MAX = 15;
const MAX_RACES_SCANNED = 40;
const MAX_SOURCES = 8;

export type ToolContext = {
  repo: ApiRepository;
  env: Record<string, string | undefined>;
  now: Date;
  /** Origin plus base path, no trailing slash. */
  root: string;
};

export type ToolOutput =
  | {
      ok: true;
      records: number;
      sources: ChatSource[];
      snippets: string[];
      content: Record<string, unknown>;
    }
  | { ok: false; unavailable: boolean; message: string };

type ToolSpec = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutput>;
};

const officeSchema = {
  type: "string",
  enum: ["president", "senate", "house"],
};

const tools: readonly ToolSpec[] = [
  {
    name: "list_races",
    description:
      "List stored federal races. Pass a state, or office president. Do not call this without a state to list every Senate or House race. This is not a ranking. Omit cycle to use the public index year window. The result includes house coverage (districts with Form 2 filings out of apportioned districts) and cycleCalendar. A presidential race in a year that is not divisible by 4 has ballotRole out-of-cycle-presidential-filing. That is an early or out-of-cycle Form 2 filing, not a general election. Midterm onBallot is senate and house.",
    inputSchema: {
      type: "object",
      properties: {
        cycle: { type: "integer", description: "Election year on the filing." },
        state: { type: "string", description: "Two-letter postal code." },
        office: officeSchema,
        limit: { type: "integer", description: "Max races to return. Default 20, max 40." },
      },
    },
    run: listRaces,
  },
  {
    name: "get_race",
    description:
      "Get one stored race and its candidates by raceId, for example 2026-senate-CA or 2028-president. Candidates are alphabetical by display name. The same normalized name on this race is one row; multiFilingNote lists the other FEC ids and parties. Read ballotRole before calling a presidential race a general election.",
    inputSchema: {
      type: "object",
      properties: {
        raceId: { type: "string" },
      },
      required: ["raceId"],
    },
    run: getRace,
  },
  {
    name: "search_candidates",
    description:
      "Find stored candidates by a case-insensitive substring of display name, filed name, or candidate id. Not a ranking and not a full-text search of filings.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        cycle: { type: "integer" },
        state: { type: "string" },
        office: officeSchema,
        limit: { type: "integer" },
      },
      required: ["query"],
    },
    run: searchCandidates,
  },
  {
    name: "get_candidate",
    description: "Get one stored candidate and the race named on that row.",
    inputSchema: {
      type: "object",
      properties: {
        candidateId: { type: "string" },
      },
      required: ["candidateId"],
    },
    run: getCandidate,
  },
  {
    name: "list_filings",
    description:
      "List stored FEC Form 2 filings for one candidate, newest FEC load timestamp first. The order is chronology, not a ranking.",
    inputSchema: {
      type: "object",
      properties: {
        candidateId: { type: "string" },
      },
      required: ["candidateId"],
    },
    run: listFilings,
  },
  {
    name: "get_coverage",
    description:
      "How many House districts in a cycle have at least one stored FEC Form 2 filing, out of the apportioned district count. filingsSoFarOnly is always true: this is not a full ballot. Pass state to limit to one state. Omit state for the 50-state total plus each state that has a filing.",
    inputSchema: {
      type: "object",
      properties: {
        cycle: { type: "integer", description: "Election year. Omit to use the public index year window." },
        state: { type: "string", description: "Two-letter postal code. Omit for the national House total." },
      },
    },
    run: getCoverage,
  },
  {
    name: "get_freshness",
    description:
      "Read the fec-efile-form2 ingest watermark: lastLoadTimestamp, lastRunAt, lastStatus, updatedAt, and refreshedAt. watermark is null until a run has stored one. Scope is electronic Form 2 filings only.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    run: getFreshness,
  },
];

export const CHAT_TOOL_SPECS = tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
}));

export async function executeChatTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const tool = tools.find((item) => item.name === name);
  if (!tool) {
    return { ok: false, unavailable: false, message: `Unknown tool ${name}` };
  }
  const record = asRecord(input);
  if (!record) {
    return { ok: false, unavailable: false, message: "Tool input must be an object" };
  }
  return tool.run(record, ctx);
}

async function listRaces(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const cycle = readCycle(input.cycle);
  if (!cycle.ok) return toolError(cycle.message);
  const state = readState(input.state);
  if (!state.ok) return toolError(state.message);
  const office = readOffice(input.office);
  if (!office.ok) return toolError(office.message);
  const limit = readLimit(input.limit, LIST_DEFAULT, LIST_MAX);
  if (!limit.ok) return toolError(limit.message);

  if (!state.value && office.value !== "president") {
    return toolError(
      "Pass a state, or set office to president. Do not list Senate or House races for every state.",
    );
  }
  const cycles = cycle.value != null ? [cycle.value] : cyclesFromEnv(ctx.env, ctx.now);
  try {
    const groups = await Promise.all(
      cycles.map((year) => ctx.repo.listRacesByCycle(year)),
    );
    const visible = visibleRaces(groups.flat());
    const races = visible
      .filter((race) => {
        if (state.value && race.state !== state.value) return false;
        if (office.value && race.office !== office.value) return false;
        return true;
      })
      .sort((a, b) => upcomingRaceRank(a) - upcomingRaceRank(b) || a.raceId.localeCompare(b.raceId))
      .slice(0, limit.value)
      .map(chatRace);
    const sources = races.flatMap((race) => sourcesForRace(race, ctx.root));
    return ok(races.length, sources, races.map(raceSnippet), {
      cycles,
      cycleCalendar: cycles.map(cycleCalendar),
      races,
      coverage: {
        scope: FORM2_SCOPE,
        filingsSoFarOnly: true,
        scopeNote: FORM2_SCOPE_NOTE,
        house: houseCoverageForRaces(visible, cycles, state.value),
      },
      sources: sources.slice(0, MAX_SOURCES),
    });
  } catch (error) {
    return unavailable("listRacesByCycle", error);
  }
}

async function getRace(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const raceId = readId(input.raceId, "raceId");
  if (!raceId.ok) return toolError(raceId.message);
  try {
    const race = await loadVisibleRace(ctx.repo, raceId.value);
    if (!race) {
      return ok(0, [], [], { race: null, candidates: [], sources: [] });
    }
    const candidates = await loadPublicCandidates(ctx.repo, race.raceId);
    const annotated = chatRace(race);
    const sources = [
      ...sourcesForRace(annotated, ctx.root),
      ...candidates.flatMap((candidate) => sourcesForCandidate(candidate, ctx.root)),
    ];
    return ok(
      1 + candidates.length,
      sources,
      [raceSnippet(annotated), ...candidates.map(candidateSnippet)],
      { race: annotated, candidates, sources: sources.slice(0, MAX_SOURCES) },
    );
  } catch (error) {
    return unavailable("getRace", error);
  }
}

async function searchCandidates(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (query.length < 2 || query.length > 80) {
    return toolError("query must be a string from 2 to 80 characters");
  }
  const cycle = readCycle(input.cycle);
  if (!cycle.ok) return toolError(cycle.message);
  const state = readState(input.state);
  if (!state.ok) return toolError(state.message);
  const office = readOffice(input.office);
  if (!office.ok) return toolError(office.message);
  const limit = readLimit(input.limit, SEARCH_DEFAULT, SEARCH_MAX);
  if (!limit.ok) return toolError(limit.message);

  const needle = query.toLowerCase();
  try {
    if (isResourceId(query)) {
      const stored = await ctx.repo.getCandidate(query);
      const direct = stored ? presentCandidate(stored) : null;
      if (direct && matchesCandidate(direct, needle)) {
        const race = await loadVisibleRace(ctx.repo, direct.raceId);
        const sources = sourcesForCandidate(direct, ctx.root);
        return ok(1, sources, [candidateSnippet(direct)], {
          matches: [{ candidate: direct, race: race ? chatRace(race) : null }],
          scannedRaces: 0,
          truncated: false,
          sources,
        });
      }
    }

    const cycles = cycle.value != null ? [cycle.value] : cyclesFromEnv(ctx.env, ctx.now);
    const matches: Array<{ candidate: PublicCandidate; race: Race | null }> = [];
    let scanned = 0;
    let truncated = false;
    for (const year of cycles) {
      const races = visibleRaces(await ctx.repo.listRacesByCycle(year));
      for (const race of races) {
        if (state.value && race.state !== state.value) continue;
        if (office.value && race.office !== office.value) continue;
        if (scanned >= MAX_RACES_SCANNED) {
          truncated = true;
          break;
        }
        scanned += 1;
        const candidates = await loadPublicCandidates(ctx.repo, race.raceId);
        for (const candidate of candidates) {
          if (!matchesCandidate(candidate, needle)) continue;
          matches.push({ candidate, race: chatRace(race) });
          if (matches.length >= limit.value) break;
        }
        if (matches.length >= limit.value) break;
      }
      if (truncated || matches.length >= limit.value) break;
    }
    const sources = matches.flatMap((match) =>
      sourcesForCandidate(match.candidate, ctx.root),
    );
    return ok(
      matches.length,
      sources,
      matches.map((match) => candidateSnippet(match.candidate)),
      {
        matches,
        scannedRaces: scanned,
        truncated,
        sources: sources.slice(0, MAX_SOURCES),
      },
    );
  } catch (error) {
    return unavailable("searchCandidates", error);
  }
}

async function getCandidate(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const candidateId = readId(input.candidateId, "candidateId");
  if (!candidateId.ok) return toolError(candidateId.message);
  try {
    const stored = await ctx.repo.getCandidate(candidateId.value);
    const candidate = stored ? presentCandidate(stored) : null;
    if (!candidate) {
      return ok(0, [], [], { candidate: null, race: null, sources: [] });
    }
    const race = await loadVisibleRace(ctx.repo, candidate.raceId);
    const sources = [
      ...sourcesForCandidate(candidate, ctx.root),
      ...(race ? sourcesForRace(race, ctx.root) : []),
    ];
    return ok(1, sources, [candidateSnippet(candidate)], {
      candidate,
      race: race ? chatRace(race) : null,
      sources: sources.slice(0, MAX_SOURCES),
    });
  } catch (error) {
    return unavailable("getCandidate", error);
  }
}

async function listFilings(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const candidateId = readId(input.candidateId, "candidateId");
  if (!candidateId.ok) return toolError(candidateId.message);
  try {
    const stored = await ctx.repo.getCandidate(candidateId.value);
    const candidate = stored ? presentCandidate(stored) : null;
    if (!candidate) {
      return ok(0, [], [], { candidate: null, filings: [], sources: [] });
    }
    const filings = sortFilings(
      await ctx.repo.listFilingsForCandidate(candidateId.value),
    );
    const sources = [
      ...sourcesForCandidate(candidate, ctx.root),
      ...filings.flatMap((filing) =>
        sourcesForFiling(filing, candidate.displayName, ctx.root),
      ),
    ];
    return ok(
      1 + filings.length,
      sources,
      [
        candidateSnippet(candidate),
        ...filings.map((filing) => filingSnippet(filing, candidate.displayName)),
      ],
      { candidate, filings, sources: sources.slice(0, MAX_SOURCES) },
    );
  } catch (error) {
    return unavailable("listFilingsForCandidate", error);
  }
}

async function getFreshness(
  _input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  try {
    const watermark = await ctx.repo.getWatermark();
    if (!watermark) {
      return ok(0, [], [], {
        watermark: null,
        scope: FORM2_SCOPE,
        filingsSoFarOnly: true,
        scopeNote: FORM2_SCOPE_NOTE,
        refreshedAt: null,
        sources: [],
      });
    }
    const sources: ChatSource[] = [
      {
        title: "Candate Form 2 ingest watermark",
        url: `${ctx.root}/agent`,
        as_of: watermark.updatedAt,
      },
    ];
    return ok(1, sources, [`Ingest watermark ${watermark.lastStatus}`], {
      watermark,
      scope: FORM2_SCOPE,
      filingsSoFarOnly: true,
      scopeNote: FORM2_SCOPE_NOTE,
      refreshedAt: watermark.updatedAt,
      sources,
    });
  } catch (error) {
    return unavailable("getWatermark", error);
  }
}

function ok(
  records: number,
  sources: ChatSource[],
  snippets: string[],
  content: Record<string, unknown>,
): ToolOutput {
  return {
    ok: true,
    records,
    sources: dedupeSources(sources).slice(0, MAX_SOURCES),
    snippets,
    content,
  };
}

function toolError(message: string): ToolOutput {
  return { ok: false, unavailable: false, message };
}

function unavailable(operation: string, error: unknown): ToolOutput {
  logReadError(operation, error);
  return {
    ok: false,
    unavailable: true,
    message: "Stored records are unavailable.",
  };
}

async function getCoverage(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutput> {
  const cycle = readCycle(input.cycle);
  if (!cycle.ok) return toolError(cycle.message);
  const state = readState(input.state);
  if (!state.ok) return toolError(state.message);
  const cycles = cycle.value != null ? [cycle.value] : cyclesFromEnv(ctx.env, ctx.now);
  try {
    const groups = await Promise.all(
      cycles.map((year) => ctx.repo.listRacesByCycle(year)),
    );
    const visible = visibleRaces(groups.flat());
    const watermark = await ctx.repo.getWatermark();
    const house = houseCoverageForRaces(visible, cycles, state.value);
    const sources: ChatSource[] = watermark
      ? [
          {
            title: "Candate Form 2 ingest watermark",
            url: `${ctx.root}/agent`,
            as_of: watermark.updatedAt,
          },
        ]
      : [];
    return ok(house.length, sources, house.map(coverageSnippet), {
      scope: FORM2_SCOPE,
      filingsSoFarOnly: true,
      scopeNote: FORM2_SCOPE_NOTE,
      refreshedAt: watermark?.updatedAt ?? null,
      house,
      sources,
    });
  } catch (error) {
    return unavailable("getCoverage", error);
  }
}

function coverageSnippet(row: {
  cycle: number;
  state: string | null;
  districtsWithFilings: number;
  districtsTotal: number;
}): string {
  const where = row.state ?? "the 50 states";
  return `${row.cycle} House, ${where}: ${row.districtsWithFilings} of ${row.districtsTotal} districts have Form 2 filings`;
}

function sourcesForRace(race: Race, root: string): ChatSource[] {
  const title = humanRaceTitle(race);
  const sources = [
    pageSource(title, `${root}/races/${encodeURIComponent(race.raceId)}`, race.updatedAt),
  ];
  const fec = externalSource(title, race.sourceUrl, race.updatedAt);
  if (fec) sources.push(fec);
  return sources;
}

function sourcesForCandidate(
  candidate: Pick<
    PublicCandidate,
    | "displayName"
    | "candidateId"
    | "updatedAt"
    | "sourceLoadedAt"
    | "sourceUrl"
    | "alternateFilings"
  >,
  root: string,
): ChatSource[] {
  const sources = [
    pageSource(
      candidate.displayName,
      `${root}/candidates/${encodeURIComponent(candidate.candidateId)}`,
      candidate.updatedAt ?? candidate.sourceLoadedAt,
    ),
  ];
  const fec = externalSource(
    candidate.displayName,
    candidate.sourceUrl,
    candidate.updatedAt ?? candidate.sourceLoadedAt,
  );
  if (fec) sources.push(fec);
  for (const alternate of candidate.alternateFilings ?? []) {
    const id = alternate.fecCandidateId ?? alternate.candidateId;
    const extra = externalSource(
      `${candidate.displayName} (${id})`,
      alternate.sourceUrl,
      candidate.updatedAt ?? candidate.sourceLoadedAt,
    );
    if (extra) sources.push(extra);
  }
  return sources;
}

function sourcesForFiling(filing: Filing, displayName: string, root: string): ChatSource[] {
  const asOf = filing.retrievedAt ?? filing.updatedAt ?? filing.fecLoadTimestamp;
  const title = `FEC Form 2 — ${displayName.trim() || "Candidate"}`;
  const fec = externalSource(title, filing.sourceUrl, asOf);
  if (fec) return [fec];
  return [
    pageSource(
      title,
      `${root}/candidates/${encodeURIComponent(filing.candidateId)}`,
      asOf,
    ),
  ];
}

function pageSource(title: string, url: string, asOf: string | null): ChatSource {
  return {
    title: title.trim() || "Candate record",
    url,
    as_of: asOf?.trim() || "unknown",
  };
}

function externalSource(
  title: string,
  url: string | null,
  asOf: string | null,
): ChatSource | null {
  if (!url || !/^https:\/\//i.test(url)) return null;
  return pageSource(title, url, asOf);
}

function dedupeSources(sources: readonly ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  const unique: ChatSource[] = [];
  for (const source of sources) {
    const key = canonicalUrl(source.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
  }
  return unique;
}

function chatRace(race: Race): Race & ReturnType<typeof contestAnnotation> {
  return { ...race, ...contestAnnotation(race) };
}

function raceSnippet(race: Race): string {
  return humanRaceTitle(race);
}

function candidateSnippet(candidate: PublicCandidate): string {
  const party = candidate.partyCode
    ? `${candidate.partyLabel} (${candidate.partyCode})`
    : candidate.partyLabel;
  const note = candidate.multiFilingNote ? ` ${candidate.multiFilingNote}` : "";
  return `${candidate.displayName} — ${party} (\`${candidate.candidateId}\`).${note}`;
}

function filingSnippet(_filing: Filing, displayName: string): string {
  return `FEC Form 2 — ${displayName.trim() || "Candidate"}`;
}

function matchesCandidate(candidate: PublicCandidate, needle: string): boolean {
  const haystack = [
    candidate.displayName,
    candidate.nameAsFiled ?? "",
    candidate.candidateId,
    candidate.fecCandidateId ?? "",
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readId(
  value: unknown,
  key: string,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !isResourceId(value)) {
    return { ok: false, message: `${key} is invalid` };
  }
  return { ok: true, value };
}

function readCycle(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, message: "cycle must be an integer from 1980 to 2100" };
  }
  const parsed = parseCycle(String(value));
  if (parsed == null) {
    return { ok: false, message: "cycle must be an integer from 1980 to 2100" };
  }
  return { ok: true, value: parsed };
}

function readState(
  value: unknown,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string" || !isPostalState(value.trim().toUpperCase())) {
    return { ok: false, message: "state must be a two-letter postal code" };
  }
  return { ok: true, value: value.trim().toUpperCase() };
}

function readOffice(
  value: unknown,
): { ok: true; value: Race["office"] | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null };
  if (value === "president" || value === "senate" || value === "house") {
    return { ok: true, value };
  }
  return { ok: false, message: "office must be president, senate, or house" };
}

function readLimit(
  value: unknown,
  fallback: number,
  max: number,
): { ok: true; value: number } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: fallback };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > max) {
    return { ok: false, message: `limit must be an integer from 1 to ${max}` };
  }
  return { ok: true, value };
}
