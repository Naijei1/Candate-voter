"use client";

import { useEffect, useState } from "react";
import { stateName } from "@/lib/data/states";
import { US_MAP_VIEW, US_STATE_SHAPES } from "@/lib/geo/us-states";

const ARROW: Record<string, readonly [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const SMALL_LABEL = new Set(["CT", "DE", "DC", "MA", "MD", "NH", "NJ", "RI", "VT"]);
/** DC is a few pixels wide at this scale, so the shape stays clickable without a colliding abbreviation. */
const HIDE_LABEL = new Set(["DC"]);

type UsMapProps = {
  mapId: string;
  labelled: boolean;
  selected: string | null;
  statesWithRaces: readonly string[];
  onSelect: (postal: string) => void;
  label: string;
};

export function UsMap({
  mapId,
  labelled,
  selected,
  statesWithRaces,
  onSelect,
  label,
}: UsMapProps) {
  const withRaces = new Set(statesWithRaces);
  const [tabStop, setTabStop] = useState(selected ?? "KS");

  useEffect(() => {
    if (selected) setTabStop(selected);
  }, [selected]);

  return (
    <svg
      viewBox={`0 0 ${US_MAP_VIEW.width} ${US_MAP_VIEW.height}`}
      className="us-map h-auto w-full"
      role="group"
      aria-label={`${label} Arrow keys move between states. Enter selects.`}
    >
      {US_STATE_SHAPES.map((shape) => {
        const name = stateName(shape.postal);
        const hasRaces = withRaces.has(shape.postal);
        const isSelected = selected === shape.postal;
        const pressed = isSelected ? "true" : "false";
        return (
          <g key={shape.postal}>
            <path
              id={`${mapId}-${shape.postal}`}
              d={shape.d}
              className={hasRaces ? "us-state has-data" : "us-state"}
              role="button"
              tabIndex={shape.postal === tabStop ? 0 : -1}
              aria-label={
                hasRaces ? `${name}, stored federal races` : `${name}, no stored Senate or House races`
              }
              aria-pressed={pressed}
              onClick={() => onSelect(shape.postal)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(shape.postal);
                  return;
                }
                const direction = ARROW[event.key];
                if (!direction) return;
                event.preventDefault();
                const next = neighbor(shape, direction);
                if (!next) return;
                setTabStop(next.postal);
                document.getElementById(`${mapId}-${next.postal}`)?.focus();
              }}
            />
            {labelled && !HIDE_LABEL.has(shape.postal) ? (
              <text
                x={shape.x}
                y={shape.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={SMALL_LABEL.has(shape.postal) ? "us-label us-label-small" : "us-label"}
                aria-hidden="true"
              >
                {shape.postal}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function neighbor(
  current: (typeof US_STATE_SHAPES)[number],
  [dx, dy]: readonly [number, number],
) {
  let best: (typeof US_STATE_SHAPES)[number] | null = null;
  let bestScore = Infinity;
  for (const shape of US_STATE_SHAPES) {
    if (shape.postal === current.postal) continue;
    const vx = shape.x - current.x;
    const vy = shape.y - current.y;
    const along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const score = (vx * vx + vy * vy) / along;
    if (score < bestScore) {
      bestScore = score;
      best = shape;
    }
  }
  return best;
}

export function MapLegend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-map-data" aria-hidden="true" />
        Stored races
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-map" aria-hidden="true" />
        No stored races
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" />
        Selected
      </li>
    </ul>
  );
}
