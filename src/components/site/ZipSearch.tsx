"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StatusMark } from "@/components/site/StatusMark";
import { stateName } from "@/lib/data/states";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup, type ZipLookupResult } from "@/lib/lookup/zip-view";

const YEAR = 2026;

export function ZipSearch() {
  const [zip, setZip] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ZipLookupResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      setResult(await settleZipLookup(findRacesByZip(zip, YEAR)));
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="find" className="finder" onSubmit={onSubmit}>
      <div className="finder-row">
        <label htmlFor="zip">
          ZIP code
          <input
            id="zip"
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="40502"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
          />
        </label>
        <button className="btn btn-cta" type="submit" disabled={pending}>
          {pending ? "Looking up…" : "Find races"}
        </button>
      </div>
      <p className="hint">
        <StatusMark kind="preview" hint="A ZIP shows congressional districts, not a full ballot." />
        Congressional districts only.
      </p>
      {pending ? <p role="status">Looking up…</p> : null}
      {result ? <ZipResult result={result} /> : null}
    </form>
  );
}

function ZipResult({ result }: { result: ZipLookupResult }) {
  if (!result.ok) {
    const message =
      result.reason === "not_found"
        ? "No district for that ZIP."
        : result.reason === "timeout"
          ? "Lookup timed out."
          : result.reason === "bad_request"
            ? (result.message ?? "Enter a 5-digit ZIP.")
            : "Lookup unavailable.";
    return (
      <p className="notice notice-error" role="status">
        {message} <Link href="/states">Choose a state</Link>
      </p>
    );
  }
  const { payload } = result;
  const place = payload.state ? stateName(payload.state) : "";
  return (
    <div className="notice" role="status">
      <p>
        <StatusMark kind="preview" hint="Not a full personal ballot." />
        {payload.zip}
        {place ? ` · ${place}` : ""}
        {payload.districts.length > 1 ? " · more than one district" : ""}
      </p>
      <ul className="result-links">
        {payload.senateRaceId ? (
          <li>
            <Link href={`/races/${payload.senateRaceId}`}>U.S. Senate</Link>
          </li>
        ) : null}
        {payload.districts.map((district) => (
          <li key={district.raceId}>
            <Link href={`/races/${district.raceId}`}>
              House {district.district === "00" ? "at large" : Number(district.district)}
            </Link>
          </li>
        ))}
      </ul>
      {payload.state ? <Link href={`/states/${payload.state.toLowerCase()}`}>All {place} contests</Link> : null}
    </div>
  );
}
