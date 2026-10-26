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

test("home section is titled Popular with no ranking disclaimer", () => {
  const source = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  const popular = source.slice(source.indexOf('id="popular-heading"'));
  assert.match(source, /id="popular-heading"/);
  assert.match(source, />\s*Popular\s*</);
  assert.equal(popular.includes("Recently updated filings"), false);
  assert.equal(/not a ranking/i.test(popular), false);
  assert.equal(/not a rating/i.test(popular), false);
  assert.equal(source.includes("newest stored update"), false);
  assert.equal(source.includes("Popular "), false);
  assert.equal(/<ol\b/.test(source), false);
});

test("desktop map grid keeps a fixed height so the filings panel cannot stretch it", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("@media (min-width: 1024px)"));
  assert.match(block, /\.map-hero-grid\s*\{[^}]*height:\s*calc\(100svh - 4\.5rem\)/);
  assert.match(block, /\.map-hero-grid\s*\{[^}]*max-height:\s*calc\(100svh - 4\.5rem\)/);
  assert.match(block, /\.map-panel\s*\{[^}]*overflow:\s*hidden/);
});
