import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeBasePath, withBasePath } from "../src/lib/base-path";

test("base path stays empty unless a real prefix is configured", () => {
  assert.equal(normalizeBasePath(undefined), "");
  assert.equal(normalizeBasePath("  "), "");
  assert.equal(normalizeBasePath("/"), "");
  assert.equal(normalizeBasePath("voter"), "/voter");
  assert.equal(normalizeBasePath("/voter/"), "/voter");
  assert.equal(withBasePath("/openapi.yaml", { NEXT_PUBLIC_BASE_PATH: "/voter" }), "/voter/openapi.yaml");
  assert.equal(withBasePath("/openapi.yaml", {}), "/openapi.yaml");
});

test("the candidate correction form applies the base path to its POST", () => {
  const form = readFileSync(new URL("../src/components/site/CandidateCorrection.tsx", import.meta.url), "utf8");
  assert.match(form, /fetch\(withBasePath\("\/api\/corrections"\),\s*\{\s*method: "POST"/);
  assert.equal(withBasePath("/api/corrections", { NEXT_PUBLIC_BASE_PATH: "/voter" }), "/voter/api/corrections");
});
