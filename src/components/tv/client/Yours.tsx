"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { PLACE_EVENT, placeHref, placeName, readPlace, type Place } from "./device";

export function usePlace(): Place | null {
  const [place, setPlace] = useState<Place | null>(null);
  useEffect(() => {
    const sync = () => setPlace(readPlace());
    sync();
    window.addEventListener(PLACE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PLACE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return place;
}

/** Links to My races; opens the saved county when there is one. */
export function YoursLink({ className, children, ...rest }: { className?: string; children: ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const place = usePlace();
  return (
    <Link className={className} href={placeHref(place)} {...rest}>
      {children}
    </Link>
  );
}

/** Hero call to action: "Find my races", or "See my races" once a county is saved. */
export function YoursCta({ className }: { className?: string }) {
  const place = usePlace();
  return (
    <Link className={className} href={placeHref(place)}>
      <span>{place ? "See my races" : "Find my races"}</span>
      <Icon name="arrow" size="sm" />
    </Link>
  );
}

/** "Your races: Fayette County, District 6" under the breadcrumb. Hidden until a county is saved. */
export function YoursContext() {
  const place = usePlace();
  if (!place) return null;
  return (
    <p className="yctx">
      <span>
        Your races: <b>{placeName(place)}</b>
      </span>
      <Link href={placeHref(place)}>My races</Link>
      <Link href="/ballot?change=1">Change county</Link>
    </p>
  );
}

/** Marks rows that match the saved districts. */
export function useYourDistricts(): number[] {
  return usePlace()?.d ?? [];
}
