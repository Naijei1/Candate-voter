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
import { isPostalState, stateName } from "@/lib/data/states";
import { DC_CALLOUT } from "@/lib/geo/dc-label";
import { US_MAP_VIEW, US_STATE_SHAPES, type UsStateShape } from "@/lib/geo/us-states";

const ARROW: Record<string, readonly [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const SMALL_LABEL = new Set(["CT", "DE", "DC", "MA", "MD", "NH", "NJ", "RI", "VT"]);
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
    const target = event.target;
    const fromTarget = target instanceof Element ? postalFromTarget(target) : null;
    if (fromTarget) {
      reportHover(fromTarget);
      return;
    }
    reportHover(smallestShapeAt(event.currentTarget, event.clientX, event.clientY, mapId));
  }

  return (
    <svg
      viewBox={`0 0 ${US_MAP_VIEW.width} ${US_MAP_VIEW.height}`}
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

const StateLabel = memo(function StateLabel({
  shape,
  isSelected,
}: {
  shape: UsStateShape;
  isSelected: boolean;
}) {
  if (shape.postal === "DC") {
    return (
      <g data-postal="DC">
        <g className="us-dc-callout">
          <line x1={DC_CALLOUT.x1} y1={DC_CALLOUT.y1} x2={DC_CALLOUT.x2} y2={DC_CALLOUT.y2} />
        </g>
        <text
          data-postal="DC"
          x={DC_CALLOUT.labelX}
          y={DC_CALLOUT.labelY}
          textAnchor="start"
          dominantBaseline="central"
          className="us-label-dc"
        >
          DC
        </text>
      </g>
    );
  }
  if (HIDE_LABEL.has(shape.postal)) return null;
  const small = SMALL_LABEL.has(shape.postal);
  const selectedClass = isSelected && !small ? " is-selected" : "";
  return (
    <text
      data-postal={shape.postal}
      x={shape.x}
      y={shape.y}
      textAnchor="middle"
      dominantBaseline="central"
      className={`${small ? "us-label us-label-small" : "us-label"}${selectedClass}`}
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

export function MapLegend() {
  return (
    <ul className="map-legend" aria-label="Map legend">
      <li className="inline-flex items-center gap-1.5">
        <span className="map-swatch is-data" aria-hidden="true" />
        Has candidates
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="map-swatch" aria-hidden="true" />
        No one has filed yet
      </li>
    </ul>
  );
}
