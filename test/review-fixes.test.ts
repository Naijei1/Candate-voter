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
  const compare = readFileSync("src/app/races/[raceId]/compare/page.tsx", "utf8");
  const candidate = readFileSync("src/app/candidates/[candidateId]/page.tsx", "utf8");
  assert.match(compare, /nextHref="\/ballot"/);
  assert.equal(compare.includes('nextHref="/"'), false);
  assert.match(candidate, /href="\/ballot"/);
  const yourBallot = candidate.slice(candidate.indexOf("Your ballot") - 80, candidate.indexOf("Your ballot"));
  assert.match(yourBallot, /href="\/ballot"/);
});

test("footer links are white with a light focus ring", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.site-footer a\s*\{[^}]*color:\s*#fff/);
  assert.match(css, /\.site-footer a:focus-visible\s*\{[^}]*outline:\s*3px solid #fff/);
});

test("the film stays paused off screen when the tab returns", () => {
  assert.equal(shouldPlayFilm({ tabHidden: false, heroOnScreen: true }), true);
  assert.equal(shouldPlayFilm({ tabHidden: false, heroOnScreen: false }), false);
  assert.equal(shouldPlayFilm({ tabHidden: true, heroOnScreen: true }), false);
  const hero = readFileSync("src/components/home/Hero.tsx", "utf8");
  assert.match(hero, /shouldPlayFilm/);
  assert.match(hero, /heroOnScreen: onScreen/);
  assert.equal(hero.includes("Pause video"), false);
  assert.equal(hero.includes("Play video"), false);
});
