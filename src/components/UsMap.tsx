"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { MapGesture } from "@/components/MapGesture";
import { isPostalState, stateName } from "@/lib/data/states";
import { CALLOUT_POSTALS, LABEL_GUTTER, STATE_CALLOUTS } from "@/lib/geo/state-labels";
import { US_MAP_VIEW, US_STATE_SHAPES, type UsStateShape } from "@/lib/geo/us-states";

const ARROW: Record<string, readonly [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Extra hit area for states that are only a few pixels wide. */
const HIT_RADIUS: Record<string, number> = {
  MA: 14,
  MD: 14,
  NH: 14,
  NJ: 14,
  VT: 16,
  CT: 16,
  DE: 18,
  RI: 18,
  DC: 22,
};
/** DC is a few pixels wide at this scale, so the shape stays clickable without a colliding abbreviation. */
const HIDE_LABEL = new Set(["DC"]);

type UsMapProps = {
  mapId: string;
  labelled: boolean;
  selected: string | null;
  /** Postal under the pointer. Other states dim while this is set. */
  hot?: string | null;
  statesWithRaces: readonly string[];
  onSelect: (postal: string) => void;
  onHover?: (postal: string | null) => void;
  label: string;
};

export function UsMap({
  mapId,
  labelled,
  selected,
  hot = null,
  statesWithRaces,
  onSelect,
  onHover,
  label,
}: UsMapProps) {
  const withRaces = new Set(statesWithRaces);
  const [tabStop, setTabStop] = useState(selected ?? "KS");
  const hotRef = useRef(hot);
  hotRef.current = hot;

  const reportHover = useCallback(
    (postal: string | null) => {
      if (hotRef.current === postal) return;
      hotRef.current = postal;
      onHover?.(postal);
    },
    [onHover],
  );
  const panning = useRef(false);
  const onPanActive = useCallback(
    (active: boolean) => {
      panning.current = active;
      reportHover(null);
    },
    [reportHover],
  );

  useEffect(() => {
    if (selected) setTabStop(selected);
  }, [selected]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<SVGPathElement>) => {
      const postal = event.currentTarget.dataset.postal;
      if (!postal) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(postal);
        return;
      }
      const direction = ARROW[event.key];
      if (!direction) return;
      event.preventDefault();
      const current = US_STATE_SHAPES.find((shape) => shape.postal === postal);
      if (!current) return;
      const next = neighbor(current, direction);
      if (!next) return;
      setTabStop(next.postal);
      document.getElementById(`${mapId}-${next.postal}`)?.focus();
    },
    [mapId, onSelect],
  );

  function onMapPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    // Mouse and pen would focus the path and draw a rectangular ring.
    // Keyboard focus still arrives through Tab and the arrow keys.
    event.preventDefault();
    blurMapFocus(event.currentTarget);
  }

  function onMapClick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const target = event.target;
    const choose = (postal: string) => {
      onSelect(postal);
      blurMapFocus(svg);
    };
    if (target instanceof SVGElement && target.classList.contains("us-hit")) {
      const postal = postalFromTarget(target);
      if (postal) {
        choose(postal);
        return;
      }
    }
    const geometric = smallestShapeAt(svg, event.clientX, event.clientY, mapId);
    if (geometric) {
      choose(geometric);
      return;
    }
    if (target instanceof SVGTextElement) {
      const postal = postalFromTarget(target);
      if (postal) choose(postal);
    }
  }

  function onMapPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (panning.current) return;
    const target = event.target;
    const fromTarget = target instanceof Element ? postalFromTarget(target) : null;
    if (fromTarget) {
      reportHover(fromTarget);
      return;
    }
    reportHover(smallestShapeAt(event.currentTarget, event.clientX, event.clientY, mapId));
  }

  return (
    <MapGesture resetKey={selected ?? ""} onPanActive={onHover ? onPanActive : undefined}>
    <svg
      viewBox={`0 0 ${US_MAP_VIEW.width + LABEL_GUTTER} ${US_MAP_VIEW.height}`}
      preserveAspectRatio="xMidYMin meet"
      className={hot ? "us-map is-dimming h-full w-full" : "us-map h-full w-full"}
      role="group"
      aria-label={`${label} Arrow keys move between states. Enter selects.`}
      onPointerDown={onMapPointerDown}
      onPointerMove={onHover ? onMapPointerMove : undefined}
      onPointerLeave={onHover ? () => reportHover(null) : undefined}
      onClick={onMapClick}
    >
      {US_STATE_SHAPES.map((shape) => (
        <StatePath
          key={shape.postal}
          shape={shape}
          mapId={mapId}
          hasRaces={withRaces.has(shape.postal)}
          isSelected={selected === shape.postal}
          isHot={hot === shape.postal}
          tabbable={shape.postal === tabStop}
          onKeyDown={onKeyDown}
          onFocusPostal={onHover ? reportHover : undefined}
        />
      ))}
      {US_STATE_SHAPES.filter((shape) => HIT_RADIUS[shape.postal] != null).map((shape) => (
        <circle
          key={`hit-${shape.postal}`}
          data-postal={shape.postal}
          cx={shape.x}
          cy={shape.y}
          r={HIT_RADIUS[shape.postal]}
          className="us-hit"
          aria-hidden="true"
        />
      ))}
      {labelled ? (
        <g className="us-labels" aria-hidden="true">
          <g className="us-callouts">
            {STATE_CALLOUTS.map((callout) => (
              <polyline
                key={`callout-line-${callout.postal}`}
                className="us-callout-line"
                points={calloutLane(callout)}
              />
            ))}
            {STATE_CALLOUTS.map((callout) => (
              <g
                key={`callout-${callout.postal}`}
                data-postal={callout.postal}
                className="us-callout"
                transform={`translate(${callout.labelX} ${callout.labelY})`}
              >
                <rect className="us-label-plate" x="-0.7em" y="-0.58em" width="2.85em" height="1.16em" rx="0.18em" />
                <text
                  data-postal={callout.postal}
                  x="0"
                  y="0"
                  textAnchor="start"
                  dominantBaseline="central"
                  className={
                    selected === callout.postal ? "us-label us-label-callout is-selected" : "us-label us-label-callout"
                  }
                >
                  {callout.postal}
                </text>
              </g>
            ))}
          </g>
          {US_STATE_SHAPES.map((shape) => (
            <StateLabel
              key={`label-${shape.postal}`}
              shape={shape}
              isSelected={selected === shape.postal}
            />
          ))}
        </g>
      ) : null}
    </svg>
    </MapGesture>
  );
}

const StatePath = memo(function StatePath({
  shape,
  mapId,
  hasRaces,
  isSelected,
  isHot,
  tabbable,
  onKeyDown,
  onFocusPostal,
}: {
  shape: UsStateShape;
  mapId: string;
  hasRaces: boolean;
  isSelected: boolean;
  isHot: boolean;
  tabbable: boolean;
  onKeyDown: (event: KeyboardEvent<SVGPathElement>) => void;
  onFocusPostal?: (postal: string) => void;
}) {
  const name = stateName(shape.postal);
  const classes = ["us-state"];
  if (hasRaces) classes.push("has-data");
  if (isHot) classes.push("is-hot");
  return (
    <path
      id={`${mapId}-${shape.postal}`}
      data-postal={shape.postal}
      d={shape.d}
      className={classes.join(" ")}
      role="button"
      tabIndex={tabbable ? 0 : -1}
      aria-label={hasRaces ? `${name}, has candidates` : `${name}, no one has filed yet`}
      aria-pressed={isSelected ? "true" : "false"}
      onKeyDown={onKeyDown}
      onFocus={onFocusPostal ? () => onFocusPostal(shape.postal) : undefined}
    />
  );
});

/** Shared gutter east of the coast. Leaders turn here, left of every label. */
const CALLOUT_GUTTER_X = 968;

function calloutLane(callout: { x1: number; y1: number; x2: number; y2: number }): string {
  const { x1, y1, x2, y2 } = callout;
  return `${x1},${y1} ${CALLOUT_GUTTER_X},${y1} ${CALLOUT_GUTTER_X},${y2} ${x2},${y2}`;
}

const StateLabel = memo(function StateLabel({
  shape,
  isSelected,
}: {
  shape: UsStateShape;
  isSelected: boolean;
}) {
  if (HIDE_LABEL.has(shape.postal) || CALLOUT_POSTALS.has(shape.postal)) return null;
  const selectedClass = isSelected ? " is-selected" : "";
  if (shape.postal === "MD") {
    return (
      <g className="us-callout" transform={`translate(${shape.x} ${shape.y})`}>
        {isSelected ? null : (
          <rect className="us-label-plate" x="-1.2em" y="-0.58em" width="2.4em" height="1.16em" rx="0.18em" />
        )}
        <text
          data-postal={shape.postal}
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          className={`us-label${selectedClass}`}
        >
          {shape.postal}
        </text>
      </g>
    );
  }
  return (
    <text
      data-postal={shape.postal}
      x={shape.x}
      y={shape.y}
      textAnchor="middle"
      dominantBaseline="central"
      className={`us-label${selectedClass}`}
    >
      {shape.postal}
    </text>
  );
});

/** Shared borders belong to more than one fill. The smaller state keeps the click. */
function smallestShapeAt(svg: SVGSVGElement, clientX: number, clientY: number, mapId: string): string | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const local = point.matrixTransform(ctm.inverse());
  let bestPostal: string | null = null;
  let bestArea = Infinity;
  for (const shape of US_STATE_SHAPES) {
    const path = document.getElementById(`${mapId}-${shape.postal}`);
    if (!(path instanceof SVGPathElement) || !path.isPointInFill(local)) continue;
    const box = path.getBBox();
    const area = box.width * box.height;
    if (area < bestArea) {
      bestArea = area;
      bestPostal = shape.postal;
    }
  }
  return bestPostal;
}

function blurMapFocus(svg: SVGSVGElement) {
  const active = document.activeElement;
  if (active instanceof SVGElement && svg.contains(active)) active.blur();
}

function postalFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const node = target.closest("[data-postal]");
  const postal = node?.getAttribute("data-postal") ?? "";
  return isPostalState(postal) ? postal : null;
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

export function MapLegend({ house = false }: { house?: boolean }) {
  return (
    <ul className="map-legend" aria-label={house ? "House district colors" : "Map legend"}>
      <li className="inline-flex items-center gap-1.5">
        <span className="map-swatch is-data" aria-hidden="true" />
        {house ? "House filing" : "Has candidates"}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="map-swatch" aria-hidden="true" />
        {house ? "No House filing yet" : "No one has filed yet"}
      </li>
    </ul>
  );
}
