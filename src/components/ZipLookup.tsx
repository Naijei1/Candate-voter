"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState, type ReactNode } from "react";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { stateName } from "@/lib/data/states";
import { officeLabel } from "@/lib/format";
import {
  normalizeZip,
  zipLookupErrorCopy,
  zipRaceSlots,
  zipSlotJurisdiction,
  zipSlotTitle,
  type ZipLookupResult,
  type ZipRaceSlot,
} from "@/lib/lookup/zip-view";
import type { Race } from "@/lib/types";

export function ZipLookup({
  year,
  races,
  onState,
  onStoredRaceIds,
  renderStoredRace,
}: {
  year: number;
  races: readonly Race[];
  onState: (postal: string) => void;
  onStoredRaceIds: (raceIds: string[]) => void;
  renderStoredRace: (race: Race) => ReactNode;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ZipLookupResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const slots = result?.ok ? zipRaceSlots(races, result.payload) : [];
  const storedKey = slots
    .flatMap((slot) => (slot.race ? [slot.race.raceId] : []))
    .join("\n");
  const resultState = result?.ok ? result.payload.state : null;

  useEffect(() => {
    onStoredRaceIds(storedKey ? storedKey.split("\n") : []);
  }, [onStoredRaceIds, storedKey]);

  useEffect(() => {
    if (resultState) onState(resultState);
  }, [onState, resultState]);

  async function lookup(zip: string) {
    setPending(true);
    setResult(null);
    try {
      const next = await findRacesByZip(zip, year);
      setResult(next);
    } catch {
      setResult({ ok: false, reason: "unavailable", message: null });
    } finally {
      setPending(false);
    }
  }

  function submit(zipInput: string) {
    const zip = normalizeZip(zipInput);
    if (!zip) {
      setResult({ ok: false, reason: "bad_request", message: "Enter a 5-digit ZIP code." });
      return;
    }
    setValue(zip);
    setAttempt((count) => count + 1);
    void lookup(zip);
  }

  return (
    <div className="mt-5">
      <form
        data-testid="zip-lookup"
        className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          submit(value);
        }}
      >
        <label htmlFor="find-zip" className="text-lg font-semibold tracking-tight text-ink">
          Find my races
        </label>
        <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
          Enter a ZIP code for the Senate race and House district. We only show what the lookup returns.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="find-zip"
            data-testid="zip-input"
            name="zip"
            value={value}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            placeholder="ZIP code"
            disabled={pending}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-lg border border-line bg-card px-3 py-3 text-lg text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 sm:max-w-xs"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? "Looking up…" : "Find my races"}
          </button>
        </div>
      </form>
      <div className="mt-4" aria-live="polite">
        {pending ? (
          <p className="text-sm text-muted" aria-busy="true">
            Looking up races for {normalizeZip(value) ?? "that ZIP"}…
          </p>
        ) : null}
        {!pending && result && !result.ok ? (
          <div className="rounded-xl border border-line bg-card px-4 py-3">
            <p className="text-sm leading-6 text-ink">{zipLookupErrorCopy(result)}</p>
            <button
              type="button"
              data-testid="zip-retry"
              onClick={() => submit(value)}
              className="mt-2 rounded-md border border-line bg-card px-2.5 py-1 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Retry
            </button>
          </div>
        ) : null}
        {!pending && result?.ok ? (
          <ZipResults
            key={attempt}
            year={result.payload.year}
            zip={result.payload.zip}
            state={result.payload.state}
            slots={slots}
            renderStoredRace={renderStoredRace}
          />
        ) : null}
      </div>
    </div>
  );
}

function ZipResults({
  year,
  zip,
  state,
  slots,
  renderStoredRace,
}: {
  year: number;
  zip: string;
  state: string | null;
  slots: ZipRaceSlot[];
  renderStoredRace: (race: Race) => ReactNode;
}) {
  const place = state ? `${stateName(state)} · ${zip}` : zip;
  return (
    <section data-testid="zip-results" aria-labelledby="zip-results-heading">
      <h2 id="zip-results-heading" className="text-lg font-semibold tracking-tight text-ink">
        Your races
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {place} · {year}. Candidates so far, not the final ballot.
      </p>
      {slots.length === 0 ? (
        <p className="mt-3 text-sm text-ink">No Senate or House race came back for this ZIP.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {(["senate", "house"] as const).map((office) => {
            const group = slots.filter((slot) => slot.office === office);
            if (group.length === 0) return null;
            return (
              <section key={office} aria-label={officeLabel(office)}>
                <h3 className="text-xs font-semibold tracking-wide text-accent uppercase">
                  {officeLabel(office)}
                </h3>
                <ul className="mt-2 space-y-2">
                  {group.map((slot) =>
                    slot.race ? (
                      <React.Fragment key={slot.raceId}>{renderStoredRace(slot.race)}</React.Fragment>
                    ) : (
                      <li
                        key={slot.raceId}
                        className="rounded-lg border border-l-4 border-line border-l-accent bg-card px-3 py-3"
                      >
                        <h4 className="font-semibold tracking-tight text-ink">
                          {zipSlotTitle(slot, state)}
                        </h4>
                        {zipSlotJurisdiction(slot, state) ? (
                          <p className="text-sm text-muted">{zipSlotJurisdiction(slot, state)}</p>
                        ) : null}
                        <p className="mt-1 text-sm text-muted">No filings stored yet.</p>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
