"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAsk } from "@/components/AskChrome";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { MapLegend, UsMap } from "@/components/UsMap";
import { askScopeForState, askScopeForYear } from "@/lib/chat/scope";
import { stateName, stateOptions } from "@/lib/data/states";
import { officeLabel, partyLabel, partyTone } from "@/lib/format";
import {
  filingCoverageLabel,
  presidentialRace,
  spotlightRaces,
  stateRaces,
  statesWithRaces,
} from "@/lib/landing";
import { racesByStateOffice } from "@/lib/races";
import {
  loadCandidatesForRaces,
  type CandidatePreview,
  type RaceCandidatesResult,
} from "@/lib/landing/candidates";
import type { Race } from "@/lib/types";

const PREVIEW_LIMIT = 8;

type CandidateCacheEntry =
  | { ok: true; candidates: CandidatePreview[] }
  | { ok: false };

type LandingProps = {
  year: number;
  races: Race[];
  initialState: string | null;
  hasAnyRaces: boolean;
  cycleLabel: string;
  /** Candidates already read for the state in the URL, so the panel can render with the races. */
  seededCandidates?: RaceCandidatesResult | null;
};

export function Landing({
  year,
  races,
  initialState,
  hasAnyRaces,
  cycleLabel,
  seededCandidates = null,
}: LandingProps) {
  const [selected, setSelected] = useState<string | null>(initialState);
  const [candidateTick, setCandidateTick] = useState(0);
  const cacheRef = useRef(seedCandidateCache(seededCandidates));
  const marked = statesWithRaces(races);
  const spotlight = spotlightRaces(races);
  const { replaceScope } = useAsk();

  useEffect(() => {
    const scope = selected ? askScopeForState(year, selected, races) : askScopeForYear(year);
    return replaceScope(scope);
  }, [replaceScope, races, selected, year]);

  useEffect(() => {
    setSelected(initialState);
  }, [initialState]);

  useEffect(() => {
    if (!selected) return;
    const ids = stateRaces(races, selected).map((race) => race.raceId);
    const missing = ids.filter((id) => !cacheRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    loadCandidatesForRaces(missing)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          for (const id of missing) cacheRef.current.set(id, { ok: false });
        } else {
          for (const group of result.races) {
            if ("error" in group) cacheRef.current.set(group.raceId, { ok: false });
            else cacheRef.current.set(group.raceId, { ok: true, candidates: group.candidates });
          }
        }
        setCandidateTick((tick) => tick + 1);
      })
      .catch(() => {
        if (cancelled) return;
        for (const id of missing) cacheRef.current.set(id, { ok: false });
        setCandidateTick((tick) => tick + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [races, selected]);

  function selectState(postal: string, scroll: boolean) {
    setSelected(postal);
    const params = new URLSearchParams(window.location.search);
    params.set("state", postal);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : "/");
    if (scroll) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("browse")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  return (
    <div className="space-y-14">
      {hasAnyRaces ? null : (
        <StorageNotice>
          No races are stored for election years {cycleLabel}.
        </StorageNotice>
      )}

      <section
        data-testid="hero"
        className="flex min-h-[calc(100svh-8.5rem)] flex-col justify-center"
        aria-labelledby="hero-heading"
      >
        <p className="text-sm font-semibold tracking-wide text-accent">{year}</p>
        <h1 id="hero-heading" className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Federal filings, in one place
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          Candate lists President, Senate, and House contests stored from FEC
          Form 2 e-file filings for {year}. Affiliation is the party on the
          filing. This is not an endorsement, a ranking, or a complete ballot.
        </p>
        <p className="mt-6">
          <a
            href="#browse"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Browse by state
          </a>
        </p>
        <div className="mt-12 max-w-xl">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Recently updated</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            A few contests with the newest stored update. Not a rating.
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
                            <span className="sr-only">Recently updated {index + 1}. </span>
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
        </div>
      </section>

      <MapReveal>
        <section id="browse" data-testid="browse" className="scroll-mt-24" aria-labelledby="browse-heading">
        <div className="mb-5">
          <h2 id="browse-heading" className="text-2xl font-semibold tracking-tight">
            Browse by state
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Choose a state to list Senate and House Form 2 filings stored for {year}.
            Territories are in the list under the map. Alaska and Hawaii are inset.
          </p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-xl border border-line bg-card p-3 shadow-sm sm:p-4">
            <UsMap
              mapId="browse-map"
              labelled
              selected={selected}
              statesWithRaces={marked}
              onSelect={(postal) => selectState(postal, false)}
              label={`Map of the United States for ${year}. States with stored Senate or House filings are highlighted. Alaska and Hawaii are inset.`}
            />
            <MapLegend />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="state-jump" className="text-sm font-medium text-muted">
                State or territory
              </label>
              <select
                id="state-jump"
                value={selected ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) selectState(value, false);
                }}
                className="min-w-56 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <option value="">Choose a state</option>
                {stateOptions().map((option) => (
                  <option key={option.postal} value={option.postal}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <StatePanel
            year={year}
            races={races}
            selected={selected}
            cache={cacheRef.current}
            cacheTick={candidateTick}
          />
        </div>
        </section>
      </MapReveal>
    </div>
  );
}

function MapReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={shown ? "map-reveal is-shown" : "map-reveal"} data-testid="browse-map">
      {children}
    </div>
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
  cacheTick,
}: {
  year: number;
  races: Race[];
  selected: string | null;
  cache: Map<string, CandidateCacheEntry>;
  cacheTick: number;
}) {
  void cacheTick;
  const listed = selected ? stateRaces(races, selected) : [];
  const groups = racesByStateOffice(listed);
  const president = presidentialRace(races);
  const coverage = selected ? filingCoverageLabel(races, selected) : null;

  return (
    <aside
      data-testid="state-panel"
      className="flex max-h-[44rem] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm"
    >
      <div className="border-b border-line bg-paper px-4 py-3">
        <h3 className="text-lg font-semibold tracking-tight">
          {selected ? `${stateName(selected)} filings` : "State filings"}
        </h3>
        <p className="text-sm leading-6 text-muted">
          {selected
            ? groups.length === 0
              ? `No Senate or House Form 2 e-file filings are stored for ${stateName(selected)} in ${year}.`
              : coverage
            : "Select a state to list stored Senate and House filings."}
        </p>
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
                    <RaceCard key={race.raceId} race={race} candidates={cache.get(race.raceId)} />
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
}: {
  race: Race;
  candidates: CandidateCacheEntry | undefined;
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
      <CandidateList race={race} entry={candidates} />
      <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
    </li>
  );
}

function CandidateList({
  race,
  entry,
}: {
  race: Race;
  entry: CandidateCacheEntry | undefined;
}) {
  if (!entry) {
    return <p className="mt-2 text-sm text-muted">Loading candidates…</p>;
  }
  if (!entry.ok) {
    return (
      <p className="mt-2 text-sm text-muted">
        Candidates could not be loaded. The race page still lists them when the
        table is available.
      </p>
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
            <Affiliation party={candidate.partyAffiliation} provided={candidate.partyLabel} />
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
