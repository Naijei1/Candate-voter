import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { currentTab, MOBILE_TABS } from "../src/components/site/MobileNavigation";

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
