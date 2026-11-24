"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

import { parseMapView, type MapView } from "@/lib/site/map-view";

const CountyMap = dynamic(() => import("./CountyMap"), {
  loading: () => <p className="hint" role="status">Loading the county map.</p>,
});

const VIEWS: { id: MapView; label: string }[] = [
  { id: "congressional", label: "Congressional" },
  { id: "statewide", label: "Statewide" },
  { id: "county", label: "County" },
];

export function HomeMap({
  congressional,
  statewide,
}: {
  congressional: ReactNode;
  statewide: ReactNode;
}) {
  const [view, setView] = useState<MapView>("congressional");
  useEffect(() => {
    const next = parseMapView(new URLSearchParams(window.location.search).get("map"));
    if (next !== "congressional") setView(next);
  }, []);

  function choose(next: MapView) {
    const y = window.scrollY;
    setView(next);
    const url = new URL(window.location.href);
    if (next !== "congressional") url.searchParams.set("map", next);
    else url.searchParams.delete("map");
    const tabId = `map-tab-${next}`;
    window.history.replaceState(null, "", `${url.pathname}${url.search}#map`);
    const restore = () => {
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
      document.getElementById(tabId)?.focus({ preventScroll: true });
    };
    restore();
    requestAnimationFrame(restore);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = VIEWS.findIndex((item) => item.id === view);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = VIEWS[(index + offset + VIEWS.length) % VIEWS.length].id;
    choose(next);
  }

  return (
    <div className="home-map-toggle">
      <div className="segmented" role="tablist" aria-label="Map view">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            id={`map-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            aria-controls={`map-panel-${item.id}`}
            tabIndex={view === item.id ? 0 : -1}
            onClick={() => choose(item.id)}
            onKeyDown={onKey}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id="map-panel-congressional" role="tabpanel" aria-labelledby="map-tab-congressional" hidden={view !== "congressional"}>
        {congressional}
      </div>
      <div id="map-panel-statewide" role="tabpanel" aria-labelledby="map-tab-statewide" hidden={view !== "statewide"}>
        {statewide}
      </div>
      <div id="map-panel-county" role="tabpanel" aria-labelledby="map-tab-county" hidden={view !== "county"}>
        {view === "county" && <CountyMap />}
      </div>
    </div>
  );
}
