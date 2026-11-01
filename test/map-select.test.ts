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

test("homepage is a document in the navy and red palette, not a map shell", () => {
  const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const brand = readFileSync(new URL("../src/content/brand.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(page, /brand\.headline/);
  assert.match(brand, /Your elections\. All in one place\./);
  assert.match(page, /Explore by state/);
  assert.equal(page.includes("Landing"), false);
  assert.equal(page.includes("your ballot"), false);
  assert.match(css, /--color-navy:\s*#142b49/);
  assert.match(css, /--color-cta:\s*#b32635/);
  assert.match(css, /--color-paper:\s*#f4f6f8/);
  assert.match(css, /--color-ink:\s*#202833/);
  assert.equal(/prefers-color-scheme:\s*dark/.test(css), false);
  assert.equal(/body\s*\{[^}]*overflow:\s*hidden/.test(css), false);
  assert.equal(/\.national-shell/.test(css), false);
});
