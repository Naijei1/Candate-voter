"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { placeHref, placeName } from "./device";
import { usePlace } from "./Yours";

export type MoneyRace = { key: string; label: string };

/** Shows the Senate race and the saved House districts first. Other races are one tap away. */
export function MoneyFilter({ races, sets }: { races: MoneyRace[]; sets: Record<string, ReactNode> }) {
  const place = usePlace();
  const [shown, setShown] = useState<string[]>(["senate"]);

  useEffect(() => {
    setShown(place ? ["senate", ...place.d.map(String)] : ["senate"]);
  }, [place]);

  const toggle = (key: string) => setShown((now) => (now.includes(key) ? now.filter((row) => row !== key) : [...now, key]));

  return (
    <>
      <div className="mfil">
        {place ? (
          <p>
            Showing races for <b>{placeName(place)}</b>. <Link href="/ballot?change=1">Change county</Link>
          </p>
        ) : (
          <p>
            <Link href={placeHref(null)}>Pick your county</Link> to see only your races.
          </p>
        )}
        <div className="quick" role="group" aria-label="Races shown">
          {races.map((race) => (
            <button key={race.key} className="chip" type="button" aria-pressed={shown.includes(race.key)} onClick={() => toggle(race.key)}>
              {race.label}
            </button>
          ))}
        </div>
      </div>
      {races
        .filter((race) => shown.includes(race.key))
        .map((race) => (
          <div key={race.key}>{sets[race.key]}</div>
        ))}
      {shown.length === 0 ? <p className="none">Pick a race above.</p> : null}
    </>
  );
}
