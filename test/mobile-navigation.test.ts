import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { currentTab, keyboardOpen, MOBILE_TABS, raisesKeyboard } from "../src/components/site/MobileNavigation";

test("phone navigation goes directly to the five existing Kentucky guide destinations", () => {
  assert.deepEqual(MOBILE_TABS.map(({ href }) => href), ["/", "/ballot", "/news", "/finance", "/ask"]);
  for (const { href, label } of MOBILE_TABS) {
    assert.ok(existsSync(join("src/app", href, "page.tsx")), href);
    assert.doesNotMatch(label, /about|national|states|congress|local|watchlist/i);
    assert.equal(currentTab(href, href), "page");
  }
});

test("detail pages keep the relevant tab marked without marking Home", () => {
  for (const [path, expected] of [
    ["/races/2026-senate-KY/compare", "/ballot"],
    ["/candidates", "/ballot"],
    ["/candidates/S6KY00286", "/ballot"],
    ["/finance/committees/C1", "/finance"],
  ] as const) {
    assert.deepEqual(MOBILE_TABS.filter(({ href }) => currentTab(path, href)).map(({ href }) => href), [expected]);
  }
  assert.equal(currentTab("/finance-example", "/finance"), undefined);
});

test("the ZIP link follows the map and mockup election claims stay out of source", () => {
  const hero = readFileSync("src/components/home/Hero.tsx", "utf8");
  assert.doesNotMatch(hero, /<input|<Zip(?:Lookup|Search)|href=["'][^"']*zip/i);
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert.match(home, /<HomeMap\b[\s\S]+?className="zip-link"[\s\S]+?Or enter a ZIP code/);
  for (const path of readdirSync("src", { recursive: true, encoding: "utf8" })) {
    if (!/\.(tsx?|css|json)$/.test(path)) continue;
    const source = readFileSync(join("src", path), "utf8");
    assert.doesNotMatch(source, /R\s*\+23\.1|Trump last won|Trump margin|63rd governor|seeking a second term/i, path);
  }
});

test("tab names match the page titles they open", () => {
  assert.deepEqual(MOBILE_TABS.map(({ label }) => label), ["Home", "My races", "News Feed", "Finances", "Ask"]);
  assert.match(readFileSync("src/app/news/page.tsx", "utf8"), /<h1>News Feed<\/h1>/);
  assert.match(readFileSync("src/app/finance/page.tsx", "utf8"), /<h1>Candidates&apos; Political Finances<\/h1>/);
});

test("the tab bar hides while the on-screen keyboard is open", () => {
  assert.equal(keyboardOpen({ focusedField: true, layoutHeight: 844, visualHeight: 844 }), true);
  assert.equal(keyboardOpen({ focusedField: false, layoutHeight: 844, visualHeight: 500 }), true);
  assert.equal(keyboardOpen({ focusedField: false, layoutHeight: 844, visualHeight: 800 }), false);
  assert.equal(keyboardOpen({ focusedField: false, layoutHeight: 844, visualHeight: null }), false);
  const field = (tag: string, type?: string) => Object.assign(new EventTarget(), {
    matches: (selector: string) => selector.split(",").some((part) => part.trim().split("[")[0] === tag),
    getAttribute: () => type ?? null,
  });
  assert.equal(raisesKeyboard(field("input")), true);
  assert.equal(raisesKeyboard(field("input", "tel")), true);
  assert.equal(raisesKeyboard(field("input", "checkbox")), false);
  assert.equal(raisesKeyboard(field("textarea")), true);
  assert.equal(raisesKeyboard(field("button")), false);
  assert.equal(raisesKeyboard(null), false);
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /html\[data-keyboard="open"\] \.mobile-tabs \{ display: none; \}/);
});

function phoneBlock(): string {
  const css = readFileSync("src/app/globals.css", "utf8");
  const start = css.indexOf(".mobile-tabs,\n.mobile-candidates");
  assert.ok(start > 0);
  return css.slice(start);
}

test("the film stays full-screen on phones with the light shade", () => {
  const phone = phoneBlock();
  assert.match(phone, /\.hero-stage \{\s*min-height: 100svh;/);
  assert.equal(/\.hero-shade \{/.test(phone), false, "no darker phone-only shade");
  assert.equal(/\.site-header\.is-overlay \{ position: relative/.test(phone), false, "header stays over the film");
});

test("Back/Next and page action bars stay pinned above the tab bar", () => {
  const phone = phoneBlock();
  assert.match(phone, /\.ballot-bar,\s*\.sticky-mobile \{\s*position: fixed;[\s\S]*?bottom: var\(--tab-space\);/);
  assert.equal(/position: static;\s*max-height: none/.test(phone), false);
  assert.match(phone, /body:has\(\.ballot-bar\),\s*body:has\(\.sticky-mobile\) \{ padding-bottom: calc\(var\(--tab-space\) \+ 4\.5rem\); \}/);
});

test("race cards keep the photo credit inside the card", () => {
  const race = readFileSync("src/app/races/[raceId]/page.tsx", "utf8");
  assert.match(race, /credit=\{photoAttribution\(photo\)\}/);
  assert.equal(/<p className="hint">\{photo\.credit\}<\/p>/.test(race), false);
  assert.match(readFileSync("src/components/site/PersonFace.tsx", "utf8"), /person-face-credit/);
});
