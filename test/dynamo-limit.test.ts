import assert from "node:assert/strict";
import test from "node:test";
import { trustedClientAddress } from "../src/lib/chat/rate-limit";
import { createAiLimits } from "../src/lib/limits/dynamo-limit";

const now = Date.parse("2026-11-20T23:59:59Z");

test("shared counters ignore spoofed hops and share one daily bucket across endpoints", async () => {
  const hits = new Map<string, number>();
  const env = { CANDATE_CHAT_RATE_LIMIT: "1", CANDATE_AI_DAILY_CAP: "1" };
  const first = createAiLimits(env, {
    async send({ input }) {
      assert.equal(input.TableName, "candate-voter-users");
      assert.equal(input.ReturnValues, "UPDATED_NEW");
      const key = `${input.Key?.pk}/${input.Key?.sk}`;
      const count = (hits.get(key) ?? 0) + 1;
      hits.set(key, count);
      return { Attributes: { hits: count } };
    },
  });
  const address = (spoofed: string) => trustedClientAddress(new Request("https://example.com", {
    headers: { "x-forwarded-for": `${spoofed}, 118.108.78.0, 64.252.67.70` },
  }));
  assert.equal(address("192.0.2.1"), "118.108.78.0");
  assert.deepEqual(await first.perIp.take(address("192.0.2.1"), now), { ok: true });
  assert.deepEqual(await first.perIp.take(address("192.0.2.2"), now), { ok: false, retryAfterSeconds: 1 });
  assert.deepEqual(await first.daily.take("chat", now), { ok: true });
  assert.deepEqual(await first.daily.take("compare", now), { ok: false, retryAfterSeconds: 1 });
  assert.equal(hits.get("LIMIT#ai#daily/2026-11-20"), 2);
  assert.deepEqual(await first.daily.take("compare", now + 1000), { ok: true });
});

test("DynamoDB failures allow per-IP traffic and block model traffic", async () => {
  const limits = createAiLimits({}, { async send() { throw new Error("unavailable"); } });
  assert.deepEqual(await limits.perIp.take("unknown", now), { ok: true });
  assert.deepEqual(await limits.daily.take("daily", now), { ok: false, retryAfterSeconds: 1 });
});

test("counter writes time out even when DynamoDB ignores the abort", { timeout: 2_500 }, async () => {
  const signals: AbortSignal[] = [];
  const limits = createAiLimits({}, {
    send(_command, { abortSignal }) {
      signals.push(abortSignal);
      return new Promise(() => {});
    },
  });
  assert.deepEqual(await Promise.all([
    limits.perIp.take("unknown", now),
    limits.daily.take("daily", now),
  ]), [{ ok: true }, { ok: false, retryAfterSeconds: 1 }]);
  assert.deepEqual(signals.map((signal) => signal.aborted), [true, true]);
});
