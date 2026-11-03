"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DistrictMap } from "@/components/DistrictMap";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup } from "@/lib/lookup/zip-view";
import type { BallotCard } from "@/lib/site/ky-ballot";
import { kyBallotSeed } from "@/lib/site/ky-ballot";

export function BallotHub({ cards }: { cards: BallotCard[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const district = params.get("district");
  const zip = params.get("zip");
  const [draft, setDraft] = useState(zip ?? "");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const shown = cards.filter((card) => card.office === "senate" || !district || card.district === district);
  const houseRaces = kyBallotSeed().races.filter((race) => race.office === "house");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNote(null);
    try {
      const result = await settleZipLookup(findRacesByZip(draft, 2026));
      if (!result.ok) {
        setNote(result.reason === "not_found" ? "No district for that ZIP. Tap the map." : "ZIP lookup is unavailable. Tap your district on the map.");
        return;
      }
      if (result.payload.state !== "KY") {
        setNote("That ZIP is outside Kentucky. This ballot is Kentucky only.");
        return;
      }
      if (result.payload.districts.length !== 1) {
        setNote("This ZIP covers more than one U.S. House district. Tap the map.");
        return;
      }
      const found = result.payload.districts[0]?.district;
      if (!found) {
        setNote("No district for that ZIP. Tap the map.");
        return;
      }
      router.replace(`/?state=KY&year=2026&zip=${result.payload.zip}&district=${found}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form className="finder" onSubmit={onSubmit}>
        <div className="finder-row">
          <label htmlFor="zip">
            ZIP code
            <input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" placeholder="40502" value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <button className="btn btn-cta" type="submit" disabled={pending}>
            {pending ? "Looking up…" : "See my ballot"}
          </button>
        </div>
        <p className="hint">A ZIP finds your U.S. House district. It is not your full local ballot.</p>
        {note ? <p className="notice" role="status">{note}</p> : null}
      </form>

      <h2>Map</h2>
      <p className="hint">Tap a district. Numbers are the U.S. House districts. No ZIP required.</p>
      <DistrictMap postal="KY" races={houseRaces} year={2026} yourDistricts={district ? [district] : []} context={{ year: 2026, state: "KY", zip }} />

      <h2>{district ? `Your races · District ${Number(district)}` : "Kentucky federal races"}</h2>
      {!district ? <p className="hint">Add a ZIP to keep only your U.S. House district. The Senate race is statewide.</p> : null}
      <ul className="card-grid">
        {shown.map((card) => (
          <li className="card" key={card.raceId}>
            <h3>{card.title}</h3>
            <ul className="plain-list">
              {card.people.map((person) => (
                <li key={person.id}>
                  <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                  <span className="hint">
                    {" "}
                    {person.party}. {person.line}
                    {person.raised ? `. Raised ${person.raised}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p>
              <Link className="btn btn-navy" href={`/races/${card.raceId}/compare`}>
                Compare
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <p className="hint">
        State House and State Senate names are on the{" "}
        <a href="https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3">Secretary of State filing list</a>. A ZIP
        does not tell us your legislative district, so those races stay off this ballot.
      </p>
    </div>
  );
}
