"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { MapLegend } from "@/components/UsMap";
import { HOUSE_SEATS } from "@/lib/data/at-large";
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
  yourDistricts = [],
  context = null,
}: {
  postal: string;
  races: readonly Race[];
  /** Two-digit House codes from a ZIP match. Empty when the visitor did not arrive by ZIP. */
  yourDistricts?: readonly string[];
  /** Year, state, and zip to keep on the race URL. */
  context?: MapContext | null;
}) {
  const router = useRouter();
  const [shapes, setShapes] = useState<ProjectedDistrict[] | null>(null);
  const [failed, setFailed] = useState(false);
  const covered = HOUSE_SEATS[postal] != null;
  const yours = new Set(yourDistricts.map((code) => code.padStart(2, "0")));
  const here = youAreHere(yourDistricts);

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
        const response = await fetch(withBasePath(`/geo/cd119/${postal}.json`), {
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
          <svg
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            className="cd-map"
            role="group"
            aria-label={`${stateName(postal)} congressional districts`}
          >
            {shapes.map((shape) => {
              const race = raceForDistrict(races, postal, shape.district);
              const has = districtHasCandidates(race);
              const hereDistrict = yours.has(shape.district);
              const label = districtLabel(postal, shape.district, has, hereDistrict);
              const className = [
                "cd-district",
                has ? "has-data" : "",
                hereDistrict ? "is-yours" : "",
              ]
                .filter(Boolean)
                .join(" ");
              if (!race) {
                return (
                  <path key={shape.district} d={shape.d} className={className} fillRule="evenodd">
                    <title>{label}</title>
                  </path>
                );
              }
              return (
                <path
                  key={race.raceId}
                  d={shape.d}
                  className={className}
                  fillRule="evenodd"
                  role="link"
                  tabIndex={0}
                  aria-label={label}
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
              );
            })}
          </svg>
        )}
      </div>
      {here ? (
        <p className="you-are-here" data-testid="you-are-here">
          {here}
        </p>
      ) : null}
      <MapLegend />
    </div>
  );
}

function youAreHere(codes: readonly string[]): string | null {
  const names = codes
    .map((code) => code.padStart(2, "0"))
    .filter((code) => /^\d{2}$/.test(code))
    .map((code) => (code === "00" ? "the at-large seat" : `District ${Number(code)}`));
  if (names.length === 0) return null;
  return `You are here · ${names.join(", ")}`;
}

function districtLabel(postal: string, district: string, has: boolean, yours: boolean): string {
  const place =
    district === "00"
      ? `${stateName(postal)} at-large`
      : `${stateName(postal)} District ${Number(district)}`;
  const filing = has ? "has candidates" : "no one has filed yet";
  return yours ? `${place}, you are here, ${filing}` : `${place}, ${filing}`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
