"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAsk } from "@/components/chat/AskProvider";
import { useYearNavigation } from "@/components/YearNavigation";
import { CandidateDisclosure } from "@/components/CandidateDisclosure";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { DistrictMap } from "@/components/DistrictMap";
import { RecordMeta } from "@/components/RecordMeta";
import { StateScoreboard } from "@/components/StateScoreboard";
import { StorageNotice } from "@/components/StorageNotice";
import { MapLegend, UsMap } from "@/components/UsMap";
import { useMobileSheet } from "@/components/useMobileSheet";
import { ZipLookup } from "@/components/ZipLookup";
import { askScopeForState, askScopeForYear, pageContextFromScope } from "@/lib/chat/scope";
import {
  ballotVersusFilingLine,
  candidatesSoFarLine,
  emptyHouseNext,
  emptyRaceSentence,
  federalScopeLine,
  jurisdictionRepeatsTitle,
  officeOneLiner,
  runningForLine,
  splitZipLine,
  stateHoverLine,
} from "@/lib/copy";
import { personFilingNote } from "@/lib/data/filing-note";
import { stateName } from "@/lib/data/states";
import { officeLabel, partyCue } from "@/lib/format";
import { senateCandidateCount, stateRaces, stateScoreboard, statesWithRaces } from "@/lib/landing";
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
  highlightedPostal,
  nextRememberedPostal,
  searchWithoutState,
  searchWithState,
  searchWithZip,
  postalFromSearch,
  withPreservedQuery,
  zipFromSearch,
  type MapContext,
} from "@/lib/landing/state-query";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup, zipFailureClearsSelection, zipRaceSlots, zipSlotJurisdiction, zipSlotTitle, type ZipLookupPayload, type ZipLookupResult, type ZipRaceSlot } from "@/lib/lookup/zip-view";
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
  const [rememberedPostal, setRememberedPostal] = useState<string | null>(() =>
    nextRememberedPostal(initialState, initialZip, null),
  );
  const [zipCode, setZipCode] = useState<string | null>(initialZip);
  const [zipPayload, setZipPayload] = useState<ZipLookupPayload | null>(null);
  const [zipLoading, setZipLoading] = useState(Boolean(initialZip));
  const [zipFailed, setZipFailed] = useState(false);
  const [zipNotice, setZipNotice] = useState<string | null>(null);
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
  const { replacePageContext, chat } = useAsk();
  const cancelAsk = chat.cancel;
  const { pendingYear, clearPendingYear } = useYearNavigation();
  const yearLock = useRef<number | null>(null);
  const zipEpoch = useRef(0);
  const manualZip = useRef(false);
  const yearChanging = pendingYear != null && pendingYear !== year;
  yearLock.current = yearChanging ? pendingYear : null;

  useEffect(() => {
    if (pendingYear != null && pendingYear === year) clearPendingYear();
  }, [clearPendingYear, pendingYear, year]);

  useEffect(() => {
    if (!yearChanging) return;
    zipEpoch.current += 1;
    manualZip.current = false;
    heldZip.current = null;
    setZipPayload(null);
    setZipLoading(false);
    setZipFailed(false);
    setZipNotice(null);
    setRememberedPostal(null);
    setHot(null);
    cancelAsk();
  }, [cancelAsk, yearChanging]);

  const listed = selected ? stateRaces(races, selected) : [];
  const yours =
    zipPayload && zipPayload.state === selected && zipPayload.zip === zipCode
      ? zipRaceSlots(races, zipPayload)
      : [];
  const yourIds = new Set(yours.map((slot) => slot.raceId));
  const pinYours = Boolean(zipCode && selected && !zipFailed && zipPayload && zipPayload.zip === zipCode);
  const zipRaceKey = pinYours ? yours.map((slot) => slot.raceId).join("\n") : "";

  useEffect(() => {
    const focused = zipRaceKey ? new Set(zipRaceKey.split("\n")) : null;
    const scopedRaces = focused ? races.filter((race) => focused.has(race.raceId)) : races;
    const scope = selected ? askScopeForState(year, selected, scopedRaces) : askScopeForYear(year);
    const page = pageContextFromScope(scope);
    return replacePageContext({
      ...page,
      ...(zipCode ? { zip: zipCode } : {}),
    });
  }, [replacePageContext, races, selected, year, zipCode, zipRaceKey]);

  const syncFromLocation = useCallback(() => {
    const postal = postalFromSearch(window.location.search);
    const zip = zipFromSearch(window.location.search);
    setSelected(postal);
    setZipCode(zip);
    setRememberedPostal((current) => nextRememberedPostal(postal, zip, current));
    setHot(null);
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

  const writeUrl = useCallback((search: string) => {
    if (yearLock.current != null) return;
    const next = `${window.location.pathname}${search}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history.pushState(null, "", next);
  }, []);

  useEffect(() => {
    if (manualZip.current || yearLock.current != null) return;
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
      setZipNotice(null);
      return;
    }
    const epoch = zipEpoch.current;
    let active = true;
    setZipLoading(true);
    setZipFailed(false);
    setZipNotice(null);
    setZipPayload(null);
    (async () => {
      try {
        const result = await settleZipLookup((lookupZip ?? findRacesByZip)(zipCode, year));
        if (!active || zipEpoch.current !== epoch) return;
        if (!result.ok || result.payload.state !== selected) {
          const clearMap = result.ok || zipFailureClearsSelection(result.reason);
          heldZip.current = null;
          setZipPayload(null);
          setZipFailed(true);
          setZipNotice(zipFailureNotice(result));
          setRememberedPostal(null);
          setHot(null);
          if (clearMap) writeUrl(searchWithoutState(window.location.search));
          return;
        }
        heldZip.current = result.payload;
        setZipPayload(result.payload);
        setZipNotice(null);
      } catch {
        if (!active || zipEpoch.current !== epoch) return;
        heldZip.current = null;
        setZipPayload(null);
        setZipFailed(true);
        setZipNotice("That ZIP didn't match.");
        setRememberedPostal(null);
        setHot(null);
        writeUrl(searchWithoutState(window.location.search));
      } finally {
        if (active && zipEpoch.current === epoch) setZipLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [lookupZip, selected, writeUrl, year, zipCode]);
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
  }, [candidateRaceKey, emptyIdsKey, reloadKey, year]);

  const retryRace = useCallback((raceId: string) => {
    setEntries((prev) => {
      if (!prev.has(raceId)) return prev;
      const next = new Map(prev);
      next.delete(raceId);
      return next;
    });
    setReloadKey((key) => key + 1);
  }, []);

  const selectState = useCallback(
    (postal: string) => {
      heldZip.current = null;
      setZipNotice(null);
      writeUrl(searchWithState(window.location.search, postal));
    },
    [writeUrl],
  );

  const beginZipLookup = useCallback(() => {
    if (yearLock.current != null) return;
    zipEpoch.current += 1;
    manualZip.current = true;
    heldZip.current = null;
    setZipPayload(null);
    setZipFailed(false);
    setZipNotice(null);
    setZipLoading(true);
  }, []);

  const openZip = useCallback(
    (payload: ZipLookupPayload) => {
      manualZip.current = false;
      if (yearLock.current != null || !payload.state) return;
      heldZip.current = payload;
      setZipNotice(null);
      setZipLoading(false);
      writeUrl(searchWithZip(window.location.search, payload.state, payload.zip));
    },
    [writeUrl],
  );

  const backToMap = useCallback(() => {
    zipEpoch.current += 1;
    manualZip.current = false;
    heldZip.current = null;
    setZipPayload(null);
    setZipLoading(false);
    setZipFailed(false);
    setZipNotice(null);
    setHot(null);
    setRememberedPostal(null);
    writeUrl(searchWithoutState(window.location.search));
  }, [writeUrl]);

  const rejectZip = useCallback(() => {
    zipEpoch.current += 1;
    manualZip.current = false;
    heldZip.current = null;
    setZipPayload(null);
    setZipLoading(false);
    setZipFailed(false);
    setZipNotice(null);
    setHot(null);
    setRememberedPostal(null);
    writeUrl(searchWithoutState(window.location.search));
  }, [writeUrl]);

  const preserve = useCallback(
    (path: string) => withPreservedQuery(path, { year, state: selected, zip: zipCode }),
    [selected, year, zipCode],
  );

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

  const mapContext: MapContext = { year, state: selected, zip: zipCode };
  const mapPostal = highlightedPostal(selected, rememberedPostal);
  const yearLoading = pendingYear != null && pendingYear !== year;

  if (yearLoading) {
    return (
      <div className="year-loading" data-testid="year-loading" role="status">
        <p>Loading {pendingYear}…</p>
      </div>
    );
  }

  return (
    <div className={selected ? "state-shell" : "national-shell"}>
      <div className="zip-slot">
        <ZipLookup
          year={year}
          fieldKey={selected ?? "national"}
          onFound={openZip}
          onLookupStart={beginZipLookup}
          onPickState={pickState}
          onReject={rejectZip}
          lookup={lookupZip}
        />
        {!selected && zipNotice ? (
          <p className="zip-status" role="status">
            {zipNotice}
          </p>
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
          zipNotice={zipNotice}
          yours={yours}
          showAll={showAll}
          onShowAll={() => setShowAll(true)}
          onBack={backToMap}
          onSheetDismiss={pinYours ? null : backToMap}
          onLeave={backToMap}
          onRetryRace={retryRace}
          preserve={preserve}
        />
      ) : null}

      {selected ? (
        <DistrictMap
          postal={selected}
          races={races}
          year={year}
          yourDistricts={pinYours ? houseCodes(yours) : []}
          context={mapContext}
        />
      ) : (
        <div className="map-bleed" data-testid="national-map">
          <div className="map-stage">
            <h1 className="sr-only">Find races on the map</h1>
            <UsMap
              mapId="hero-map"
              labelled
              selected={mapPostal}
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
          </div>
          <div className="map-bottom-dock">
            <div className="map-meta-dock">
              <DataRefreshedBanner refreshedAt={refreshedAt} compact />
            </div>
            <div className="map-legend-dock">
              <MapLegend />
            </div>
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
  zipNotice,
  yours,
  showAll,
  onShowAll,
  onBack,
  onSheetDismiss,
  onLeave,
  onRetryRace,
  preserve,
}: {
  year: number;
  races: readonly Race[];
  postal: string;
  refreshedAt?: string | null;
  cache: Map<string, CandidateCacheEntry>;
  pinYours: boolean;
  zipLoading: boolean;
  zipFailed: boolean;
  zipNotice: string | null;
  yours: ReturnType<typeof zipRaceSlots>;
  showAll: boolean;
  onShowAll: () => void;
  /** Country map. Shown after a state tap and after a ZIP visit. */
  onBack: () => void;
  /** Drag past the peek. Null on a ZIP visit so the sheet stops at peek and keeps the ZIP. */
  onSheetDismiss: (() => void) | null;
  onLeave: () => void;
  onRetryRace: (raceId: string) => void;
  preserve: (path: string) => string;
}) {
  const name = stateName(postal);
  const board = stateScoreboard(races, postal, year);
  const listed = stateRaces(races, postal);
  const senatePeople = senateCandidateCount(listed, (raceId) => {
    const entry = cache.get(raceId);
    if (!entry) return undefined;
    return entry.ok ? entry.candidates.length : null;
  });
  const yourIds = new Set(yours.map((slot) => slot.raceId));
  const rest = listed.filter((race) => !yourIds.has(race.raceId));
  const showFull = !pinYours || showAll;
  const sheet = useMobileSheet(onSheetDismiss, postal);

  return (
    <div
      ref={sheet.sheetRef}
      className="state-overview"
      data-testid="state-page"
      onPointerDown={sheet.onPointerDown}
      onPointerMove={sheet.onPointerMove}
      onPointerUp={sheet.onPointerUp}
      onPointerCancel={sheet.onPointerUp}
    >
      <div className="back-chrome">
        <div
          className="sheet-grab"
          role="slider"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Drag down to shrink the sheet and see the map"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={1}
          onKeyDown={sheet.onKeyDown}
        >
          <span className="drawer-handle" aria-hidden="true" />
        </div>
        <div className="back-chrome-row">
          <button type="button" onClick={onBack} data-testid="back-to-map" className="back-link">
            <span aria-hidden="true">← </span>
            Back to map
          </button>
          <h1 className="state-title">{name}</h1>
        </div>
      </div>
      <div className="state-sheet-body">
      <p className="state-year">{year}</p>
      <StateScoreboard board={board} senatePeople={senatePeople} />
      <div className="state-sheet-notes" data-testid="state-sheet-notes">
        <p className="text-sm leading-6 text-ink">{federalScopeLine()}</p>
        <p className="text-sm leading-6 text-muted">{ballotVersusFilingLine(year)}</p>
        <DataRefreshedBanner refreshedAt={refreshedAt} compact />
      </div>
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
          {yours.filter((slot) => slot.office === "house").length >= 2 ? (
            <p className="mt-2 text-sm leading-6 text-ink" data-testid="split-zip">
              {splitZipLine()}
            </p>
          ) : null}
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
                            catalog={listed}
                            preserve={preserve}
                            racesAnchor={pinYours}
                          />
                        ) : (
                          <li key={slot.raceId} className="race-row">
                            <h4 className="font-semibold tracking-tight text-ink">
                              <Link
                                href={preserve(`/races/${slot.raceId}`)}
                                className="race-title text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                              >
                                <span>{zipSlotTitle(slot, postal)}</span>
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
                            {slot.office === "house" ? (
                              <EmptyHouseLink
                                race={{
                                  raceId: slot.raceId,
                                  office: slot.office,
                                  state: postal,
                                  cycle: year,
                                  district: slot.district,
                                  empty: true,
                                }}
                                catalog={listed}
                                preserve={preserve}
                                racesAnchor={pinYours}
                              />
                            ) : null}
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
          <p className="zip-status">{zipNotice ?? "That ZIP didn't match."}</p>
          <button type="button" className="zip-pick" onClick={onLeave}>
            Tap a state on the map
          </button>
        </div>
      ) : null}
      {showFull ? (
        <RaceGroups
          postal={postal}
          races={showAll ? rest : listed}
          catalog={listed}
          cache={cache}
          onRetryRace={onRetryRace}
          heading={showAll ? `All ${name} races` : null}
          preserve={preserve}
          racesAnchor={pinYours}
        />
      ) : null}
      </div>
    </div>
  );
}

function RaceGroups({
  postal,
  races,
  catalog,
  cache,
  onRetryRace,
  heading,
  preserve,
  racesAnchor,
}: {
  postal: string;
  races: Race[];
  catalog: readonly Race[];
  cache: Map<string, CandidateCacheEntry>;
  onRetryRace: (raceId: string) => void;
  heading: string | null;
  preserve: (path: string) => string;
  racesAnchor: boolean;
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
                catalog={catalog}
                preserve={preserve}
                racesAnchor={racesAnchor}
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
  catalog,
  preserve,
  racesAnchor,
}: {
  race: Race;
  candidates: CandidateCacheEntry | undefined;
  onRetry: () => void;
  catalog: readonly Race[];
  preserve: (path: string) => string;
  racesAnchor: boolean;
}) {
  return (
    <li className="race-row">
      <h4 className="font-semibold tracking-tight">
        <Link
          href={preserve(`/races/${race.raceId}`)}
          className="race-title text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span>{race.title}</span>
          {race.empty === true ? null : <DetailsCue />}
        </Link>
      </h4>
      <OfficeLine office={race.office} district={race.district} />
      {placeLine(race.title, race.jurisdiction) ? (
        <p className="text-sm text-muted">{race.jurisdiction}</p>
      ) : null}
      {candidates?.ok && candidates.candidates.length > 0 ? (
        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
          {candidatesSoFarLine(candidates.candidates.length)}
        </p>
      ) : null}
      <CandidateList race={race} entry={candidates} onRetry={onRetry} preserve={preserve} />
      {race.empty === true && race.office === "house" ? (
        <EmptyHouseLink race={race} catalog={catalog} preserve={preserve} racesAnchor={racesAnchor} />
      ) : null}
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
  preserve,
}: {
  race: Race;
  entry: CandidateCacheEntry | undefined;
  onRetry: () => void;
  preserve: (path: string) => string;
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
              href={preserve(`/candidates/${candidate.candidateId}`)}
              filingCount={candidate.alternateFilingCount + 1}
              updatedAt={candidate.updatedAt}
              filingNote={personFilingNote(candidate.filings)}
            />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-1 text-sm text-muted">
          <Link
            href={preserve(`/races/${race.raceId}`)}
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

function EmptyHouseLink({
  race,
  catalog,
  preserve,
  racesAnchor,
}: {
  race: Pick<Race, "office" | "state" | "cycle" | "district" | "raceId" | "empty">;
  catalog: readonly Race[];
  preserve: (path: string) => string;
  racesAnchor: boolean;
}) {
  const step = emptyHouseNext(race, catalog);
  if (!step && !racesAnchor) return null;
  const href = step ? preserve(`/races/${step.raceId}`) : "#your-races";
  return (
    <p className="mt-2">
      <Link
        href={href}
        className="tap-link text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {step ? step.label : "Back to Your races"}
      </Link>
    </p>
  );
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

function zipFailureNotice(result: ZipLookupResult): string {
  if (!result.ok && result.reason === "timeout") return "That lookup took too long.";
  if (!result.ok && result.reason === "unavailable") return "ZIP lookup isn't available right now.";
  if (!result.ok && result.reason === "bad_request") return "Enter a 5-digit ZIP.";
  return "That ZIP didn't match.";
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
