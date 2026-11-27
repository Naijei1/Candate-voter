"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ExtLink } from "../ExtLink";
import { Icon } from "../Icon";

const ZOOMS = [1, 1.5, 2, 3];

/** Map frame with zoom buttons. The map scrolls to pan once it is zoomed in. */
export function ZoomBox({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState(0);
  return (
    <div className="mapbox">
      <div className="mapscroll" tabIndex={0} aria-label="Map. Use the zoom buttons, then scroll to pan.">
        <div className="mapinner" style={{ width: `${ZOOMS[level] * 100}%` }}>
          {children}
        </div>
      </div>
      <div className="zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" disabled={level === ZOOMS.length - 1} onClick={() => setLevel((n) => Math.min(n + 1, ZOOMS.length - 1))}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Zoom out" disabled={level === 0} onClick={() => setLevel((n) => Math.max(n - 1, 0))}>
          <Icon name="minus" />
        </button>
      </div>
    </div>
  );
}

export type DistrictItem = { code: string; number: number; d: string; labelX: number; labelY: number; href: string; label: string; small?: boolean };

/** District map: selecting a district shows its candidates below. Each district is a link in district order. */
export function DistrictPicker({ viewBox, title, districts, sets, after }: { viewBox: string; title: string; districts: DistrictItem[]; sets: Record<string, ReactNode>; after?: ReactNode }) {
  const [active, setActive] = useState(districts[0]?.code ?? "");
  return (
    <>
      <ZoomBox>
        <svg className="kymap" viewBox={viewBox} role="group" aria-label={title}>
          {districts.map((district) => (
            <a
              key={district.code}
              href={district.href}
              aria-label={district.label}
              aria-current={active === district.code ? "true" : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                setActive(district.code);
              }}
            >
              <path className={`d${active === district.code ? " on" : ""}`} d={district.d} fillRule="evenodd" />
            </a>
          ))}
          <g aria-hidden="true">
            {districts.map((district) => (
              <text key={district.code} className={`lbl${district.small ? " sm" : ""}${active === district.code ? " on" : ""}`} x={district.labelX} y={district.labelY}>
                {district.number || "AL"}
              </text>
            ))}
          </g>
        </svg>
      </ZoomBox>
      <div className="legend">
        <span>
          <i className="sw" />
          House district
        </span>
        <span>
          <i className="sw on" />
          Selected district
        </span>
        <span className="hint">Select a district on the map.</span>
      </div>
      {after}
      <div className="sec" aria-live="polite">
        {Object.entries(sets).map(([code, set]) => (
          <div key={code} hidden={code !== active}>
            {set}
          </div>
        ))}
      </div>
    </>
  );
}

export type CountyItem = { fips: string; name: string; d: string; districts: number[]; clerk: string | null; clerkUrl: string | null };

function districtLine(districts: number[]): string {
  if (districts.length === 0) return "House district not in our records.";
  if (districts.length === 1) return `U.S. House District ${districts[0]}.`;
  return `U.S. House Districts ${districts.slice(0, -1).join(", ")} and ${districts[districts.length - 1]}.`;
}

/** County map with a county list. Shows the races on that county's ballots. */
export function CountyPicker({
  viewBox,
  counties,
  initial,
  statewide,
  rows,
  after,
}: {
  viewBox: string;
  counties: CountyItem[];
  initial: string;
  /** Rows every county votes in, e.g. the Senate race. */
  statewide: ReactNode;
  /** Race rows keyed by district number. */
  rows: Record<string, ReactNode>;
  after?: ReactNode;
}) {
  const [fips, setFips] = useState(initial);
  const county = counties.find((item) => item.fips === fips) ?? counties[0];
  if (!county) return null;
  return (
    <>
      <ZoomBox>
        <svg className="kymap" viewBox={viewBox} role="img" aria-label={`Map of ${counties.length} counties. ${county.name} County is selected.`}>
          {counties.map((item) => (
            <path key={item.fips} className={`cty${item.fips === county.fips ? " on" : ""}`} d={item.d} onClick={() => setFips(item.fips)}>
              <title>{`${item.name} County`}</title>
            </path>
          ))}
        </svg>
      </ZoomBox>
      <div className="legend">
        <span>
          <i className="sw" />
          County
        </span>
        <span>
          <i className="sw on" />
          Selected county
        </span>
      </div>
      {after}
      <div className="sec county-g">
        <div className="field">
          <label htmlFor="cpick">County</label>
          <select id="cpick" className="input" value={county.fips} onChange={(event) => setFips(event.target.value)}>
            {counties.map((item) => (
              <option key={item.fips} value={item.fips}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div aria-live="polite">
          <h2 className="sec-t">{county.name} County</h2>
          {county.clerk ? (
            <p className="c-line">
              County clerk: {county.clerk}.{" "}
              {county.clerkUrl ? (
                <ExtLink className="xl" href={county.clerkUrl} icon>
                  Clerk’s website
                </ExtLink>
              ) : null}
            </p>
          ) : null}
          <p className="c-line">{districtLine(county.districts)}</p>
          {county.districts.length > 1 ? <p className="note">This county is split between House districts. Your street address decides which one is yours.</p> : null}
          <div className="rlist">
            {statewide}
            {county.districts.map((district) => (
              <div key={district}>{rows[String(district)]}</div>
            ))}
          </div>
          <p className="c-line">
            <Link href={`/ballot?county=${encodeURIComponent(county.name)}`}>Make these my races</Link>
          </p>
        </div>
      </div>
    </>
  );
}
