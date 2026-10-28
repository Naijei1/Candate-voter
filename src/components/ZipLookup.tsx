"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useRef, useState } from "react";
import { findRacesByZip } from "@/lib/lookup/find-races";
import {
  normalizeZip,
  settleZipLookup,
  type ZipLookupFailureReason,
  type ZipLookupPayload,
  type ZipLookupResult,
} from "@/lib/lookup/zip-view";

export const ZIP_PROMPT = "Enter ZIP to find your races";
export const ZIP_FAIL = "That ZIP didn't match.";
export const ZIP_PICK = "Tap a state on the map.";

export function ZipLookup({
  year,
  fieldKey = "",
  onFound,
  onLookupStart,
  onPickState,
  onReject,
  lookup = findRacesByZip,
}: {
  year: number;
  /**
   * Changes when the visitor leaves a state for the national map.
   * The typed ZIP is cleared in that render so Back does not keep 78701.
   */
  fieldKey?: string;
  onFound: (payload: ZipLookupPayload) => void;
  /** Fires when a 5-digit lookup starts, before the response. */
  onLookupStart?: () => void;
  /** Moves the visitor to the national map so they can tap a state. */
  onPickState?: () => void;
  /** A failed lookup should drop a country-map highlight left by an earlier visit. */
  onReject?: () => void;
  /** Defaults to the live `GET /api/v1/lookup/zip` action. */
  lookup?: (zip: string, year: number) => Promise<ZipLookupResult>;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failLead, setFailLead] = useState(ZIP_FAIL);
  const [trackedKey, setTrackedKey] = useState(fieldKey);
  const flight = useRef(0);
  useEffect(() => {
    return () => {
      flight.current += 1;
    };
  }, []);
  if (trackedKey !== fieldKey) {
    setTrackedKey(fieldKey);
    setValue("");
    setPending(false);
    flight.current += 1;
  }

  async function submit(raw: string) {
    const zip = normalizeZip(raw);
    if (!zip) {
      setFailLead("Enter a 5-digit ZIP.");
      setFailed(true);
      onReject?.();
      return;
    }
    const id = flight.current + 1;
    flight.current = id;
    setPending(true);
    setFailed(false);
    setValue(zip);
    onLookupStart?.();
    try {
      const result = await settleZipLookup(lookup(zip, year));
      if (flight.current !== id) return;
      if (!result.ok || !result.payload.state) {
        setFailLead(result.ok ? ZIP_FAIL : failLeadFor(result.reason));
        setFailed(true);
        onReject?.();
        return;
      }
      onFound(result.payload);
    } catch {
      if (flight.current !== id) return;
      setFailLead("ZIP lookup isn't available right now.");
      setFailed(true);
      onReject?.();
    } finally {
      if (flight.current === id) setPending(false);
    }
  }

  return (
    <div data-testid="zip-lookup">
      <form
        className="glass-zip"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          void submit(value);
        }}
      >
        <label htmlFor="find-zip" className="sr-only">
          {ZIP_PROMPT}
        </label>
        <input
          id="find-zip"
          data-testid="zip-input"
          name="zip"
          value={value}
          inputMode="numeric"
          autoComplete="postal-code"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="go"
          maxLength={5}
          placeholder={ZIP_PROMPT}
          disabled={pending}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? "zip-error" : undefined}
          onChange={(event) => {
            setFailed(false);
            setValue(event.target.value.replace(/\D/g, "").slice(0, 5));
          }}
        />
        <button
          type="submit"
          className="zip-go"
          disabled={pending}
          aria-label={pending ? "Looking up" : "Go"}
        >
          <svg
            viewBox="0 0 20 20"
            className="zip-go-icon"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 10h11M11 6l4 4-4 4" />
          </svg>
          <span className="zip-go-pending" aria-hidden="true">
            …
          </span>
          <span className="zip-go-label">{pending ? "Looking up…" : "Go"}</span>
        </button>
      </form>
      <div aria-live="polite">
        {pending ? (
          <p className="zip-status" aria-busy="true">
            Looking up races for {normalizeZip(value) ?? "that ZIP"}…
          </p>
        ) : null}
        {failed && !pending ? (
          <div id="zip-error" data-testid="zip-error" className="zip-guidance" role="status">
            <p className="zip-status">{failLead}</p>
            <button type="button" data-testid="zip-pick-state" className="zip-pick" onClick={onPickState}>
              {ZIP_PICK}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function failLeadFor(reason: ZipLookupFailureReason): string {
  if (reason === "not_found") return ZIP_FAIL;
  if (reason === "bad_request") return "Enter a 5-digit ZIP.";
  if (reason === "timeout") return "That lookup took too long.";
  if (reason === "bad_response") return "The lookup didn't return races we can show.";
  return "ZIP lookup isn't available right now.";
}
