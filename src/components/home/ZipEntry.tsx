"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { districtFromPoint } from "@/lib/geo/address-district";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup } from "@/lib/lookup/zip-view";

export function ZipEntry() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openDistrict(entered: string, district: string) {
    const query = new URLSearchParams({ zip: entered, district, step: "races" });
    router.push(`/?${query.toString()}`);
  }

  async function lookupZip() {
    const entered = zip.trim();
    if (!entered) {
      setNote("Enter your 5-digit ZIP code.");
      return;
    }
    if (!/^\d{5}$/.test(entered)) {
      setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await settleZipLookup(findRacesByZip(entered, 2026));
      if (!result.ok) {
        setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
        return;
      }
      if (result.payload.state !== "KY") {
        setNote("That ZIP is outside Kentucky. This guide covers Kentucky only.");
        return;
      }
      if (result.payload.districts.length !== 1) {
        setNote("That ZIP covers more than one district. Pick it on the map.");
        return;
      }
      const found = result.payload.districts[0]?.district ?? null;
      if (!found) {
        setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
        return;
      }
      openDistrict(entered, found);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="hero-zip"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void lookupZip();
      }}
    >
      <label htmlFor="guide-zip">
        ZIP code
        <input
          id="guide-zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          pattern="[0-9]{5}"
          aria-invalid={note ? true : undefined}
          aria-describedby={note ? "zip-error" : "zip-hint"}
          value={zip}
          onChange={(event) => setZip(event.target.value)}
        />
      </label>
      <p id="zip-hint">5 digits, e.g. 40202. Kentucky only. A ZIP finds a U.S. House district. It is not your full local ballot.</p>
      <Button className="w-full" disabled={busy} type="submit">
        See my ballot
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setNote(null);
          if (!navigator.geolocation) {
            setNote("This browser cannot share a location. Enter a ZIP.");
            setBusy(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const found = await districtFromPoint({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              setBusy(false);
              if (!found.ok) {
                setNote(found.message);
                return;
              }
              openDistrict("", found.district);
            },
            () => {
              setBusy(false);
              setNote("Location was not shared. It was not saved.");
            },
            { enableHighAccuracy: false, timeout: 8000 },
          );
        }}
      >
        <MapPin className="size-5" /> Use my location
      </Button>
      <p>
        <Link href="/map">Pick on the map</Link>
      </p>
      {note ? (
        <p id="zip-error" role="alert" className="hero-error">
          {note}
        </p>
      ) : null}
    </form>
  );
}
