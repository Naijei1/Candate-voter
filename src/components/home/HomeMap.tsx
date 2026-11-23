"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

import { parseMapView, type MapView } from "@/lib/site/map-view";

const CountyMap = dynamic(() => import("./CountyMap"));

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
    setView(next);
    const url = new URL(window.location.href);
    if (next !== "congressional") url.searchParams.set("map", next);
    else url.searchParams.delete("map");
    window.history.replaceState(null, "", `${url.pathname}${url.search}#map`);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = VIEWS.findIndex((item) => item.id === view);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = VIEWS[(index + offset + VIEWS.length) % VIEWS.length].id;
    choose(next);
    document.getElementById(`map-tab-${next}`)?.focus();
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
