import type { ApiRepository } from "../api/deps";
import { cyclesFromEnv, parseCycle } from "../data/cycles";
import { isPostalState } from "../data/states";
import { logReadError, sortCandidates, sortFilings } from "../data/read";
import type { Candidate, Filing, Race } from "../types";
import { isResourceId } from "../api/ids";
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
      "List stored federal races. Filter with cycle, state, and office. This is not a ranking. Omit cycle to use the public index year window.",
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
      "Get one stored race and its candidates by raceId, for example 2026-senate-CA or 2028-president. Candidates are alphabetical by display name.",
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
    name: "get_freshness",
    description:
      "Read the fec-efile-form2 ingest watermark: lastLoadTimestamp, lastRunAt, lastStatus, and updatedAt. watermark is null until a run has stored one.",
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

  const cycles = cycle.value != null ? [cycle.value] : cyclesFromEnv(ctx.env, ctx.now);
  try {
    const groups = await Promise.all(
      cycles.map((year) => ctx.repo.listRacesByCycle(year)),
    );
    const races = groups
      .flat()
      .filter((race) => {
        if (state.value && race.state !== state.value) return false;
        if (office.value && race.office !== office.value) return false;
        return true;
      })
      .sort((a, b) => a.raceId.localeCompare(b.raceId))
      .slice(0, limit.value);
    const sources = races.flatMap((race) => sourcesForRace(race, ctx.root));
    return ok(races.length, sources, races.map(raceSnippet), {
      cycles,
      races,
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
    const race = await ctx.repo.getRace(raceId.value);
    if (!race) {
      return ok(0, [], [], { race: null, candidates: [], sources: [] });
    }
    const candidates = sortCandidates(
      await ctx.repo.listCandidatesForRace(raceId.value),
    );
    const sources = [
      ...sourcesForRace(race, ctx.root),
      ...candidates.flatMap((candidate) => sourcesForCandidate(candidate, ctx.root)),
    ];
    return ok(
      1 + candidates.length,
      sources,
      [raceSnippet(race), ...candidates.map(candidateSnippet)],
      { race, candidates, sources: sources.slice(0, MAX_SOURCES) },
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
      const direct = await ctx.repo.getCandidate(query);
      if (direct && matchesCandidate(direct, needle)) {
        const race = await ctx.repo.getRace(direct.raceId);
        const sources = sourcesForCandidate(direct, ctx.root);
        return ok(1, sources, [candidateSnippet(direct)], {
          matches: [{ candidate: direct, race }],
          scannedRaces: 0,
          truncated: false,
          sources,
        });
      }
    }

    const cycles = cycle.value != null ? [cycle.value] : cyclesFromEnv(ctx.env, ctx.now);
    const matches: Array<{ candidate: Candidate; race: Race | null }> = [];
    let scanned = 0;
    let truncated = false;
    for (const year of cycles) {
      const races = await ctx.repo.listRacesByCycle(year);
      for (const race of races) {
        if (state.value && race.state !== state.value) continue;
        if (office.value && race.office !== office.value) continue;
        if (scanned >= MAX_RACES_SCANNED) {
          truncated = true;
          break;
        }
        scanned += 1;
        const candidates = await ctx.repo.listCandidatesForRace(race.raceId);
        for (const candidate of candidates) {
          if (!matchesCandidate(candidate, needle)) continue;
          matches.push({ candidate, race });
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
    const candidate = await ctx.repo.getCandidate(candidateId.value);
    if (!candidate) {
      return ok(0, [], [], { candidate: null, race: null, sources: [] });
    }
    const race = await ctx.repo.getRace(candidate.raceId);
    const sources = [
      ...sourcesForCandidate(candidate, ctx.root),
      ...(race ? sourcesForRace(race, ctx.root) : []),
    ];
    return ok(1, sources, [candidateSnippet(candidate)], {
      candidate,
      race,
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
    const candidate = await ctx.repo.getCandidate(candidateId.value);
    if (!candidate) {
      return ok(0, [], [], { candidate: null, filings: [], sources: [] });
    }
    const filings = sortFilings(
      await ctx.repo.listFilingsForCandidate(candidateId.value),
    );
    const sources = [
      ...sourcesForCandidate(candidate, ctx.root),
      ...filings.flatMap((filing) => sourcesForFiling(filing, ctx.root)),
    ];
    return ok(
      1 + filings.length,
      sources,
      [candidateSnippet(candidate), ...filings.map(filingSnippet)],
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
      return ok(0, [], [], { watermark: null, sources: [] });
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

function sourcesForRace(race: Race, root: string): ChatSource[] {
  const sources = [
    pageSource(race.title, `${root}/races/${encodeURIComponent(race.raceId)}`, race.updatedAt),
  ];
  const fec = externalSource(race.title, race.sourceUrl, race.updatedAt);
  if (fec) sources.push(fec);
  return sources;
}

function sourcesForCandidate(candidate: Candidate, root: string): ChatSource[] {
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
  return sources;
}

function sourcesForFiling(filing: Filing, root: string): ChatSource[] {
  const asOf = filing.retrievedAt ?? filing.updatedAt ?? filing.fecLoadTimestamp;
  const fec = externalSource(`Form 2 ${filing.filingId}`, filing.sourceUrl, asOf);
  if (fec) return [fec];
  return [
    pageSource(
      `Form 2 ${filing.filingId}`,
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
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    unique.push(source);
  }
  return unique;
}

function raceSnippet(race: Race): string {
  return `${race.title} (\`${race.raceId}\`)`;
}

function candidateSnippet(candidate: Candidate): string {
  return `${candidate.displayName} (\`${candidate.candidateId}\`)`;
}

function filingSnippet(filing: Filing): string {
  return `Form 2 ${filing.filingId} for \`${filing.candidateId}\``;
}

function matchesCandidate(candidate: Candidate, needle: string): boolean {
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
