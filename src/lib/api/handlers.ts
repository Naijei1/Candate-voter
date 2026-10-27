import {
  FORM2_SCOPE,
  FORM2_SCOPE_NOTE,
  houseCoverageForRaces,
} from "../data/coverage";
import { appendExpectedRaces } from "../data/expected-races";
import { logReadError, sortFilings } from "../data/read";
import {
  loadPublicCandidates,
  loadVisibleRace,
  presentCandidate,
  visibleRaces,
} from "../data/view";
import type { IngestWatermark, Race } from "../types";
import type { ApiDeps, ApiRepository } from "./deps";
import { isResourceId } from "./ids";
import { censusZipDistricts, ZipLookupError } from "../geo/zip-districts";
import { json, rejectUnauthorized } from "./http";
import { parseRaceListQuery, type RaceListQuery } from "./race-query";
import { zipLookupBody } from "./zip-lookup";
import { parseZipLookupQuery } from "./zip-query";

function notFound(): Response {
  return json({ error: "not_found" }, 404);
}

function unavailable(): Response {
  return json({ error: "unavailable" }, 503);
}

function pageRaces(
  races: readonly Race[],
  query: RaceListQuery,
): { races: Race[]; nextCursor: string | null } {
  const filtered = races.filter((race) => {
    if (query.state && race.state !== query.state) return false;
    if (query.office && race.office !== query.office) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => a.raceId.localeCompare(b.raceId));
  const cursor = query.cursor;
  const start = cursor ? sorted.findIndex((race) => race.raceId > cursor) : 0;
  if (cursor && start === -1) {
    return { races: [], nextCursor: null };
  }
  const slice = sorted.slice(start, start + query.limit);
  const last = slice[slice.length - 1];
  const more = start + slice.length < sorted.length;
  return {
    races: slice,
    nextCursor: more && last ? last.raceId : null,
  };
}

export async function getRaces(request: Request, deps: ApiDeps): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;

  const parsed = parseRaceListQuery(
    new URL(request.url),
    deps.env,
    deps.now ?? new Date(),
  );
  if (!parsed.ok) return json({ error: "bad_request", message: parsed.message }, 400);

  try {
    const repo = deps.repository();
    const groups = await Promise.all(
      parsed.query.cycles.map((cycle) => repo.listRacesByCycle(cycle)),
    );
    const stored = visibleRaces(groups.flat());
    const listed = appendExpectedRaces(stored, parsed.query.cycles, {
      state: parsed.query.state,
      office: parsed.query.office,
    });
    const page = pageRaces(listed, parsed.query);
    const refreshedAt = await refreshedAtFrom(repo);
    return json({
      cycles: parsed.query.cycles,
      races: page.races,
      nextCursor: page.nextCursor,
      refreshedAt,
      coverage: {
        scope: FORM2_SCOPE,
        filingsSoFarOnly: true,
        scopeNote: FORM2_SCOPE_NOTE,
        refreshedAt,
        house: houseCoverageForRaces(
          listed,
          parsed.query.cycles,
          parsed.query.state,
        ),
      },
    });
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return unavailable();
  }
}

export async function getRace(
  request: Request,
  raceId: string,
  deps: ApiDeps,
): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;
  if (!isResourceId(raceId)) return notFound();

  try {
    const repo = deps.repository();
    const race = await loadVisibleRace(repo, raceId);
    if (!race) return notFound();
    const candidates = await loadPublicCandidates(repo, race.raceId);
    const cycleRaces =
      race.cycle == null ? [] : visibleRaces(await repo.listRacesByCycle(race.cycle));
    const refreshedAt = await refreshedAtFrom(repo);
    return json({
      race,
      candidates,
      refreshedAt,
      coverage: {
        scope: FORM2_SCOPE,
        filingsSoFarOnly: true,
        scopeNote: FORM2_SCOPE_NOTE,
        refreshedAt,
        house: houseCoverageForRaces(
          cycleRaces,
          race.cycle == null ? [] : [race.cycle],
          race.state,
        ),
      },
    });
  } catch (error) {
    logReadError("getRace", error);
    return unavailable();
  }
}

export async function getCandidate(
  request: Request,
  candidateId: string,
  deps: ApiDeps,
): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;
  if (!isResourceId(candidateId)) return notFound();

  try {
    const loaded = await loadCandidateWithRace(deps.repository(), candidateId);
    if (!loaded) return notFound();
    return json(loaded);
  } catch (error) {
    logReadError("getCandidate", error);
    return unavailable();
  }
}

export async function getCandidateFilings(
  request: Request,
  candidateId: string,
  deps: ApiDeps,
): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;
  if (!isResourceId(candidateId)) return notFound();

  try {
    const repo = deps.repository();
    const candidate = await repo.getCandidate(candidateId);
    if (!candidate) return notFound();
    const presented = presentCandidate(candidate);
    if (!presented) return notFound();
    const filings = sortFilings(await repo.listFilingsForCandidate(candidateId));
    return json({ candidate: presented, filings });
  } catch (error) {
    logReadError("listFilingsForCandidate", error);
    return unavailable();
  }
}

export async function getZipLookup(request: Request, deps: ApiDeps): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;

  const parsed = parseZipLookupQuery(new URL(request.url));
  if (!parsed.ok) return json({ error: "bad_request", message: parsed.message }, 400);

  const lookup = deps.lookupZip ?? censusZipDistricts;
  let hit;
  try {
    hit = await lookup(parsed.query.zip);
  } catch (error) {
    logZipLookup(error);
    return unavailable();
  }
  if (!hit) {
    return json(
      {
        error: "not_found",
        message: "No congressional district is published for that ZIP",
      },
      404,
    );
  }

  try {
    const repo = deps.repository();
    const stored = visibleRaces(await repo.listRacesByCycle(parsed.query.year));
    return json(
      zipLookupBody({
        zip: parsed.query.zip,
        year: parsed.query.year,
        hit,
        races: stored,
      }),
    );
  } catch (error) {
    logReadError("lookupZip", error);
    return unavailable();
  }
}

export async function getFreshness(
  request: Request,
  deps: ApiDeps,
): Promise<Response> {
  const denied = rejectUnauthorized(request, deps.env);
  if (denied) return denied;

  try {
    const watermark = await deps.repository().getWatermark();
    return json(freshnessBody(watermark));
  } catch (error) {
    logReadError("getWatermark", error);
    return unavailable();
  }
}

async function loadCandidateWithRace(repo: ApiRepository, candidateId: string) {
  const candidate = await repo.getCandidate(candidateId);
  if (!candidate) return null;
  const presented = presentCandidate(candidate);
  if (!presented) return null;
  const race = await loadVisibleRace(repo, candidate.raceId);
  return { candidate: presented, race };
}

function freshnessBody(watermark: IngestWatermark | null) {
  return {
    watermark,
    scope: FORM2_SCOPE,
    filingsSoFarOnly: true as const,
    scopeNote: FORM2_SCOPE_NOTE,
    refreshedAt: watermark?.updatedAt ?? null,
  };
}

function logZipLookup(error: unknown): void {
  const name = error instanceof ZipLookupError || error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`ZIP lookup failed: ${name}: ${message}`);
}

async function refreshedAtFrom(repo: ApiRepository): Promise<string | null> {
  const watermark = await repo.getWatermark();
  return watermark?.updatedAt ?? null;
}
