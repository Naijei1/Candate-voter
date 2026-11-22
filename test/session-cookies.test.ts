import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { ID_COOKIE, ID_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, sessionCookie, shouldRefresh } from "../src/lib/auth/session-cookies";
import { middleware } from "../src/middleware";

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

test("middleware clears the refresh cookie only when Cognito rejects the token", async (t) => {
  for (const name of ["COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID"]) {
    const previous = process.env[name];
    process.env[name] = "test";
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
  const fetch = t.mock.method(globalThis, "fetch");
  const cases = [
    { name: "timeout", failure: new DOMException("Timed out", "TimeoutError"), clear: false },
    { name: "network failure", failure: new TypeError("fetch failed"), clear: false },
    { name: "5xx", status: 503, body: { error: "invalid_grant" }, clear: false },
    { name: "throttling", status: 400, body: { __type: "TooManyRequestsException" }, clear: false },
    { name: "invalid grant", status: 400, body: { error: "invalid_grant" }, clear: true },
    { name: "Cognito authorization error", status: 400, body: { __type: "com.amazonaws.cognito#NotAuthorizedException" }, clear: true },
    { name: "revoked token", status: 400, body: { message: "Refresh token has been revoked" }, clear: true },
  ];
  for (const { name, failure, status, body, clear } of cases) {
    fetch.mock.mockImplementationOnce(async () => {
      if (failure) throw failure;
      return Response.json(body, { status });
    });
    const request = new NextRequest("https://voter.example/", {
      headers: { cookie: `${REFRESH_COOKIE}=refresh; ${ID_COOKIE}=stale` },
    });
    const response = await middleware(request);
    assert.equal(response.cookies.get(ID_COOKIE)?.maxAge, 0, name);
    assert.equal(response.cookies.get(REFRESH_COOKIE)?.maxAge, clear ? 0 : undefined, name);
    assert.equal(request.cookies.get(REFRESH_COOKIE)?.value, clear ? undefined : "refresh", name);
  }
});
