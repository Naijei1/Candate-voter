import assert from "node:assert/strict";
import test from "node:test";
import { isGoatCounterHostname, normalizeGoatCounterPath } from "../src/lib/goatcounter";

test("GoatCounter is enabled only on the exact production hostname", () => {
  assert.equal(isGoatCounterHostname("voter.naijei.com"), true);
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
    ["/states/KY/issues", "/states/:state/issues"],
    ["/measures/KY/referendum", "/measures/:state/:kind"],
    ["/finance/committees/C00000001", "/finance/committees/:id"],
  ]) {
    assert.equal(normalizeGoatCounterPath(input), expected, input);
  }
});
