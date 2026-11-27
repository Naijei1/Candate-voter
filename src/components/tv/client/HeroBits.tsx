"use client";

import Link from "next/link";
import { useEffect } from "react";
import { placeName } from "./device";
import { usePlace } from "./Yours";

/** Pauses the hero's line drawing while it is off screen. */
export function HeroPause({ targetId }: { targetId: string }) {
  useEffect(() => {
    const hero = document.getElementById(targetId);
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => hero.classList.toggle("is-off", !entry.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
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
