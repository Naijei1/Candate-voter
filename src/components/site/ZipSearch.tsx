"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StatusMark } from "@/components/site/StatusMark";
import { stateName } from "@/lib/data/states";
import { districtFromAddress } from "@/lib/geo/address-district";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup, type ZipLookupPayload, type ZipLookupResult } from "@/lib/lookup/zip-view";
import { withPlace } from "@/lib/place/selection";

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
  return <ZipMatches payload={result.payload} />;
}

function ZipMatches({ payload }: { payload: ZipLookupPayload }) {
  const [picked, setPicked] = useState<string | null>(payload.districts.length === 1 ? payload.districts[0]?.district ?? null : null);
  const [note, setNote] = useState<string | null>(null);
  const place = payload.state ? stateName(payload.state) : "";
  const shown = picked ? payload.districts.filter((district) => district.district === picked) : payload.districts;
  const location = {
    state: payload.state,
    year: payload.year,
    zip: payload.zip,
    district: picked,
  };

  async function onAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const street = String(form.get("street") ?? "");
    const city = String(form.get("city") ?? "");
    event.currentTarget.reset();
    const found = await districtFromAddress({
      street,
      city,
      state: payload.state ?? "",
      zip: payload.zip,
    });
    if (!found.ok) {
      setNote(found.message);
      return;
    }
    setPicked(found.district);
    setNote(`District ${Number(found.district)}. The address was not saved.`);
  }

  return (
    <div className="notice" role="status">
      <p>
        <StatusMark kind="preview" hint="Not a full personal ballot." />
        {payload.zip}
        {place ? ` · ${place}` : ""}
      </p>
      {payload.districts.length > 1 ? (
        <form className="finder" onSubmit={onAddress}>
          <p>
            This ZIP includes more than one congressional district because a ZIP area can cross district lines. A street
            address can pick one. It is sent only to the Census geocoder and is not saved.
          </p>
          <label htmlFor="street">
            Street
            <input id="street" name="street" autoComplete="off" />
          </label>
          <label htmlFor="city">
            City
            <input id="city" name="city" autoComplete="off" />
          </label>
          <button className="btn btn-navy" type="submit">
            Use this address once
          </button>
        </form>
      ) : null}
      {note ? <p>{note}</p> : null}
      <ul className="result-links">
        {payload.senateRaceId ? (
          <li>
            <Link href={withPlace(`/races/${payload.senateRaceId}`, location)}>U.S. Senate</Link>
          </li>
        ) : null}
        {shown.map((district) => (
          <li key={district.raceId}>
            <Link href={withPlace(`/races/${district.raceId}`, { ...location, district: district.district })}>
              House {district.district === "00" ? "at large" : Number(district.district)}
            </Link>
          </li>
        ))}
      </ul>
      {payload.state ? (
        <Link href={withPlace(`/states/${payload.state.toLowerCase()}`, location)}>All {place} contests</Link>
      ) : null}
    </div>
  );
}
