import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { snapshotFinance } from "../src/lib/finance/snapshot";
import { kentuckyMoneyCards } from "../src/lib/site/today";
import { recentKentuckyPosts, X_BEARER_ENV } from "../src/lib/site/x-posts";

test("home money cards use November ballot totals and skip primary losers", () => {
  const snap = snapshotFinance();
  const cards = kentuckyMoneyCards(snap, "2026-11-02T19:42:16Z");
  const all = [...cards.spending, ...cards.receipts, ...cards.filings];
  assert.ok(all.length > 0);
  const text = all.map((card) => `${card.title} ${card.text}`).join("\n");
  assert.match(text, /Andy Barr/);
  assert.equal(/Nate Morris|Daniel Cameron/.test(text), false);
  assert.equal(/donated \$|gave \$|Jane Doe/.test(text), false);
  for (const card of all) {
    assert.match(card.sourceUrl, /^https:\/\//);
    if (card.date) assert.match(card.when ?? "", /^[A-Z][a-z]{2} \d{1,2}, 20\d{2}$/);
    else assert.equal(card.when, null);
    assert.match(card.text, /outside spending|^Raised \$/);
    assert.doesNotMatch(card.text, /stored|committee total|one payment/);
  }
  assert.ok(cards.spending.every((card) => card.sourceName === "FEC"));
});

test("posts on X stay hidden when the bearer token is unset", async () => {
  const previous = process.env[X_BEARER_ENV];
  delete process.env[X_BEARER_ENV];
  assert.equal(await recentKentuckyPosts(), null);
  if (previous !== undefined) process.env[X_BEARER_ENV] = previous;
});

test("the home page leads with the hero, the Kentucky map, and FEC activity", () => {
  // v12: the hero is a CSS line drawing of the country with the available state lit; the guide is county-first.
  // v13: below the hero, the election status line and one-tap county picks replace the matchup, Featured and state list.
  const page = readFileSync("src/app/page.tsx", "utf8");
  const hero = readFileSync("src/components/tv/Hero.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(page, /<Hero \/>/);
  assert.match(page, /<ElectionStatus where \/>/);
  assert.match(page, /state\.quickCounties\.map/);
  assert.match(hero, /Your U\.S\. Senate<\/span> <span>and House races/);
  assert.match(hero, /races available/);
  assert.equal(page.includes("Kentucky Lantern"), false);
  assert.equal(page.includes("<input"), false);
  assert.match(readFileSync("src/components/tv/client/Yours.tsx", "utf8"), /"Find my races"/);
  assert.match(readFileSync("src/components/tv/client/device.ts", "utf8"), /\/ballot\?county=/);
  assert.equal(page.includes("latestNews"), false);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.hero \*, \.hero \{ animation: none !important; \}/);
  assert.match(hero, /<YoursCta /);
  assert.equal(hero.includes("Pause video"), false);
  assert.equal(hero.includes("Play video"), false);
  assert.match(readFileSync("src/components/tv/client/HeroBits.tsx", "utf8"), /IntersectionObserver/);
  assert.match(readFileSync("docs/sources.md", "utf8"), /2\.2\.2/);
  assert.match(readFileSync("src/config/brand.ts", "utf8"), /headline: "Vote\."/);
  assert.match(readFileSync("docs/sources.md", "utf8"), /X_BEARER_TOKEN/);
});
