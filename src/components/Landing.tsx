"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAsk } from "@/components/chat/AskProvider";
import { CandidateDisclosure } from "@/components/CandidateDisclosure";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { RecordMeta } from "@/components/RecordMeta";
import { StateScoreboard, WhatAmILookingAt } from "@/components/StateScoreboard";
import { StorageNotice } from "@/components/StorageNotice";
import { MapLegend, UsMap } from "@/components/UsMap";
import { ZipLookup } from "@/components/ZipLookup";
import { askScopeForState, askScopeForYear, pageContextFromScope } from "@/lib/chat/scope";
import { isAskPanelPath } from "@/lib/chat/ui";
import { emptyRaceSentence, runningForLine } from "@/lib/copy";
import { isPresidentialElectionYear } from "@/lib/data/calendar";
import { isPostalState, stateName, stateOptions } from "@/lib/data/states";
import {
  postalFromSearch,
  readZipOwnedState,
  searchWithoutState,
  searchWithState,
  selectionFromLocation,
  selectionFromPop,
  writeZipOwnedState,
} from "@/lib/landing/state-query";
import { officeLabel, partyCue } from "@/lib/format";
import {
  presidentialRace,
  spotlightRaces,
  stateRaces,
  stateScoreboard,
  statesWithRaces,
} from "@/lib/landing";
import { racesByStateOffice } from "@/lib/races";
import {
  loadCandidatesForRaces,
  type RaceCandidatesResult,
} from "@/lib/landing/candidates";
import {
  applyCandidateLoad,
  isAbortError,
  loadCandidatesForRacesWithTimeout,
  type CandidateCacheEntry,
} from "@/lib/landing/load-candidates";
import type { ZipLookupResult } from "@/lib/lookup/zip-view";
import type { Race } from "@/lib/types";

const PREVIEW_LIMIT = 8;

type LandingProps = {
  year: number;
  races: Race[];
  initialState: string | null;
  hasAnyRaces: boolean;
  cycleLabel: string;
  /** Candidates already read for the state in the URL, so the panel can render with the races. */
  seededCandidates?: RaceCandidatesResult | null;
  /** Top-level race-index `refreshedAt`. Null omits the page banner. */
  refreshedAt?: string | null;
  /** Defaults to the live ZIP lookup. Pages do not pass this. */
  lookupZip?: (zip: string, year: number) => Promise<ZipLookupResult>;
};

export function Landing({
  year,
  races,
  initialState,
  hasAnyRaces,
  cycleLabel,
  seededCandidates = null,
  refreshedAt = null,
  lookupZip,
}: LandingProps) {
  const [selected, setSelected] = useState<string | null>(initialState);
  const [entries, setEntries] = useState<Map<string, CandidateCacheEntry>>(() =>
    seedCandidateCache(seededCandidates),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [zipRaceIds, setZipRaceIds] = useState<string[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const marked = statesWithRaces(races);
  const spotlight = spotlightRaces(
    isPresidentialElectionYear(year)
      ? races
      : races.filter((race) => race.office !== "president"),
  );
  const zipOwned = useRef<string | null>(null);
  const { replacePageContext } = useAsk();
  const rememberZipOwned = useCallback((postal: string | null) => {
    zipOwned.current = postal;
    writeZipOwnedState(window.sessionStorage, postal);
  }, []);

  useEffect(() => {
    const scope = selected ? askScopeForState(year, selected, races) : askScopeForYear(year);
    return replacePageContext(pageContextFromScope(scope));
  }, [replacePageContext, races, selected, year]);

  useLayoutEffect(() => {
    const fromUrl = postalFromSearch(window.location.search);
    const owned = readZipOwnedState(window.sessionStorage);
    zipOwned.current = owned && owned === fromUrl ? owned : null;
    if (owned && owned !== fromUrl) writeZipOwnedState(window.sessionStorage, null);
    setSelected(selectionFromLocation(window.location.search, initialState));
  }, [initialState]);

  useLayoutEffect(() => {
    const onUrl = () => {
      const fromUrl = postalFromSearch(window.location.search);
      if (fromUrl) setSelected(fromUrl);
    };
    const onPop = () => setSelected(selectionFromPop(window.location.search));
    watchLocation(onUrl);
    window.addEventListener("popstate", onPop);
    return () => {
      unwatchLocation(onUrl);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const reportZipRaces = useCallback((ids: string[]) => {
    setZipRaceIds((prev) => (sameIds(prev, ids) ? prev : ids));
  }, []);

  const panelIds = selected ? stateRaces(races, selected).map((race) => race.raceId) : [];
  const candidateRaceKey = [...new Set([...panelIds, ...zipRaceIds])].join("\n");
  const emptyIdsKey = races
    .filter((race) => race.empty === true)
    .map((race) => race.raceId)
    .join("\n");

  useEffect(() => {
    if (!candidateRaceKey) return;
    const ids = candidateRaceKey.split("\n");
    const emptyIds = new Set(emptyIdsKey ? emptyIdsKey.split("\n") : []);
    const missing = ids.filter((id) => !entriesRef.current.has(id) && !emptyIds.has(id));
    if (missing.length === 0) return;

    const controller = new AbortController();
    let active = true;
    let applied = false;
    const fail = () => {
      applied = true;
      setEntries((prev) => applyCandidateLoad(prev, missing, { ok: false, error: "unavailable" }));
    };

    (async () => {
      try {
        const result = await loadCandidatesForRacesWithTimeout(missing, {
          load: loadCandidatesForRaces,
          signal: controller.signal,
        });
        if (!active) return;
        applied = true;
        setEntries((prev) => applyCandidateLoad(prev, missing, result));
      } catch (error) {
        if (!active || isAbortError(error)) return;
        fail();
      } finally {
        if (active && !applied) fail();
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [candidateRaceKey, emptyIdsKey, reloadKey]);

  const retryRace = useCallback((raceId: string) => {
    setEntries((prev) => {
      if (!prev.has(raceId)) return prev;
      const next = new Map(prev);
      next.delete(raceId);
      return next;
    });
    setReloadKey((key) => key + 1);
  }, []);

  const writeStateUrl = useCallback((code: string) => {
    const next = `${searchWithState(window.location.search, code)}${window.location.hash}`;
    const current = `${window.location.search}${window.location.hash}`;
    if (next === current) return;
    // Pass null so Next.js copies its history state and keeps this query
    // as the canonical URL. Passing history.state skips that sync and a
    // later navigation can wipe `state`.
    window.history.replaceState(null, "", next);
  }, []);

  const selectState = useCallback((postal: string) => {
    const code = postal.trim().toUpperCase();
    if (!isPostalState(code)) return;
    rememberZipOwned(null);
    setSelected(code);
    writeStateUrl(code);
  }, [rememberZipOwned, writeStateUrl]);

  const selectFromZip = useCallback((postal: string) => {
    const code = postal.trim().toUpperCase();
    if (!isPostalState(code)) return;
    rememberZipOwned(code);
    setSelected(code);
    writeStateUrl(code);
  }, [rememberZipOwned, writeStateUrl]);

  const rejectZip = useCallback(() => {
    const owned = zipOwned.current ?? readZipOwnedState(window.sessionStorage);
    rememberZipOwned(null);
    if (!owned) return;
    setSelected((current) => (current === owned ? null : current));
    if (postalFromSearch(window.location.search) !== owned) return;
    const nextSearch = searchWithoutState(window.location.search);
    const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [rememberZipOwned]);

  useEffect(() => {
    if (!selected) return;
    if (postalFromSearch(window.location.search) === selected) return;
    writeStateUrl(selected);
  }, [selected, writeStateUrl]);

  return (
    <div className="space-y-6">
      <DataRefreshedBanner refreshedAt={refreshedAt} />
      <ZipLookup
        year={year}
        races={races}
        onState={selectFromZip}
        onReject={rejectZip}
        lookup={lookupZip}
        onStoredRaceIds={reportZipRaces}
        renderStoredRace={(race) => (
          <RaceCard
            race={race}
            candidates={entries.get(race.raceId)}
            onRetry={() => retryRace(race.raceId)}
          />
        )}
        renderLayout={({ form, status }) => (
          <section className="map-hero" aria-labelledby="hero-heading">
            <div className="map-hero-grid">
              <div className="browse-column">
                <div className="flow-hero" data-testid="hero">
                  {hasAnyRaces ? null : (
                    <div className="mb-3">
                      <StorageNotice>
                        No races are stored for election years {cycleLabel}.
                      </StorageNotice>
                    </div>
                  )}
                  <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight text-ink">
                    Who&apos;s filed
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink">
                    A statement of candidacy (Form 2) is an FEC filing that someone intends to
                    run. Candidates so far for {year}, not the final ballot. No endorsements.
                  </p>
                  <WhatAmILookingAt refreshedAt={refreshedAt} />
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Find races with a ZIP code, or pick a state on the map. You can also <AskCue />.
                  </p>
                  <div className="mt-4">{form}</div>
                </div>
                <div className="zip-results mt-4">{status}</div>
                <div id="browse" data-testid="browse" className="map-panel mt-6">
                  <StatePanel
                    year={year}
                    races={races}
                    selected={selected}
                    cache={entries}
                    onRetryRace={retryRace}
                  />
                </div>
              </div>
              <div className="map-stage">
                <h2 id="map-heading" className="map-stage-label">
                  Browse by state
                </h2>
                <div className="map-canvas">
                  <UsMap
                    mapId="hero-map"
                    labelled
                    selected={selected}
                    statesWithRaces={marked}
                    onSelect={selectState}
                    label={`Map of the United States for ${year}. States with filings stored are highlighted. Alaska and Hawaii are inset.`}
                  />
                </div>
                <div className="map-key">
                  <MapLegend />
                  <label htmlFor="state-jump" className="mt-3 block text-xs font-medium text-muted">
                    Jump to a state
                    <select
                      id="state-jump"
                      data-testid="state-jump"
                      value={selected ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value) selectState(value);
                      }}
                      className="mt-1 block w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <option value="">Choose a state</option>
                      {stateOptions().map((option) => (
                        <option key={option.postal} value={option.postal}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}
      />

      <section aria-labelledby="popular-heading">
        <h2 id="popular-heading" className="text-lg font-semibold tracking-tight text-ink">
          Popular
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          Races with the latest updates in this year&apos;s records.
        </p>
        {spotlight.length === 0 ? (
          <div className="mt-4">
            <StorageNotice>No races are stored for {year}.</StorageNotice>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {spotlight.map((race) => (
              <li key={race.raceId}>
                <article className="rounded-xl border border-line bg-card p-4 shadow-sm">
                  <h3 className="text-base font-semibold tracking-tight">
                    <Link
                      href={`/races/${race.raceId}`}
                      className="text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    >
                      {race.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted">{race.jurisdiction}</p>
                  <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AskCue() {
  const pathname = usePathname();
  const ask = useAsk();
  const className =
    "font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  if (!isAskPanelPath(pathname)) {
    return (
      <Link href="/chat" className={className}>
        ask a question
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => ask.setOpen(true)}>
      ask a question
    </button>
  );
}

function seedCandidateCache(
  seeded: RaceCandidatesResult | null,
): Map<string, CandidateCacheEntry> {
  const cache = new Map<string, CandidateCacheEntry>();
  if (!seeded?.ok) return cache;
  for (const group of seeded.races) {
    if ("error" in group) cache.set(group.raceId, { ok: false });
    else cache.set(group.raceId, { ok: true, candidates: group.candidates });
  }
  return cache;
}

function StatePanel({
  year,
  races,
  selected,
  cache,
  onRetryRace,
}: {
  year: number;
  races: Race[];
  selected: string | null;
  cache: Map<string, CandidateCacheEntry>;
  onRetryRace: (raceId: string) => void;
}) {
  const listed = selected ? stateRaces(races, selected) : [];
  const groups = racesByStateOffice(listed);
  const president = isPresidentialElectionYear(year) ? presidentialRace(races) : null;
  const board = selected ? stateScoreboard(races, selected, year) : null;
  const senate = groups.find((group) => group.office === "senate");
  const house = groups.find((group) => group.office === "house");
  const showHouse = (house?.races.length ?? 0) > 0;

  return (
    <aside data-testid="state-panel" className="min-w-0">
      <div className="border-t border-line pt-4">
        <h3 className="text-lg font-semibold tracking-tight">
          {selected ? stateName(selected) : "State filings"}
        </h3>
        {selected && board ? (
          <StateScoreboard board={board} />
        ) : (
          <p className="mt-1 text-sm leading-6 text-muted">
            Pick a state to see who&apos;s filed for Senate and House.
          </p>
        )}
      </div>
      <div className="py-3">
        {!selected ? (
          <p className="px-1 py-4 text-sm leading-6 text-muted">
            Select a state on the map, or use Jump to a state, to see candidates so far.
          </p>
        ) : !senate && !showHouse ? (
          <div className="space-y-4 px-1 py-2">
            <p className="text-sm font-medium text-ink">
              No Senate or House filings yet for {stateName(selected)} in {year}.
            </p>
            <NationalContest year={year} president={president} />
          </div>
        ) : (
          <div className="space-y-5">
            {senate ? (
              <OfficeList
                postal={selected}
                office="senate"
                races={senate.races}
                cache={cache}
                onRetryRace={onRetryRace}
              />
            ) : null}
            {showHouse ? (
              <section aria-labelledby={`${selected}-house`}>
                <h4
                  id={`${selected}-house`}
                  className="px-1 text-xs font-semibold tracking-wide text-accent uppercase"
                >
                  {officeLabel("house")}
                </h4>
                {house && house.races.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {house.races.map((race) => (
                      <RaceCard
                        key={race.raceId}
                        race={race}
                        candidates={cache.get(race.raceId)}
                        onRetry={() => onRetryRace(race.raceId)}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}
            <NationalContest year={year} president={president} />
          </div>
        )}
      </div>
    </aside>
  );
}

function OfficeList({
  postal,
  office,
  races,
  cache,
  onRetryRace,
}: {
  postal: string;
  office: "senate" | "house";
  races: Race[];
  cache: Map<string, CandidateCacheEntry>;
  onRetryRace: (raceId: string) => void;
}) {
  return (
    <section aria-labelledby={`${postal}-${office}`}>
      <h4
        id={`${postal}-${office}`}
        className="px-1 text-xs font-semibold tracking-wide text-accent uppercase"
      >
        {officeLabel(office)}
      </h4>
      <ul className="mt-2 space-y-2">
        {races.map((race) => (
          <RaceCard
            key={race.raceId}
            race={race}
            candidates={cache.get(race.raceId)}
            onRetry={() => onRetryRace(race.raceId)}
          />
        ))}
      </ul>
    </section>
  );
}

function NationalContest({
  year,
  president,
}: {
  year: number;
  president: Race | null;
}) {
  if (!president || !isPresidentialElectionYear(year)) return null;
  const labelYear = president.cycle ?? year;
  return (
    <div className="border-t border-line px-1 pt-3">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">National</p>
      <p className="mt-1 text-sm">
        <Link
          href={`/races/${president.raceId}`}
          className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Presidential · {labelYear}
        </Link>
      </p>
      <RecordMeta sourceUrl={president.sourceUrl} updatedAt={president.updatedAt} />
    </div>
  );
}

function RaceCard({
  race,
  candidates,
  onRetry,
}: {
  race: Race;
  candidates: CandidateCacheEntry | undefined;
  onRetry: () => void;
}) {
  return (
    <li className="rounded-lg border border-l-4 border-line border-l-accent px-3 py-3">
      <h5 className="font-semibold tracking-tight">
        <Link
          href={`/races/${race.raceId}`}
          className="text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {race.title}
        </Link>
      </h5>
      <p className="text-sm text-muted">{race.jurisdiction}</p>
      {candidates?.ok && candidates.candidates.length > 0 ? (
        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
          {candidates.candidates.length === 1
            ? "1 candidate so far"
            : `${candidates.candidates.length} candidates so far`}
        </p>
      ) : null}
      <CandidateList race={race} entry={candidates} onRetry={onRetry} />
      {race.empty === true ? null : (
        <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
      )}
    </li>
  );
}

function CandidateList({
  race,
  entry,
  onRetry,
}: {
  race: Race;
  entry: CandidateCacheEntry | undefined;
  onRetry: () => void;
}) {
  if (race.empty === true) {
    return <p className="mt-2 text-sm text-ink">{emptyRaceSentence(race)}</p>;
  }
  if (!entry) {
    return <p className="mt-2 text-sm text-muted">Loading candidates…</p>;
  }
  if (!entry.ok) {
    return (
      <div className="mt-2">
        <p className="text-sm text-muted">
          Candidates could not be loaded. The race page still lists them when the
          table is available.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-line bg-card px-2.5 py-1 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Retry
        </button>
      </div>
    );
  }
  if (entry.candidates.length === 0) {
    return <p className="mt-2 text-sm text-ink">{emptyRaceSentence(race)}</p>;
  }

  const preview = entry.candidates.slice(0, PREVIEW_LIMIT);
  const hidden = entry.candidates.length - preview.length;

  return (
    <div className="mt-2">
      <ul className="space-y-1">
        {preview.map((candidate) => (
          <li key={candidate.candidateId} className="text-sm">
            <CandidateDisclosure
              name={candidate.displayName}
              cue={partyCue(candidate.partyLabels)}
              runningFor={runningForLine(race)}
              partyAffiliation={candidate.partyAffiliation}
              href={`/candidates/${candidate.candidateId}`}
              filingCount={candidate.alternateFilingCount + 1}
              updatedAt={candidate.updatedAt}
            />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-1 text-sm text-muted">
          <Link
            href={`/races/${race.raceId}`}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            All {entry.candidates.length} candidates
          </Link>
          <span> are on the race page, listed A to Z.</span>
        </p>
      ) : null}
    </div>
  );
}

const locationListeners = new Set<() => void>();
let locationPatched = false;

function watchLocation(listener: () => void) {
  locationListeners.add(listener);
  if (locationPatched) return;
  locationPatched = true;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  const notify = () => {
    for (const item of locationListeners) item();
  };
  history.pushState = (...args: Parameters<History["pushState"]>) => {
    push(...args);
    notify();
  };
  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    replace(...args);
    notify();
  };
}

function unwatchLocation(listener: () => void) {
  locationListeners.delete(listener);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
