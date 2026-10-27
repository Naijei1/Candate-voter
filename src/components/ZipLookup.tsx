"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState, type ReactNode } from "react";
import { emptyDistrictSentence, emptySenateSentence } from "@/lib/copy";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { stateName } from "@/lib/data/states";
import { officeLabel } from "@/lib/format";
import {
  normalizeZip,
  zipFailureClearsSelection,
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
  onReject,
  onStoredRaceIds,
  renderStoredRace,
  renderLayout,
  lookup = findRacesByZip,
}: {
  year: number;
  races: readonly Race[];
  onState: (postal: string) => void;
  /** Bad ZIP (unknown or not 5 digits). Clears a selection this lookup had applied. */
  onReject?: () => void;
  /** Defaults to the live `GET /api/v1/lookup/zip` action. */
  lookup?: (zip: string, year: number) => Promise<ZipLookupResult>;
  onStoredRaceIds: (raceIds: string[]) => void;
  renderStoredRace: (race: Race) => ReactNode;
  /** Places the form and the result so the page can keep one flow. */
  renderLayout?: (slots: { form: ReactNode; status: ReactNode }) => ReactNode;
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

  function finish(next: ZipLookupResult) {
    setResult(next);
    if (!next.ok && zipFailureClearsSelection(next.reason)) onReject?.();
  }

  async function runLookup(zip: string) {
    setPending(true);
    setResult(null);
    try {
      finish(await lookup(zip, year));
    } catch {
      setResult({ ok: false, reason: "unavailable", message: null });
    } finally {
      setPending(false);
    }
  }

  function submit(zipInput: string) {
    const zip = normalizeZip(zipInput);
    if (!zip) {
      finish({ ok: false, reason: "bad_request", message: "Enter a 5-digit ZIP code." });
      return;
    }
    setValue(zip);
    setAttempt((count) => count + 1);
    void runLookup(zip);
  }

  const form = (
    <form
      data-testid="zip-lookup"
      className="rounded-2xl border border-line bg-card p-4 shadow-sm"
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
        Enter a ZIP code for the Senate race and House district.
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
  );

  const showRetry = result != null && !result.ok && !zipFailureClearsSelection(result.reason);
  const status = (
    <div aria-live="polite">
      {pending ? (
        <p className="text-sm text-muted" aria-busy="true">
          Looking up races for {normalizeZip(value) ?? "that ZIP"}…
        </p>
      ) : null}
      {!pending && result && !result.ok ? (
        <div data-testid="zip-error" className="rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-sm leading-6 text-ink">{zipLookupErrorCopy(result)}</p>
          {showRetry ? (
            <button
              type="button"
              data-testid="zip-retry"
              onClick={() => submit(value)}
              className="mt-2 rounded-md border border-line bg-card px-2.5 py-1 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Retry
            </button>
          ) : null}
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
  );

  if (renderLayout) return renderLayout({ form, status });

  return (
    <div className="mt-5 space-y-4">
      {form}
      {status}
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
                        <p className="mt-1 text-sm text-ink">
                          {slot.office === "senate"
                            ? emptySenateSentence()
                            : emptyDistrictSentence(slot.district)}
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
    </section>
  );
}
