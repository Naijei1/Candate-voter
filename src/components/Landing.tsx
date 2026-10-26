"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAsk } from "@/components/chat/AskProvider";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { MapLegend, UsMap } from "@/components/UsMap";
import { askScopeForState, askScopeForYear, pageContextFromScope } from "@/lib/chat/scope";
import { isAskPanelPath } from "@/lib/chat/ui";
import { isPostalState, stateName, stateOptions } from "@/lib/data/states";
import { postalFromSearch, searchWithState } from "@/lib/landing/state-query";
import { formatInstant, officeLabel, partyLabel, partyTone } from "@/lib/format";
import {
  presidentialRace,
  spotlightRaces,
  stateCoverage,
  stateRaces,
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
  /** Ingest watermark time from freshness (`refreshedAt`). */
  refreshedAt?: string | null;
};

export function Landing({
  year,
  races,
  initialState,
  hasAnyRaces,
  cycleLabel,
  seededCandidates = null,
  refreshedAt = null,
}: LandingProps) {
  const [selected, setSelected] = useState<string | null>(initialState);
  const [entries, setEntries] = useState<Map<string, CandidateCacheEntry>>(() =>
    seedCandidateCache(seededCandidates),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const marked = statesWithRaces(races);
  const spotlight = spotlightRaces(races);
  const { replacePageContext } = useAsk();

  useEffect(() => {
    const scope = selected ? askScopeForState(year, selected, races) : askScopeForYear(year);
    return replacePageContext(pageContextFromScope(scope));
  }, [replacePageContext, races, selected, year]);

  useEffect(() => {
    const fromUrl = postalFromSearch(window.location.search);
    setSelected(fromUrl ?? initialState);
  }, [initialState]);

  const panelRaceKey = selected ? stateRaces(races, selected).map((race) => race.raceId).join("\n") : "";

  useEffect(() => {
    if (!panelRaceKey) return;
    const ids = panelRaceKey.split("\n");
    const missing = ids.filter((id) => !entriesRef.current.has(id));
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
  }, [panelRaceKey, reloadKey]);

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
    setSelected(code);
    writeStateUrl(code);
  }, [writeStateUrl]);

  useEffect(() => {
    if (!selected) return;
    if (postalFromSearch(window.location.search) === selected) return;
    writeStateUrl(selected);
  }, [selected, writeStateUrl]);

  useEffect(() => {
    function onPop() {
      setSelected(postalFromSearch(window.location.search));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="space-y-10">
      <section data-testid="hero" className="map-hero" aria-labelledby="hero-heading">
        {hasAnyRaces ? null : (
          <div className="px-4 pt-4 sm:px-6">
            <StorageNotice>
              No races are stored for election years {cycleLabel}.
            </StorageNotice>
          </div>
        )}
        <div className="map-hero-grid">
          <div className="map-stage">
            <div className="map-overlay">
              <h1 id="hero-heading" className="text-lg font-semibold tracking-tight text-ink">
                Federal filings
              </h1>
              <p className="mt-1 text-sm leading-5 text-muted">
                Nonpartisan FEC Form 2 records for {year}. No endorsements, rankings, or vote advice.
              </p>
              <p className="mt-1 text-sm leading-5 text-ink">
                Choose a state, or <AskCue />.
              </p>
              <div className="mt-3">
                <label htmlFor="state-jump" className="text-sm font-medium text-muted">
                  State or territory
                </label>
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
              </div>
              <MapLegend />
            </div>
            <div className="map-canvas">
              <UsMap
                mapId="hero-map"
                labelled
                selected={selected}
                statesWithRaces={marked}
                onSelect={selectState}
                label={`Map of the United States for ${year}. States with stored Senate or House filings are highlighted. Alaska and Hawaii are inset.`}
              />
            </div>
          </div>
          <div id="browse" data-testid="browse" className="map-panel">
            <StatePanel
              year={year}
              races={races}
              selected={selected}
              cache={entries}
              onRetryRace={retryRace}
              refreshedAt={refreshedAt}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="popular-heading">
        <h2 id="popular-heading" className="text-lg font-semibold tracking-tight text-ink">
          Popular
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Recently updated filings — not a ranking.
        </p>
        {spotlight.length === 0 ? (
          <div className="mt-4">
            <StorageNotice>No races are stored for {year}.</StorageNotice>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {spotlight.map((race, index) => (
              <li key={race.raceId}>
                <article className="rounded-xl border border-line bg-card p-4 shadow-sm">
                  <div className="flex gap-4">
                    <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-muted tabular-nums" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-tight">
                        <Link
                          href={`/races/${race.raceId}`}
                          className="text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                        >
                          <span className="sr-only">Popular {index + 1}. </span>
                          {race.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-muted">{race.jurisdiction}</p>
                      <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
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
        ask
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => ask.setOpen(true)}>
      ask
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
  refreshedAt,
  onRetryRace,
}: {
  year: number;
  races: Race[];
  selected: string | null;
  cache: Map<string, CandidateCacheEntry>;
  refreshedAt: string | null;
  onRetryRace: (raceId: string) => void;
}) {
  const listed = selected ? stateRaces(races, selected) : [];
  const groups = racesByStateOffice(listed);
  const president = presidentialRace(races);
  const coverage = selected ? stateCoverage(races, selected, year) : null;
  const refreshed = formatInstant(refreshedAt);

  return (
    <aside
      data-testid="state-panel"
      className="flex h-full max-h-[44rem] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm lg:max-h-none lg:rounded-none lg:border-0 lg:border-l lg:shadow-none"
    >
      <div className="border-b border-line bg-paper px-4 py-3">
        <h3 className="text-lg font-semibold tracking-tight">
          {selected ? `${stateName(selected)} filings` : "State filings"}
        </h3>
        <div className="text-sm leading-6 text-muted">
          {selected && coverage ? (
            <>
              {coverage.lines.length > 0 ? (
                coverage.lines.map((line) => <p key={line}>{line}</p>)
              ) : (
                <p>{`No Senate or House Form 2 e-file filings are stored for ${stateName(selected)} in ${year}.`}</p>
              )}
              <p>{coverage.scopeNote}</p>
              {refreshed ? <p>Refreshed {refreshed}</p> : null}
            </>
          ) : (
            <p>Select a state to list stored Senate and House filings.</p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!selected ? (
          <p className="px-1 py-8 text-center text-sm leading-6 text-muted">
            Select a state on the map, or use the state list. The panel lists
            filings stored for that state. It does not rank them.
          </p>
        ) : groups.length === 0 ? (
          <div className="space-y-4 px-1 py-4">
            <p className="text-sm font-medium text-ink">No filings yet.</p>
            <NationalContest year={year} president={president} />
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.office} aria-labelledby={`${selected}-${group.office}`}>
                <h4
                  id={`${selected}-${group.office}`}
                  className="px-1 text-xs font-semibold tracking-wide text-accent uppercase"
                >
                  {officeLabel(group.office)}
                </h4>
                <ul className="mt-2 space-y-2">
                  {group.races.map((race) => (
                    <RaceCard
                      key={race.raceId}
                      race={race}
                      candidates={cache.get(race.raceId)}
                      onRetry={() => onRetryRace(race.raceId)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            <NationalContest year={year} president={president} />
          </div>
        )}
      </div>
    </aside>
  );
}

function NationalContest({
  year,
  president,
}: {
  year: number;
  president: Race | null;
}) {
  if (!president) return null;
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
    <li className="rounded-lg border border-line px-3 py-3">
      <h5 className="font-semibold tracking-tight">
        <Link
          href={`/races/${race.raceId}`}
          className="text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {race.title}
        </Link>
      </h5>
      <p className="text-sm text-muted">{race.jurisdiction}</p>
      <CandidateList race={race} entry={candidates} onRetry={onRetry} />
      <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
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
    return <p className="mt-2 text-sm text-muted">No candidates are stored for this race.</p>;
  }

  const preview = entry.candidates.slice(0, PREVIEW_LIMIT);
  const hidden = entry.candidates.length - preview.length;

  return (
    <div className="mt-2">
      <ul className="space-y-1">
        {preview.map((candidate) => (
          <li key={candidate.candidateId} className="text-sm">
            <Link
              href={`/candidates/${candidate.candidateId}`}
              className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {candidate.displayName}
            </Link>
            {candidate.partyLabels.length > 1 ? (
              <span className="ml-2 text-muted">{candidate.partyLabels.join(" · ")}</span>
            ) : (
              <Affiliation party={candidate.partyAffiliation} provided={candidate.partyLabel} />
            )}
            {candidate.multiFilingNote ? (
              <p className="text-sm text-muted">{candidate.multiFilingNote}</p>
            ) : null}
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
          <span> are on the race page, in alphabetical order.</span>
        </p>
      ) : null}
    </div>
  );
}

function Affiliation({
  party,
  provided,
}: {
  party: string | null;
  provided?: string | null;
}) {
  const tone = partyTone(party);
  const toneClass =
    tone === "democratic" ? "text-accent" : tone === "republican" ? "text-rose-800" : "text-muted";
  return <span className={`ml-2 ${toneClass}`}>{partyLabel(party, provided)}</span>;
}
