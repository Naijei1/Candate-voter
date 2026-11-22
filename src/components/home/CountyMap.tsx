"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import counties from "../../../data/ky-counties.json";
import { withBasePath } from "@/lib/base-path";

type Shape = { fips: string; d: string; x: number; y: number; radius: number };
type Drawing = { viewBox: string; counties: Shape[] };
const directory = new Map(counties.map((county) => [county.fips, county]));

export default function CountyMap() {
  const [selected, setSelected] = useState(counties[0].fips);
  const [hover, setHover] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const county = directory.get(selected)!;
  const label = drawing?.counties.find((shape) => shape.fips === (hover ?? selected));

  const labelName = label ? directory.get(label.fips)!.name : "";
  const labelSize = label ? Math.min(14, label.radius * 2.45 / labelName.length) : 0;

  useEffect(() => {
    const controller = new AbortController();
    fetch(withBasePath("/geo/counties/KY.json"), { signal: controller.signal })
      .then(async (response) => { if (response.ok) setDrawing(await response.json()); })
      .catch(() => { /* The county selector also works without the drawing. */ });
    return () => controller.abort();
  }, []);

  function move(event: KeyboardEvent<SVGPathElement>, index: number) {
    let next = index;
    switch (event.key) {
      case "Home": next = 0; break;
      case "End": next = counties.length - 1; break;
      case "ArrowDown": case "ArrowRight": next = (index + 1) % counties.length; break;
      case "ArrowUp": case "ArrowLeft": next = (index + counties.length - 1) % counties.length; break;
      case "Enter": case " ": break;
      default: return;
    }
    event.preventDefault();
    document.getElementById(`county-${counties[next].fips}`)?.focus();
    setSelected(counties[next].fips);
  }

  return (
    <div className="county-atlas">
      <div className="county-drawing">
        <p className="lede county-caption">
          <span style={{ visibility: hover ? "hidden" : "visible" }}>Choose a county to see its clerk and House races.</span>
          {hover && <strong>{directory.get(hover)!.name} County</strong>}
        </p>
        <svg viewBox={drawing?.viewBox ?? "0 0 1000 445.6"} role="group" aria-label="Kentucky counties, alphabetically by arrow key" onMouseLeave={() => setHover(null)}>
          {drawing?.counties.map((shape, index) => (
            <path key={shape.fips} id={`county-${shape.fips}`} d={shape.d} fillRule="evenodd"
              role="button" aria-label={`${directory.get(shape.fips)!.name} County`}
              aria-pressed={shape.fips === selected} tabIndex={shape.fips === selected ? 0 : -1}
              onMouseEnter={() => setHover(shape.fips)} onFocus={() => { setHover(shape.fips); setSelected(shape.fips); }} onBlur={() => setHover(null)}
              onClick={() => setSelected(shape.fips)} onKeyDown={(event) => move(event, index)}>
                <title>{directory.get(shape.fips)!.name} County</title>
              </path>
          ))}
          {label && (
            <g aria-hidden="true" className={labelSize >= 12 ? "county-mark has-room" : "county-mark"}>
              <circle cx={label.x} cy={label.y} r={Math.min(4, label.radius / 2)} />
              {labelSize >= 12 && <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fontSize={labelSize}>{labelName}</text>}
            </g>
          )}
        </svg>
      </div>
      <div className="county-detail">
        <label htmlFor="county-select">Choose a county</label>
        <select id="county-select" value={selected} onChange={(event) => { setHover(null); setSelected(event.target.value); }}>
          {counties.map((item) => <option key={item.fips} value={item.fips}>{item.name} County</option>)}
        </select>
        <div aria-live="polite" aria-atomic="true">
          <h3 className="sr-only">{county.name} County</h3>
          <p>County clerk</p>
          <a className="county-clerk" href={county.clerkUrl}>{county.clerk} <span aria-hidden="true">↗</span></a>
          <p>U.S. House</p>
          <div className="county-races">{county.districts.map((code) => (
            <a key={code} href={withBasePath(`/races/2026-house-KY-${code}`)}>District {Number(code)} <span aria-hidden="true">→</span></a>
          ))}</div>
        </div>
      </div>
    </div>
  );
}
