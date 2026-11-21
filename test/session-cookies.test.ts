import assert from "node:assert/strict";
import test from "node:test";
import { ID_MAX_AGE, REFRESH_MAX_AGE, sessionCookie, shouldRefresh } from "../src/lib/auth/session-cookies";

function token(exp: unknown) {
  return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
}

test("refresh needs a refresh cookie and an absent, unreadable, or nearly expired ID token", () => {
  assert.equal(shouldRefresh(undefined, undefined, 100), false);
  assert.equal(shouldRefresh(undefined, "refresh", 100), true);
  assert.equal(shouldRefresh("header.!.signature", "refresh", 100), true);
  assert.equal(shouldRefresh(token("200"), "refresh", 100), true);
  assert.equal(shouldRefresh(token(99), "refresh", 100), true);
  assert.equal(shouldRefresh(token(160), "refresh", 100), true);
  assert.equal(shouldRefresh(token(161), "refresh", 100), false);
});

test("session cookies are secure and refresh lasts 30 days", () => {
  assert.deepEqual(sessionCookie, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  assert.equal(ID_MAX_AGE, 3600);
  assert.equal(REFRESH_MAX_AGE, 2_592_000);
});
