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

test("landing is a map shell without a Popular list or ranking copy", () => {
  const source = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("popular-heading"), false);
  assert.equal(source.includes("Recently updated filings"), false);
  assert.equal(/not a ranking/i.test(source), false);
  assert.equal(/not a rating/i.test(source), false);
  assert.equal(source.includes("newest stored update"), false);
  assert.equal(/<ol\b/.test(source), false);
  assert.match(source, /data-testid="national-map"/);
  assert.match(source, /data-testid="your-races"/);
});

test("national map fills the viewport and the state page uses one scroll", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.national-shell\s*\{[^}]*height:\s*100dvh/);
  assert.match(css, /\.map-main\s*\{[^}]*overflow:\s*auto/);
  assert.match(css, /\.state-shell\s*\{[^}]*flex-direction:\s*column/);
  const block = css.slice(css.indexOf("@media (min-width: 1024px)"));
  assert.match(block, /\.state-shell\s*\{[^}]*display:\s*grid/);
  assert.match(block, /\.state-map-pane\s*\{[^}]*position:\s*sticky/);
  assert.equal(/\.state-overview\s*\{[^}]*overflow:\s*auto/.test(block), false);
  assert.equal(/max-height:\s*100dvh/.test(block), false);
});
