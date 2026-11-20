import assert from "node:assert/strict";
import test from "node:test";
import { memoizeRead } from "../src/lib/cache/memo";

const TEN_MINUTES = 600_000;
const SIX_HOURS = 21_600_000;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("concurrent misses share one read and fresh hits reuse its value", async () => {
  let reads = 0;
  let now = 0;
  const read = memoizeRead(async (key: string) => ({ key, read: ++reads }), (error) => { throw error; }, () => now);
  const [a, b] = await Promise.all([read("ky"), read("ky")]);
  assert.equal(reads, 1);
  assert.equal(a, b);
  now = TEN_MINUTES - 1;
  assert.equal(await read("ky"), a);
  assert.equal(reads, 1);
});

test("stale hits return immediately during a single background refresh", async () => {
  let reads = 0;
  let now = 0;
  let finish!: (value: number) => void;
  const pending = new Promise<number>((resolve) => { finish = resolve; });
  const read = memoizeRead(async () => ++reads === 1 ? 1 : pending, (error) => { throw error; }, () => now);
  assert.equal(await read("ky"), 1);
  now = TEN_MINUTES;
  assert.deepEqual(await Promise.all([read("ky"), read("ky")]), [1, 1]);
  assert.equal(reads, 2);
  finish(2);
  await flush();
  assert.equal(await read("ky"), 2);
  assert.equal(reads, 2);
});

test("refresh failures keep the last good value for six hours and log once per outage", async () => {
  let reads = 0;
  let now = 0;
  const errors: unknown[] = [];
  const failure = new Error("unavailable");
  const read = memoizeRead(async () => {
    if (++reads === 1) return "good";
    throw failure;
  }, (error) => errors.push(error), () => now);
  assert.equal(await read("ky"), "good");
  now = TEN_MINUTES;
  assert.equal(await read("ky"), "good");
  await flush();
  assert.equal(await read("ky"), "good");
  assert.equal(reads, 2);
  now = SIX_HOURS - 1;
  assert.equal(await read("ky"), "good");
  await flush();
  now = SIX_HOURS;
  await assert.rejects(read("ky"), failure);
  assert.equal(reads, 3);
  assert.deepEqual(errors, [failure]);
});
