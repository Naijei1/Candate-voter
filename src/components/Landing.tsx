"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAsk } from "@/components/chat/AskProvider";
import { CandidateDisclosure } from "@/components/CandidateDisclosure";
import { DistrictMap } from "@/components/DistrictMap";
import { RecordMeta } from "@/components/RecordMeta";
import { StateScoreboard, WhatAmILookingAt } from "@/components/StateScoreboard";
import { StorageNotice } from "@/components/StorageNotice";
import { MapLegend, UsMap } from "@/components/UsMap";
import { ZipLookup } from "@/components/ZipLookup";
import { askScopeForState, askScopeForYear, pageContextFromScope } from "@/lib/chat/scope";
import {
  emptyRaceSentence,
  homeValueLine,
  jurisdictionRepeatsTitle,
  officeOneLiner,
  runningForLine,
  stateHoverLine,
} from "@/lib/copy";
import { stateName } from "@/lib/data/states";
import { officeLabel, partyCue } from "@/lib/format";
import { stateRaces, stateScoreboard, statesWithRaces } from "@/lib/landing";
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
import {
  searchWithoutState,
  searchWithState,
  searchWithZip,
  postalFromSearch,
  zipFromSearch,
} from "@/lib/landing/state-query";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { zipRaceSlots, zipSlotJurisdiction, zipSlotTitle, type ZipLookupPayload, type ZipLookupResult, type ZipRaceSlot } from "@/lib/lookup/zip-view";
import { racesByStateOffice } from "@/lib/races";
import type { Race } from "@/lib/types";

const PREVIEW_LIMIT = 8;

type LandingProps = {
  year: number;
  races: Race[];
  initialState: string | null;
  initialZip?: string | null;
  hasAnyRaces: boolean;
  cycleLabel: string;
  /** Candidates already read for the state in the URL, so the list can render with the races. */
  seededCandidates?: RaceCandidatesResult | null;
  /** Top-level race-index `refreshedAt`. Null omits the chip. */
  refreshedAt?: string | null;
  /** Defaults to the live ZIP lookup. Pages do not pass this. */
  lookupZip?: (zip: string, year: number) => Promise<ZipLookupResult>;
};

export function Landing({
  year,
  races,
  initialState,
  initialZip = null,
  hasAnyRaces,
  cycleLabel,
  seededCandidates = null,
  refreshedAt = null,
  lookupZip,
}: LandingProps) {
  const [selected, setSelected] = useState<string | null>(initialState);
  const [zipCode, setZipCode] = useState<string | null>(initialZip);
  const [zipPayload, setZipPayload] = useState<ZipLookupPayload | null>(null);
  const [zipLoading, setZipLoading] = useState(Boolean(initialZip));
  const [zipFailed, setZipFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  const [entries, setEntries] = useState<Map<string, CandidateCacheEntry>>(() =>
    seedCandidateCache(seededCandidates),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const heldZip = useRef<ZipLookupPayload | null>(null);
  const marked = statesWithRaces(races);
  const { replacePageContext } = useAsk();

  useEffect(() => {
    const scope = selected ? askScopeForState(year, selected, races) : askScopeForYear(year);
    return replacePageContext(pageContextFromScope(scope));
  }, [replacePageContext, races, selected, year]);

  const syncFromLocation = useCallback(() => {
    setSelected(postalFromSearch(window.location.search));
    setZipCode(zipFromSearch(window.location.search));
  }, []);

  useLayoutEffect(() => {
    syncFromLocation();
    watchLocation(syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      unwatchLocation(syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncFromLocation]);

  useEffect(() => {
    setShowAll(false);
  }, [selected, zipCode]);

  useEffect(() => {
    document.documentElement.dataset.mapView = selected ? "state" : "national";
    return () => {
      delete document.documentElement.dataset.mapView;
    };
  }, [selected]);

  useEffect(() => {
    if (!zipCode || !selected) {
      heldZip.current = null;
      setZipPayload(null);
      setZipLoading(false);
      setZipFailed(false);
      return;
    }
    const held = heldZip.current;
    if (held && held.zip === zipCode && held.state === selected) {
      setZipPayload(held);
      setZipLoading(false);
      setZipFailed(false);
      return;
    }
    let active = true;
    setZipLoading(true);
    setZipFailed(false);
    (async () => {
      try {
        const result = await (lookupZip ?? findRacesByZip)(zipCode, year);
        if (!active) return;
        if (!result.ok || result.payload.state !== selected) {
          setZipPayload(null);
          setZipFailed(true);
          return;
        }
        heldZip.current = result.payload;
        setZipPayload(result.payload);
      } catch {
        if (!active) return;
        setZipPayload(null);
        setZipFailed(true);
      } finally {
        if (active) setZipLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [lookupZip, selected, year, zipCode]);

  const listed = selected ? stateRaces(races, selected) : [];
  const yours = zipPayload && zipPayload.state === selected ? zipRaceSlots(races, zipPayload) : [];
  const yourIds = new Set(yours.map((slot) => slot.raceId));
  const pinYours = Boolean(zipCode && selected && !zipFailed);
  const visibleIds = (
    pinYours && !showAll ? listed.filter((race) => yourIds.has(race.raceId)) : listed
  ).map((race) => race.raceId);
  const candidateRaceKey = visibleIds.join("\n");
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

  const writeUrl = useCallback((search: string) => {
    const next = `${window.location.pathname}${search}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history.pushState(null, "", next);
  }, []);

  const selectState = useCallback(
    (postal: string) => {
      heldZip.current = null;
      writeUrl(searchWithState(window.location.search, postal));
    },
    [writeUrl],
  );

  const openZip = useCallback(
    (payload: ZipLookupPayload) => {
      if (!payload.state) return;
      heldZip.current = payload;
      writeUrl(searchWithZip(window.location.search, payload.state, payload.zip));
    },
    [writeUrl],
  );

  const backToMap = useCallback(() => {
    heldZip.current = null;
    setHot(null);
    writeUrl(searchWithoutState(window.location.search));
  }, [writeUrl]);

  const pickState = useCallback(() => {
    if (selected) {
      backToMap();
      return;
    }
    document.getElementById("hero-map-KS")?.focus();
  }, [backToMap, selected]);

  const hotBoard = hot ? stateScoreboard(races, hot, year) : null;
  const hotCaption =
    hot && hotBoard
      ? stateHoverLine(stateName(hot), hotBoard.senateFilings, hotBoard.districtsWithFilings, hotBoard.districtsTotal)
      : null;

  return (
    <div className={selected ? "state-shell" : "national-shell"}>
      <ChromeInfo>
        <WhatAmILookingAt refreshedAt={refreshedAt} icon />
      </ChromeInfo>
      <div className="zip-slot">
        <ZipLookup year={year} onFound={openZip} onPickState={pickState} lookup={lookupZip} />
        {!selected ? (
          <div className="home-cue">
            <p className="home-line" data-testid="home-value">
              {homeValueLine(year)}
            </p>
            <WhatAmILookingAt refreshedAt={refreshedAt} glass />
          </div>
        ) : null}
        {!selected && !hasAnyRaces ? (
          <div className="mt-2">
            <StorageNotice>No races are stored for election years {cycleLabel}.</StorageNotice>
          </div>
        ) : null}
      </div>

      {selected ? (
        <StateOverview
          year={year}
          races={races}
          postal={selected}
          refreshedAt={refreshedAt}
          cache={entries}
          pinYours={pinYours}
          zipLoading={zipLoading}
          zipFailed={zipFailed}
          yours={yours}
          showAll={showAll}
          onShowAll={() => setShowAll(true)}
          onBack={backToMap}
          onRetryRace={retryRace}
        />
      ) : null}

      {selected ? (
        <DistrictMap
          postal={selected}
          races={races}
          yourDistricts={pinYours ? houseCodes(yours) : []}
        />
      ) : (
        <div className="map-bleed" data-testid="national-map">
          <h1 className="sr-only">Find races on the map</h1>
          <UsMap
            mapId="hero-map"
            labelled
            selected={null}
            hot={hot}
            statesWithRaces={marked}
            onSelect={selectState}
            onHover={setHot}
            label={`Map of the United States for ${year}. States with candidates are filled. Alaska and Hawaii are inset.`}
          />
          {hotCaption ? (
            <p className="glass-chip map-hover-card" role="status">
              {hotCaption}
            </p>
          ) : null}
          <div className="map-legend-dock">
            <MapLegend />
          </div>
        </div>
      )}
    </div>
  );
}

function StateOverview({
  year,
  races,
  postal,
  refreshedAt,
  cache,
  pinYours,
  zipLoading,
  zipFailed,
  yours,
  showAll,
  onShowAll,
  onBack,
  onRetryRace,
}: {
  year: number;
  races: readonly Race[];
  postal: string;
  refreshedAt?: string | null;
  cache: Map<string, CandidateCacheEntry>;
  pinYours: boolean;
  zipLoading: boolean;
  zipFailed: boolean;
  yours: ReturnType<typeof zipRaceSlots>;
  showAll: boolean;
  onShowAll: () => void;
  onBack: () => void;
  onRetryRace: (raceId: string) => void;
}) {
  const name = stateName(postal);
  const board = stateScoreboard(races, postal, year);
  const listed = stateRaces(races, postal);
  const yourIds = new Set(yours.map((slot) => slot.raceId));
  const rest = listed.filter((race) => !yourIds.has(race.raceId));
  const showFull = !pinYours || showAll;

  return (
    <div className="state-overview" data-testid="state-page">
      <div className="back-chrome">
        <span className="drawer-handle" aria-hidden="true" />
        <div className="back-chrome-row">
          <button type="button" onClick={onBack} data-testid="back-to-map" className="back-link">
            <span aria-hidden="true">← </span>
            Back to map
          </button>
          <h1 className="state-title">{name}</h1>
        </div>
      </div>
      <p className="state-year">{year}</p>
      <StateScoreboard board={board} />
      <WhatAmILookingAt refreshedAt={refreshedAt} />
      {pinYours ? (
        <section
          id="your-races"
          data-testid="your-races"
          aria-labelledby="your-races-heading"
          className="your-races-block mt-6"
        >
          <h2 id="your-races-heading" className="text-lg font-semibold tracking-tight text-ink">
            Your races
          </h2>
          {zipLoading ? (
            <p className="mt-2 text-sm text-muted" aria-busy="true">
              Finding your races…
            </p>
          ) : yours.length === 0 ? (
            <p className="mt-2 text-sm text-ink">No Senate or House race came back for this ZIP.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {(["senate", "house"] as const).map((office) => {
                const group = yours.filter((slot) => slot.office === office);
                if (group.length === 0) return null;
                return (
                  <section key={office} aria-label={officeLabel(office)}>
                    <h3 className="text-xs font-semibold tracking-wide text-accent uppercase">
                      {officeLabel(office)}
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {group.map((slot) =>
                        slot.race ? (
                          <RaceCard
                            key={slot.race.raceId}
                            race={slot.race}
                            candidates={cache.get(slot.race.raceId)}
                            onRetry={() => onRetryRace(slot.race!.raceId)}
                          />
                        ) : (
                          <li key={slot.raceId} className="race-row">
                            <h4 className="font-semibold tracking-tight text-ink">
                              <Link
                                href={`/races/${slot.raceId}`}
                                className="race-title text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                              >
                                <span>{zipSlotTitle(slot, postal)}</span>
                                <DetailsCue />
                              </Link>
                            </h4>
                            <OfficeLine office={slot.office} district={slot.district} />
                            {placeLine(zipSlotTitle(slot, postal), zipSlotJurisdiction(slot, postal)) ? (
                              <p className="text-sm text-muted">{zipSlotJurisdiction(slot, postal)}</p>
                            ) : null}
                            <p className="mt-1 text-sm text-ink">
                              {emptyRaceSentence({
                                office: slot.office,
                                district: slot.district,
                              })}
                            </p>
                          </li>
                        ),
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          {!showAll ? (
            <button
              type="button"
              data-testid="see-all-races"
              className="see-all"
              aria-expanded="false"
              onClick={onShowAll}
            >
              See all {name} races
            </button>
          ) : null}
        </section>
      ) : null}
      {zipFailed ? (
        <div className="zip-guidance" data-testid="zip-guidance">
          <p className="zip-status">That ZIP did not match this state.</p>
          <button type="button" className="zip-pick" onClick={onBack}>
            Tap a state on the map
          </button>
        </div>
      ) : null}
      {showFull ? (
        <RaceGroups
          postal={postal}
          races={showAll ? rest : listed}
          cache={cache}
          onRetryRace={onRetryRace}
          heading={showAll ? `All ${name} races` : null}
        />
      ) : null}
    </div>
  );
}

function RaceGroups({
  postal,
  races,
  cache,
  onRetryRace,
  heading,
}: {
  postal: string;
  races: Race[];
  cache: Map<string, CandidateCacheEntry>;
  onRetryRace: (raceId: string) => void;
  heading: string | null;
}) {
  const groups = racesByStateOffice(races);
  if (groups.length === 0) {
    return heading ? null : (
      <p className="mt-6 text-sm text-ink">
        No Senate or House races for {stateName(postal)}.
      </p>
    );
  }
  return (
    <div className="race-groups mt-6 space-y-5">
      {heading ? <h2 className="text-lg font-semibold tracking-tight text-ink">{heading}</h2> : null}
      {groups.map((group) => (
        <section key={group.office} aria-labelledby={`${postal}-${group.office}`}>
          <h3
            id={`${postal}-${group.office}`}
            className="text-xs font-semibold tracking-wide text-accent uppercase"
          >
            {officeLabel(group.office)}
          </h3>
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
    <li className="race-row">
      <h4 className="font-semibold tracking-tight">
        <Link
          href={`/races/${race.raceId}`}
          className="race-title text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span>{race.title}</span>
          <DetailsCue />
        </Link>
      </h4>
      <OfficeLine office={race.office} district={race.district} />
      {placeLine(race.title, race.jurisdiction) ? (
        <p className="text-sm text-muted">{race.jurisdiction}</p>
      ) : null}
      {candidates?.ok && candidates.candidates.length > 0 ? (
        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
          {candidates.candidates.length === 1
            ? "1 candidate so far"
            : `${candidates.candidates.length} candidates so far`}
        </p>
      ) : null}
      <CandidateList race={race} entry={candidates} onRetry={onRetry} />
      {race.empty === true ? null : (
        <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} showUpdated={false} />
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

function DetailsCue() {
  return (
    <span className="row-cue">
      Details <span aria-hidden="true">›</span>
    </span>
  );
}

function OfficeLine({
  office,
  district,
}: {
  office: Race["office"];
  district: string | null;
}) {
  const line = officeOneLiner({ office, district });
  if (!line) return null;
  return <p className="office-line">{line}</p>;
}

function placeLine(title: string, jurisdiction: string | null): boolean {
  if (!jurisdiction) return false;
  return !jurisdictionRepeatsTitle(title, jurisdiction);
}

function ChromeInfo({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("map-chrome-info"));
    document.documentElement.dataset.chromeInfo = "ready";
    return () => {
      delete document.documentElement.dataset.chromeInfo;
    };
  }, []);
  if (!slot) return null;
  return createPortal(children, slot);
}

function houseCodes(slots: readonly ZipRaceSlot[]): string[] {
  const codes: string[] = [];
  for (const slot of slots) {
    if (slot.office !== "house" || !slot.district) continue;
    const code = slot.district.trim().padStart(2, "0");
    if (!/^\d{2}$/.test(code) || codes.includes(code)) continue;
    codes.push(code);
  }
  return codes;
}
