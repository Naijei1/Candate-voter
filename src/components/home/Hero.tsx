"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ZipEntry } from "@/components/home/ZipEntry";
import { homeHero } from "@/config/brand";

const MP4 = "/video/vote-hero.mp4";
const WEBM = "/video/vote-hero.webm";
const POSTER = "/video/vote-hero.jpg";

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

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
    if (!video || !showVideo) return;
    video.muted = true;
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [showVideo]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    video.pause();
    setPlaying(false);
  }

  return (
    <section className="hero-stage" aria-label="Find your Kentucky ballot">
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
        <ZipEntry />
        <p className="hero-credit">
          Video: Edmond Dantès on Pexels, free to use.{" "}
          <a href="https://www.pexels.com/video/people-voting-7103537/">People voting</a>
          {" and "}
          <a href="https://www.pexels.com/video/woman-putting-his-vote-on-a-ballot-box-7103427/">ballot box</a>.
        </p>
      </div>
      {showVideo ? (
        <button className="hero-pause" type="button" onClick={toggle} aria-pressed={!playing}>
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
          {playing ? "Pause video" : "Play video"}
        </button>
      ) : null}
    </section>
  );
}
