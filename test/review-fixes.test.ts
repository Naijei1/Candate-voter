import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { restoresStoredPlace } from "../src/lib/place/selection";
import { shouldPlayFilm } from "../src/lib/site/film";

test("a saved place is not written back onto the landing page", () => {
  assert.equal(restoresStoredPlace("/"), false);
  assert.equal(restoresStoredPlace("/ballot"), true);
  assert.equal(restoresStoredPlace("/races/2026-house-KY-03"), true);
  const sync = readFileSync("src/components/site/PlaceSync.tsx", "utf8");
  assert.match(sync, /restoresStoredPlace\(pathname\)/);
});

test("ballot buttons leave the film and open the guide", () => {
  // v12: the hero and the header both send readers to the county guide at /ballot (or their saved county).
  const yours = readFileSync("src/components/tv/client/Yours.tsx", "utf8");
  const device = readFileSync("src/components/tv/client/device.ts", "utf8");
  assert.match(readFileSync("src/components/tv/Hero.tsx", "utf8"), /<YoursCta className="btn hero-btn" \/>/);
  assert.match(yours, /placeHref\(/);
  assert.match(device, /`\/ballot\?county=\$\{encodeURIComponent\(place\.c\)\}` : "\/ballot"/);
});

test("footer links are white with a light focus ring", () => {
  // v12 footer: light navy links that turn white on hover, and a white focus ring on the dark band.
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.ftr ul a, \.ftr \.f-link \{ color: var\(--navy-100\);/);
  assert.match(css, /\.ftr ul a:hover, \.ftr \.f-link:hover \{ text-decoration: underline; color: #fff; \}/);
  assert.match(css, /\.ftr \{[^}]*--focus: #fff;/);
});

test("the film stays paused off screen when the tab returns", () => {
  assert.equal(shouldPlayFilm({ tabHidden: false, heroOnScreen: true }), true);
  assert.equal(shouldPlayFilm({ tabHidden: false, heroOnScreen: false }), false);
  assert.equal(shouldPlayFilm({ tabHidden: true, heroOnScreen: true }), false);
  // v12 hero is a CSS line drawing; HeroPause applies the same rule by toggling .is-off.
  const hero = readFileSync("src/components/tv/client/HeroBits.tsx", "utf8");
  assert.match(hero, /shouldPlayFilm/);
  assert.match(hero, /heroOnScreen: onScreen/);
  assert.match(readFileSync("src/app/globals.css", "utf8"), /\.hero\.is-off \*, \.hero\.is-off \{ animation-play-state: paused !important; \}/);
  for (const file of ["src/components/tv/Hero.tsx", "src/components/tv/client/HeroBits.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("Pause video"), false);
    assert.equal(source.includes("Play video"), false);
  }
});
