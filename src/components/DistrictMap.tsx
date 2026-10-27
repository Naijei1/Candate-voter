"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { MapLegend } from "@/components/UsMap";
import { HOUSE_SEATS } from "@/lib/data/at-large";
import { stateName } from "@/lib/data/states";
import { withBasePath } from "@/lib/base-path";
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
}: {
  postal: string;
  races: readonly Race[];
}) {
  const router = useRouter();
  const [shapes, setShapes] = useState<ProjectedDistrict[] | null>(null);
  const [failed, setFailed] = useState(false);
  const covered = HOUSE_SEATS[postal] != null;

  function openRace(raceId: string) {
    router.push(`/races/${raceId}`);
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
              const label = districtLabel(postal, shape.district, has);
              const className = has ? "cd-district has-data" : "cd-district";
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
      <MapLegend />
    </div>
  );
}

function districtLabel(postal: string, district: string, has: boolean): string {
  const place =
    district === "00"
      ? `${stateName(postal)} at-large`
      : `${stateName(postal)} District ${Number(district)}`;
  return has ? `${place}, has candidates` : `${place}, no candidates yet`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
