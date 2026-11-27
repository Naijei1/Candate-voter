"use client";

import Link from "next/link";
import { useEffect } from "react";
import { shouldPlayFilm } from "@/lib/site/film";
import { placeName } from "./device";
import { usePlace } from "./Yours";

/** Pauses the hero's line drawing while it is off screen or the tab is hidden. */
export function HeroPause({ targetId }: { targetId: string }) {
  useEffect(() => {
    const hero = document.getElementById(targetId);
    if (!hero) return;
    let onScreen = true;
    const sync = () => hero.classList.toggle("is-off", !shouldPlayFilm({ tabHidden: document.hidden, heroOnScreen: onScreen }));
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            sync();
          })
        : null;
    observer?.observe(hero);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [targetId]);
  return null;
}

export function HeroSavedLine() {
  const place = usePlace();
  if (!place) return null;
  return (
    <p className="hero-n">
      Saved on this device: <b>{placeName(place)}</b>. <Link href="/ballot?change=1">Change</Link>
    </p>
  );
}
