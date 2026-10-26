import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UsMap } from "../src/components/UsMap";

test("map marks one selected state and exposes every postal on a click target", () => {
  const html = renderToStaticMarkup(
    React.createElement(UsMap, {
      mapId: "hero-map",
      labelled: true,
      selected: "RI",
      statesWithRaces: ["CA", "RI"],
      onSelect: () => {},
      label: "Map of the United States for 2026.",
    }),
  );
  assert.match(html, /id="hero-map-RI"/);
  assert.match(html, /aria-pressed="true"/);
  assert.equal(html.split('aria-pressed="true"').length - 1, 1);
  assert.match(html, /data-postal="RI"/);
  assert.match(html, /data-postal="CA"/);
  assert.match(html, /data-postal="DC"/);
  assert.match(html, />DC</);
  assert.equal(html.includes("No endorsements"), false);
});

test("map shapes drop the browser focus rectangle and keep a fill for the selected state", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.us-map \.us-state:focus/);
  assert.match(css, /\.us-map \.us-state:-moz-focusring/);
  assert.match(css, /outline:\s*none/);
  const focusBlock = css.slice(css.indexOf(".us-map .us-state:focus"));
  assert.equal(/stroke:\s*var\(--color-ink\)/.test(focusBlock), false);
});

test("home section is titled Popular and disclaims a ranking", () => {
  const source = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.match(source, /id="popular-heading"/);
  assert.match(source, />\s*Popular\s*</);
  assert.match(source, /Recently updated filings — not a ranking\./);
  assert.equal(source.includes("Not a rating"), false);
  assert.equal(source.includes("newest stored update"), false);
});
