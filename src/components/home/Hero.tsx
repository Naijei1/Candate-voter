"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { homeHero } from "@/config/brand";
import { districtFromPoint } from "@/lib/geo/address-district";
import { shouldPlayFilm } from "@/lib/site/film";

const MP4 = "/video/vote-hero.mp4";
const WEBM = "/video/vote-hero.webm";
const POSTER = "/video/vote-hero.jpg";

export function Hero() {
  const router = useRouter();
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = Boolean(connection?.saveData) || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g";
    if (reduce || slow) return;
    const start = () => setShowVideo(true);
    const idle = window.requestIdleCallback?.bind(window);
    if (idle) {
      const id = idle(start);
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(start, 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || !showVideo) return;
    video.muted = true;
    let onScreen = false;
    const play = () => {
      if (!shouldPlayFilm({ tabHidden: document.hidden, heroOnScreen: onScreen })) return;
      void video.play().catch(() => undefined);
    };
    const pause = () => video.pause();
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        if (onScreen) play();
        else pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(stage);
    const onVis = () => {
      if (document.hidden) pause();
      else play();
    };
    document.addEventListener("visibilitychange", onVis);
    play();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [showVideo]);

  function shareLocation() {
    setBusy(true);
    setNote(null);
    if (!navigator.geolocation) {
      setNote("This browser cannot share a location. Enter a ZIP on the ballot page.");
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
        const query = new URLSearchParams({ district: found.district, step: "races" });
        router.push(`/ballot?${query.toString()}`);
      },
      () => {
        setBusy(false);
        setNote("Location was not shared. It was not saved.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <section className="hero-stage" ref={stageRef} aria-label="Find your Kentucky races">
      <img className="hero-poster" src={POSTER} alt="" fetchPriority="high" />
      {showVideo ? (
        <video
          ref={videoRef}
          className="hero-video"
          poster={POSTER}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          aria-hidden="true"
        >
          <source src={WEBM} type="video/webm" />
          <source src={MP4} type="video/mp4" />
        </video>
      ) : null}
      <div className="hero-shade" />
      <div className="hero-copy">
        <h1>{homeHero.headline}</h1>
        <p className="hero-sub">{homeHero.subline}</p>
        <div className="hero-actions">
          <a className="btn btn-film" href="#map">
            Find my races ↓
          </a>
          <button className="btn btn-film-ghost" type="button" disabled={busy} onClick={shareLocation}>
            Use my location
          </button>
        </div>
        <p className="hero-note">
          Kentucky only. A district finds your U.S. House race and the U.S. Senate race. It is not your full local ballot.
        </p>
        {note ? (
          <p className="hero-error" role="alert">
            {note}
          </p>
        ) : null}
      </div>
      <p className="hero-credit">
        Video: Edmond Dantès on Pexels, free to use.{" "}
        <a href="https://www.pexels.com/video/people-voting-7103537/">People voting</a>
        {" and "}
        <a href="https://www.pexels.com/video/woman-putting-his-vote-on-a-ballot-box-7103427/">ballot box</a>.
      </p>
    </section>
  );
}
