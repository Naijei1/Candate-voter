"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useState } from "react";
import { findRacesByZip } from "@/lib/lookup/find-races";
import {
  normalizeZip,
  type ZipLookupPayload,
  type ZipLookupResult,
} from "@/lib/lookup/zip-view";

export const ZIP_PROMPT = "Enter ZIP to find your races";
export const ZIP_FAIL = "Check ZIP or tap a state.";

export function ZipLookup({
  year,
  onFound,
  lookup = findRacesByZip,
}: {
  year: number;
  onFound: (payload: ZipLookupPayload) => void;
  /** Defaults to the live `GET /api/v1/lookup/zip` action. */
  lookup?: (zip: string, year: number) => Promise<ZipLookupResult>;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(raw: string) {
    const zip = normalizeZip(raw);
    if (!zip) {
      setFailed(true);
      return;
    }
    setPending(true);
    setFailed(false);
    setValue(zip);
    try {
      const result = await lookup(zip, year);
      if (!result.ok || !result.payload.state) {
        setFailed(true);
        return;
      }
      onFound(result.payload);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
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
        <button type="submit" disabled={pending}>
          {pending ? "Looking up…" : "Go"}
        </button>
      </form>
      <div aria-live="polite">
        {pending ? (
          <p className="zip-status" aria-busy="true">
            Looking up races for {normalizeZip(value) ?? "that ZIP"}…
          </p>
        ) : null}
        {failed && !pending ? (
          <p id="zip-error" data-testid="zip-error" className="zip-status">
            {ZIP_FAIL}
          </p>
        ) : null}
      </div>
    </div>
  );
}
