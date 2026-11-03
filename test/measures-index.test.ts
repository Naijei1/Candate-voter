import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("the measures index links to states and kinds", () => {
  const page = readFileSync("src/app/measures/page.tsx", "utf8");
  const kinds = readFileSync("src/lib/site/measure-kinds.ts", "utf8");
  assert.match(page, /\/measures\/ky\/\$\{kind\.id\}/);
  assert.match(kinds, /proposition/);
  assert.match(kinds, /referendum/);
  assert.match(kinds, /retention/);
  assert.match(page, /\/measures\/\$\{state\.postal\.toLowerCase\(\)\}/);
  assert.match(page, /No certified question is loaded yet/);
});

test("header and footer links have pages", () => {
  const header = readFileSync("src/components/SiteHeader.tsx", "utf8");
  const footer = readFileSync("src/components/SiteFooter.tsx", "utf8");
  const hrefs = new Set<string>();
  for (const source of [header, footer]) {
    for (const match of source.matchAll(/href(?:=|: )\"(\/[^\"#?]*)/g)) {
      const path = match[1];
      if (path && path !== "/") hrefs.add(path);
    }
  }
  assert.equal(hrefs.has("/measures"), true);
  for (const path of hrefs) {
    const page = `src/app${path}/page.tsx`;
    assert.equal(existsSync(page), true, page);
  }
});
