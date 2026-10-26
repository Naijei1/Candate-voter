import assert from "node:assert/strict";
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
