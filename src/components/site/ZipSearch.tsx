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
            aria-describedby="zip-help"
          />
        </label>
        <button className="btn btn-cta" type="submit" disabled={pending}>
          {pending ? "Looking up…" : "Find congressional districts"}
        </button>
      </div>
      <p id="zip-help">
        A ZIP can point to a congressional district. It is not a confirmed personal ballot.
        State and local contests need a state, and sometimes an address, which this preview does
        not store.
      </p>
      {pending ? (
        <p role="status" aria-busy="true">
          Looking up congressional districts…
        </p>
      ) : null}
      {result ? <ZipResult result={result} /> : null}
    </form>
  );
}

function ZipResult({ result }: { result: ZipLookupResult }) {
  if (!result.ok) {
    const message =
      result.reason === "not_found"
        ? "No congressional district is published for that ZIP."
        : result.reason === "timeout"
          ? "The lookup did not finish in time."
          : result.reason === "bad_request"
            ? (result.message ?? "Enter a 5-digit ZIP code.")
            : "Congressional district lookup is unavailable.";
    return (
      <div className="notice notice-error" role="status">
        <p>{message} Choose a state from the list below. Nothing was saved.</p>
      </div>
    );
  }
  const { payload } = result;
  const place = payload.state ? stateName(payload.state) : "that area";
  return (
    <div className="notice" role="status">
      <p>
        Congressional districts for ZIP {payload.zip}
        {payload.state ? ` in ${place}` : ""}. This is not your full ballot.
        {payload.districts.length > 1
          ? " This ZIP touches more than one House district. Each one is listed."
          : ""}
      </p>
      <ul>
        {payload.senateRaceId ? (
          <li>
            <Link href={`/races/${payload.senateRaceId}`}>U.S. Senate{payload.state ? `, ${place}` : ""}</Link>
          </li>
        ) : null}
        {payload.districts.map((district) => (
          <li key={district.raceId}>
            <Link href={`/races/${district.raceId}`}>
              U.S. House district {district.district === "00" ? "at large" : String(Number(district.district))}
            </Link>
          </li>
        ))}
      </ul>
      {payload.state ? (
        <p>
          <Link href={`/states/${payload.state.toLowerCase()}`}>Browse {place} contests</Link>
        </p>
      ) : null}
    </div>
  );
}

export function PreviewNote() {
  return (
    <p>
      <StatusMark kind="preview" />
      ZIP lookup uses the live congressional map when the service responds. It does not build a
      personal ballot.
    </p>
  );
}
