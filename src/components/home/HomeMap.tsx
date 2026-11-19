"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";

import type { MapView } from "@/lib/site/map-view";

const VIEWS: { id: MapView; label: string }[] = [
  { id: "congressional", label: "District map" },
  { id: "statewide", label: "Statewide officeholders" },
];

/** Toggle between the House district map and the statewide officeholders. */
export function HomeMap({
  initial,
  congressional,
  statewide,
}: {
  initial: MapView;
  congressional: ReactNode;
  statewide: ReactNode;
}) {
  const [view, setView] = useState<MapView>(initial);

  function choose(next: MapView) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "statewide") url.searchParams.set("map", "statewide");
    else url.searchParams.delete("map");
    window.history.replaceState(null, "", `${url.pathname}${url.search}#map`);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = view === "congressional" ? "statewide" : "congressional";
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
    </div>
  );
}
