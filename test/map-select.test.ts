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
  // v12: district links draw focus on the path; the selected district or county keeps the dark fill.
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.kymap a:focus-visible \{ outline: none; \}/);
  assert.match(css, /\.kymap a:focus-visible \.d \{ stroke: var\(--focus\)/);
  assert.match(css, /\.kymap \.d\.on, \.kymap a:nth-of-type\(2n\) \.d\.on \{ fill: var\(--map-on\); \}/);
  assert.match(css, /\.kymap \.cty\.on \{ fill: var\(--map-on\); \}/);
});

test("homepage is a document in the navy and red palette, not a map shell", () => {
  // v12: the guide is county-first (CountyGuide) and the palette is navy #142B49 with crimson #a8123e, light and dark.
  const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const brand = readFileSync(new URL("../src/content/brand.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(page, /<Hero \/>/);
  assert.match(readFileSync(new URL("../src/app/ballot/page.tsx", import.meta.url), "utf8"), /<CountyGuide/);
  assert.match(brand, /Kentucky’s federal elections\./);
  assert.equal(page.includes("Landing"), false);
  assert.match(css, /--navy-800: #142B49;/);
  assert.match(css, /--red-600: #a8123e;/);
  assert.match(css, /--color-navy: #142b49;/);
  assert.match(css, /\[data-theme="dark"\] \{/);
  assert.equal(/body\s*\{[^}]*overflow:\s*hidden/.test(css), false);
  assert.equal(/\.national-shell/.test(css), false);
});
