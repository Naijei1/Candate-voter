"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { MapGesture } from "@/components/MapGesture";
import { MapLegend } from "@/components/UsMap";
import { HOUSE_SEATS, isSingleSeat } from "@/lib/data/at-large";
import { stateName } from "@/lib/data/states";
import { withBasePath } from "@/lib/base-path";
import { withPreservedQuery, type MapContext } from "@/lib/landing/state-query";
import {
  districtHasCandidates,
  isCdFeatureCollection,
  projectCollection,
  raceForDistrict,
  type CdFeatureCollection,
  type ProjectedDistrict,
} from "@/lib/geo/cd119";
import type { Race } from "@/lib/types";

const VIEW = { width: 1000, height: 640 };

export function DistrictMap({
  postal,
  races,
  year,
  yourDistricts = [],
  context = null,
}: {
  postal: string;
  races: readonly Race[];
  /** Cycle on the page. A district from another cycle stays grey. */
  year: number;
  /** Two-digit House codes from a ZIP match. Empty when the visitor did not arrive by ZIP. */
  yourDistricts?: readonly string[];
  /** Year, state, and zip to keep on the race URL. */
  context?: MapContext | null;
}) {
  const router = useRouter();
  const [shapes, setShapes] = useState<ProjectedDistrict[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const covered = HOUSE_SEATS[postal] != null;
  const yours = new Set(yourDistricts.map((code) => code.padStart(2, "0")));
  const here = youAreHere(postal, yourDistricts);

  function openRace(raceId: string) {
    router.push(context ? withPreservedQuery(`/races/${raceId}`, context) : `/races/${raceId}`);
  }

  useEffect(() => {
    if (!covered) return;
    let active = true;
    setShapes(null);
    setFailed(false);
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(withBasePath(`/geo/cd120/${postal}.json`), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("missing");
        const body: unknown = await response.json();
        if (!isCdFeatureCollection(body)) throw new Error("shape");
        if (!active) return;
        setShapes(projectCollection(body as CdFeatureCollection, VIEW.width, VIEW.height));
      } catch (error) {
        if (!active || isAbort(error)) return;
        setFailed(true);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [covered, postal]);

  return (
    <div className="state-map-pane" data-testid="district-map">
      <div className="cd-canvas">
        {!covered ? (
          <p className="cd-note">House district maps cover the 50 states.</p>
        ) : failed ? (
          <p className="cd-note">This district map isn&apos;t available right now.</p>
        ) : shapes == null ? (
          <p className="cd-note" aria-busy="true">
            Loading districts…
          </p>
        ) : (
          <MapGesture resetKey={postal} className="cd-gesture">
          <svg
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            className="cd-map"
            role="group"
            aria-label={`${stateName(postal)} congressional districts`}
          >
            {shapes.map((shape) => {
              const race = raceForDistrict(races, postal, shape.district);
              const has =
                districtHasCandidates(race) && (race?.cycle == null || race.cycle === year);
              const hereDistrict = yours.has(shape.district);
              const label = districtLabel(postal, shape.district, has, hereDistrict);
              const className = [
                "cd-district",
                has ? "has-data" : "",
                hereDistrict ? "is-yours" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g key={shape.district}>
                  {race ? (
                    <path
                      d={shape.d}
                      className={className}
                      fillRule="evenodd"
                      role="link"
                      tabIndex={0}
                      aria-label={label}
                      onMouseEnter={() => setHover(label)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(label)}
                      onBlur={() => setHover(null)}
                      onClick={() => openRace(race.raceId)}
                      onKeyDown={(event: KeyboardEvent<SVGPathElement>) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openRace(race.raceId);
                        }
                      }}
                    >
                      <title>{label}</title>
                    </path>
                  ) : (
                    <path d={shape.d} className={className} fillRule="evenodd">
                      <title>{label}</title>
                    </path>
                  )}
                  <text className="cd-label" x={shape.labelX} y={shape.labelY} textAnchor="middle">
                    {Number(shape.district)}
                  </text>
                </g>
              );
            })}
          </svg>
          </MapGesture>
        )}
      </div>
      {hover ? <p className="cd-hover-label">{hover}</p> : null}
      {here ? (
        <p className="you-are-here" data-testid="you-are-here">
          {here}
        </p>
      ) : null}
      <MapLegend house />
    </div>
  );
}

function youAreHere(postal: string, codes: readonly string[]): string | null {
  const names = codes
    .map((code) => code.padStart(2, "0"))
    .filter((code) => /^\d{2}$/.test(code))
    .filter((code) => code !== "00" || isSingleSeat(postal))
    .map((code) => (code === "00" ? "the at-large seat" : `District ${Number(code)}`));
  if (names.length === 0) return null;
  return `You are here · ${names.join(", ")}`;
}

function districtLabel(postal: string, district: string, has: boolean, yours: boolean): string {
  const place =
    district === "00"
      ? isSingleSeat(postal)
        ? `${stateName(postal)} at-large`
        : stateName(postal)
      : `U.S. House District ${Number(district)}`;
  const filing = has ? "has candidates" : "no one has filed yet";
  return yours ? `${place}, you are here, ${filing}` : `${place}, ${filing}`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
