"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ExtLink } from "../ExtLink";
import { Icon } from "../Icon";
import { readPlace, savePlace } from "./device";

export type GuideCounty = { fips: string; name: string; d: string; districts: number[]; clerkUrl: string | null };


function canon(counties: GuideCounty[], value: string): GuideCounty | null {
  const want = value
    .trim()
    .toLowerCase()
    .replace(/\s+county$/, "");
  return counties.find((county) => county.name.toLowerCase() === want) ?? null;
}

function districtText(districts: number[]): string {
  return districts.length > 1 ? `House Districts ${districts.join(" and ")}` : `House District ${districts[0]}`;
}

function setParams(county: string | null, district: number | null) {
  const url = new URL(location.href);
  url.searchParams.delete("change");
  if (county) url.searchParams.set("county", county);
  else url.searchParams.delete("county");
  if (district) url.searchParams.set("d", String(district));
  else url.searchParams.delete("d");
  history.replaceState(history.state, "", url);
}

type View = { step: "ask" } | { step: "split"; county: GuideCounty } | { step: "out"; county: GuideCounty; districts: number[] };

/** County first, then races. No street address or ZIP code; split counties ask which district is on the voter card. */
export function CountyGuide({
  viewBox,
  counties,
  sets,
  stateName,
  quick,
  summary,
}: {
  viewBox: string;
  counties: GuideCounty[];
  sets: Record<string, ReactNode>;
  stateName: string;
  quick: readonly string[];
  summary?: ReactNode;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>({ step: "ask" });
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const splitFirst = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const names = useMemo(() => counties.map((county) => county.name), [counties]);
  const current = canon(counties, value);

  const matches = useMemo(() => {
    const q = value
      .trim()
      .toLowerCase()
      .replace(/\s+county$/, "");
    if (!q) return names;
    return [...names.filter((name) => name.toLowerCase().startsWith(q)), ...names.filter((name) => !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q))];
  }, [names, value]);

  const show = (county: GuideCounty, districts: number[], focus = true) => {
    savePlace(county.name, districts);
    setView({ step: "out", county, districts });
    setParams(county.name, districts.length === 1 && county.districts.length > 1 ? districts[0] : null);
    document.title = `My races: ${county.name} County · THE VOTE`;
    if (focus) requestAnimationFrame(() => heading.current?.focus());
  };

  const choose = (county: GuideCounty | null, focus = true) => {
    if (!county) {
      setError(true);
      input.current?.focus();
      return;
    }
    setError(false);
    setValue(county.name);
    setOpen(false);
    if (county.districts.length > 1) {
      setView({ step: "split", county });
      setParams(county.name, null);
      if (focus) requestAnimationFrame(() => splitFirst.current?.focus());
      return;
    }
    show(county, county.districts, focus);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("change")) return;
    const asked = params.get("county");
    const county = asked ? canon(counties, asked) : null;
    const saved = readPlace();
    const place = saved ? canon(counties, saved.c) : null;
    const savedDistricts = saved && place ? saved.d.filter((d) => place.districts.includes(d)) : [];
    if (county) {
      setValue(county.name);
      const d = Number(params.get("d"));
      if (d && county.districts.includes(d)) show(county, [d], false);
      else if (place === county && savedDistricts.length) show(county, savedDistricts, false);
      else choose(county, false);
      return;
    }
    if (place) {
      setValue(place.name);
      show(place, savedDistricts.length ? savedDistricts : place.districts, false);
    }
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (name: string) => {
    setValue(name);
    setOpen(false);
    setActive(-1);
    setError(false);
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((n) => Math.min(n + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((n) => Math.max(n - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const name = open && matches[active] ? matches[active] : (current?.name ?? (matches.length === 1 ? matches[0] : ""));
      choose(canon(counties, name));
    }
  };

  if (view.step === "out") {
    const { county, districts } = view;
    return (
      <section aria-labelledby="go-h">
        <div className="g-sum">
          <h2 id="go-h" className="sec-t" tabIndex={-1} ref={heading}>
            Your races in {county.name} County
          </h2>
          <p className="sec-sub">
            <button
              className="linkbtn"
              type="button"
              onClick={() => {
                setView({ step: "ask" });
                setParams(null, null);
                requestAnimationFrame(() => input.current?.focus());
              }}
            >
              Change county
            </button>
          </p>
          {summary}
        </div>
        {sets.senate}
        {districts.map((district) => (
          <div key={district}>{sets[String(district)]}</div>
        ))}
      </section>
    );
  }

  return (
    <>
      <section className="gq" aria-labelledby="gq-h">
        <div className="gq-c">
          <h2 id="gq-h" className="sec-t">
            Which county do you vote in?
          </h2>
          <div className="field cbox">
            <label htmlFor="gcounty">Your county</label>
            <div className="cb-w">
              <input
                ref={input}
                className={`input${error ? " err" : ""}`}
                id="gcounty"
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                aria-invalid={error || undefined}
                aria-describedby={error ? "c-err" : undefined}
                autoComplete="off"
                autoCapitalize="words"
                placeholder="Start typing, for example Fayette"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setOpen(true);
                  setActive(-1);
                  setError(false);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                  setTimeout(() => setOpen(false), 120);
                  if (current) setValue(current.name);
                }}
                onKeyDown={onKey}
              />
              <ul className="cb-list" id={listId} role="listbox" aria-label={`${stateName} counties`} hidden={!open}>
                {matches.length ? (
                  matches.map((name, index) => (
                    <li
                      key={name}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        pick(name);
                      }}
                    >
                      {name} County
                    </li>
                  ))
                ) : (
                  <li className="cb-none" role="presentation">
                    No {stateName} county matches that. Check the spelling.
                  </li>
                )}
              </ul>
            </div>
            {error ? (
              <p className="err-msg" id="c-err">
                <Icon name="warn" size="sm" />
                Choose a county from the list.
              </p>
            ) : null}
          </div>
          <div className="quick" role="group" aria-label="Largest counties">
            <span>Or pick one:</span>
            {quick.filter((name) => names.includes(name)).map((name) => (
              <button key={name} className="chip" type="button" onClick={() => choose(canon(counties, name))}>
                {name}
              </button>
            ))}
          </div>
          <button className="btn primary" type="button" onClick={() => choose(current)}>
            Show my races
          </button>
        </div>
        <div className="gq-m">
          <div className="mapbox plain">
            <svg className="kymap" viewBox={viewBox} role="img" aria-label={`Map of ${stateName}’s ${counties.length} counties${current ? `. ${current.name} County is selected.` : ""}`}>
              {counties.map((county) => (
                <path key={county.fips} className={`cty${current?.fips === county.fips ? " on" : ""}`} d={county.d} onClick={() => pick(county.name)}>
                  <title>{`${county.name} County`}</title>
                </path>
              ))}
            </svg>
          </div>
          <p className="gcap" aria-live="polite">
            {current ? `${current.name} County: ${districtText(current.districts)}` : "Or select your county on the map."}
          </p>
        </div>
      </section>
      {view.step === "split" ? (
        <section className="gd" aria-labelledby="gs-h">
          <h2 id="gs-h" className="sec-t sm">
            {view.county.name} County has {view.county.districts.length === 2 ? "two" : view.county.districts.length} House districts
          </h2>
          <p className="sec-sub">Pick the one on your voter card.</p>
          <div className="row">
            {view.county.districts.map((district, index) => (
              <button key={district} ref={index === 0 ? splitFirst : undefined} className="btn outline" type="button" onClick={() => show(view.county, [district])}>
                District {district}
              </button>
            ))}
          </div>
          <p className="sec-sub">
            {view.county.clerkUrl ? (
              <>
                <ExtLink href={view.county.clerkUrl}>Ask the {view.county.name} County clerk</ExtLink>
                {" · "}
              </>
            ) : null}
            <button className="linkbtn" type="button" onClick={() => show(view.county, view.county.districts)}>
              Show both
            </button>
          </p>
        </section>
      ) : null}
    </>
  );
}
