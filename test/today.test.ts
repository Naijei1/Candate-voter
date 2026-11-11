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
    assert.match(card.when, /^Retrieved 2026-/);
    assert.match(card.text, /total/);
  }
  assert.ok(cards.spending.every((card) => card.sourceName === "FEC independent expenditures"));
});

test("posts on X stay hidden when the bearer token is unset", async () => {
  const previous = process.env[X_BEARER_ENV];
  delete process.env[X_BEARER_ENV];
  assert.equal(await recentKentuckyPosts(), null);
  if (previous !== undefined) process.env[X_BEARER_ENV] = previous;
});

test("the home page leads with the hero, the Kentucky map, and stored records", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");
  const hero = readFileSync("src/components/home/Hero.tsx", "utf8");
  assert.match(page, /Hero/);
  assert.match(page, /DistrictMap/);
  assert.match(page, /TodayOnCandate/);
  assert.equal(page.includes("Kentucky Lantern"), false);
  assert.equal(page.includes("latestNews"), false);
  assert.match(hero, /prefers-reduced-motion/);
  assert.match(hero, /Pause video/);
  assert.match(hero, /vote-hero\.mp4/);
  assert.match(readFileSync("src/config/brand.ts", "utf8"), /headline: "Vote\."/);
  assert.match(readFileSync("docs/sources.md", "utf8"), /X_BEARER_TOKEN/);
});
