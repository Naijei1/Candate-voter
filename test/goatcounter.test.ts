import assert from "node:assert/strict";
import test from "node:test";
import { isGoatCounterHostname, normalizeGoatCounterPath, sendCityPageview } from "../src/lib/goatcounter";

test("GoatCounter is enabled only on both production hostnames", () => {
  assert.equal(isGoatCounterHostname("voter.naijei.com"), true);
  assert.equal(isGoatCounterHostname("main.d253xhq1uabld3.amplifyapp.com"), true);
  for (const hostname of [
    "", "localhost", "127.0.0.1", "192.168.1.4", "admin.naijei.com",
    "www.voter.naijei.com", "voter.naijei.com.evil.test", "preview.amplifyapp.com",
  ]) {
    assert.equal(isGoatCounterHostname(hostname), false, hostname);
  }
});

test("GoatCounter paths contain only known labels and placeholders", () => {
  for (const [input, expected] of [
    ["/ballot?race=personal#address", "/ballot"],
    ["/account/jane%40example.com", "/account/:id"],
    ["/users/5ebf3755-18c4-49de-9b1f-9fcbd149a527", "/users/:id"],
    ["/alerts/123456789012/settings/reset-token", "/alerts/:id"],
    ["/map/123%20Main%20Street", "/:unknown"],
    ["/search/Jane-Doe", "/:unknown"],
    ["/candidates/public-slug", "/candidates/:id"],
    ["/races/public-slug/compare/", "/races/:id/compare"],
    ["/states/ky", "/states/ky"],
    ["/measures/KY/referendum", "/:unknown"],
    ["/finance/committees/C00000001", "/finance/committees/:id"],
  ]) {
    assert.equal(normalizeGoatCounterPath(input), expected, input);
  }
});

test("city pageviews send only the sanitized GoatCounter label", (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  const path = normalizeGoatCounterPath("/voter/races/private-slug/compare/?search=personal#address", "/voter");
  sendCityPageview(path, {
    location: { hostname: "voter.naijei.com", protocol: "https:" },
    navigator: {},
  });

  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ["https://admin.naijei.com/api/city", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"path":"/races/:id/compare"}',
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }]);
});

test("city pageviews skip opt-outs, non-HTTPS pages, and non-production hosts", (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  const browser = {
    location: { hostname: "voter.naijei.com", protocol: "https:" },
    navigator: {},
  };

  for (const settings of [
    { navigator: { doNotTrack: "1" } },
    { doNotTrack: "1" },
    { navigator: { globalPrivacyControl: true } },
    { location: { ...browser.location, protocol: "http:" } },
    { location: { ...browser.location, hostname: "localhost" } },
  ]) {
    sendCityPageview("/privacy", { ...browser, ...settings });
  }

  assert.equal(fetchMock.mock.callCount(), 0);
});
