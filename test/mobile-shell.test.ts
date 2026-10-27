import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("mobile shell keeps the desktop map grid and adds Safari safe areas", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /100dvh/);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /\.national-shell\s*\{[^}]*height:\s*100dvh/);
  assert.match(css, /\.map-main\s*\{[^}]*overflow:\s*auto/);

  const desktop = css.slice(css.indexOf("@media (min-width: 1024px)"));
  assert.match(desktop, /\.state-shell\s*\{[^}]*display:\s*grid/);
  assert.match(desktop, /\.state-map-pane\s*\{[^}]*position:\s*sticky/);
  assert.equal(/\.state-overview\s*\{[^}]*overflow:\s*auto/.test(desktop), false);
  assert.equal(/max-height:\s*100dvh/.test(desktop), false);

  const mobile = css.slice(css.indexOf("@media (max-width: 1023px)"), css.indexOf("@media (max-width: 420px)"));
  assert.match(mobile, /\.state-sheet-body\s*\{[^}]*overflow-x:\s*hidden/);
  assert.match(mobile, /\.state-sheet-body\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(mobile, /\.state-overview\s*\{[^}]*overflow:\s*hidden/);
  assert.match(mobile, /\.state-overview\s*\{[^}]*max-height:\s*var\(--sheet-height,\s*var\(--state-sheet-max\)\)/);
  assert.match(mobile, /--state-sheet-max:\s*min\(40dvh,\s*calc\(100dvh - 14rem\)\)/);
  assert.equal(/\.state-overview \.back-chrome\s*\{[^}]*position:\s*sticky/.test(mobile), false);
  assert.match(mobile, /\.state-overview \.back-chrome\s*\{[^}]*position:\s*static/);
  assert.match(mobile, /\.state-map-pane\s*\{[^}]*bottom:\s*calc\(var\(--sheet-height,\s*var\(--state-sheet-max\)\)/);
  assert.match(css, /\.party-cue\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.state-sheet-body\s*\{[^}]*display:\s*contents/);
  assert.match(mobile, /\.map-legend-dock\s*\{[^}]*left:/);
  assert.match(mobile, /\.map-bottom-dock\s*\{[^}]*flex-direction:\s*column/);
  assert.match(mobile, /\.map-bottom-dock \.map-meta-dock/);
  assert.match(mobile, /html\.keyboard-open \.zip-slot/);
  assert.match(mobile, /\.row-cue\s*\{[^}]*min-height:\s*44px/);
  assert.match(mobile, /\.row-cue\s*\{[^}]*min-width:\s*44px/);
});

test("race and candidate pages keep a labeled way back to the map", () => {
  const race = readFileSync(new URL("../src/app/races/[raceId]/page.tsx", import.meta.url), "utf8");
  const candidate = readFileSync(
    new URL("../src/app/candidates/[candidateId]/page.tsx", import.meta.url),
    "utf8",
  );
  const chrome = readFileSync(new URL("../src/components/BackChrome.tsx", import.meta.url), "utf8");
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.match(race, /<BackChrome/);
  assert.match(race, /district=\{race\.office === "house"\}/);
  assert.match(race, /<summary>Details<\/summary>/);
  assert.match(race, /id="candidates-heading"/);
  assert.match(candidate, /<BackChrome/);
  assert.match(candidate, /raceHref=/);
  assert.match(candidate, /<summary>Details<\/summary>/);
  assert.match(chrome, /Back to map/);
  assert.match(chrome, /Your races/);
  assert.match(chrome, /mapHomeHref/);
  assert.match(chrome, /zip/);
  assert.match(landing, /data-testid="back-to-map"/);
  assert.match(landing, /id="your-races"/);
  assert.match(landing, /withPreservedQuery/);
  assert.equal(landing.includes("homeValueLine"), false);
  assert.equal(landing.includes("WhatAmILookingAt"), false);
  assert.match(landing, /onBack=\{backToMap\}/);
  assert.match(landing, /onSheetDismiss=\{pinYours \? null : backToMap\}/);
  assert.equal(/onBack=\{pinYours \? null : backToMap\}/.test(landing), false);

  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const narrow = css.slice(css.indexOf("@media (max-width: 420px)"));
  assert.equal(/clip:\s*rect\(0,\s*0,\s*0,\s*0\)/.test(narrow), false);
  assert.match(narrow, /\.map-chrome \.brand-name[\s\S]*?white-space:\s*nowrap/);
  assert.match(narrow, /\.site-header \.brand-name/);
  const brand = narrow.slice(narrow.indexOf(".map-chrome .brand-name"), narrow.indexOf(".site-header .brand-tagline"));
  assert.equal(/clip:/.test(brand), false);
  assert.equal(css.includes(".details-subhead"), false);
  assert.equal(css.includes(".home-cue"), false);
  assert.equal(css.includes(".home-line"), false);
  assert.equal(css.includes(".map-chrome-info"), false);
});
