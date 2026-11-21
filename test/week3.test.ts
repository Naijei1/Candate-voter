import assert from "node:assert/strict";
import test from "node:test";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import nextConfig from "../next.config";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { postCorrection } from "../src/lib/corrections";
import { createCorrectionLimits } from "../src/lib/limits/dynamo-limit";
import { isVotingAdvice } from "../src/lib/chat/prompt";
import { isVagueRunningQuestion } from "../src/lib/chat/intent";

function corrections() {
  const counts = new Map<string, number>();
  let now = Date.parse("2026-11-20T23:00:00Z");
  let saved = 0;
  const limits = createCorrectionLimits(process.env, {
    async send(command) {
      const key = JSON.stringify(command.input.Key);
      const hits = (counts.get(key) ?? 0) + 1;
      counts.set(key, hits);
      return { Attributes: { hits } };
    },
  });
  return {
    send(address: string, body: { note?: string; website?: string } = { note: "Please check this." }) {
      return postCorrection(new Request("https://voter.naijei.com/api/corrections", {
        method: "POST",
        headers: { "x-forwarded-for": `${address}, 192.0.2.1` },
        body: JSON.stringify(body),
      }), { ...limits, now: () => now, save: async () => { saved++; } });
    },
    nextHour() { now += 3_600_000; },
    get saved() { return saved; },
    counts,
  };
}

test("correction honeypot returns success without counting or storing", async () => {
  const fixture = corrections();
  const trap = await fixture.send("203.0.113.1", { website: "spam" });
  assert.equal(trap.status, 200);
  assert.equal(fixture.counts.size, 0);
  assert.equal(fixture.saved, 0);
  assert.deepEqual(await trap.json(), await (await fixture.send("203.0.113.1")).json());
});

test("corrections accept five notes per IP per hour", async () => {
  const fixture = corrections();
  for (let n = 0; n < 5; n++) assert.equal((await fixture.send("203.0.113.1")).status, 200);
  const limited = await fixture.send("203.0.113.1");
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { stored: false, message: "Too many notes. Try again later." });
  assert.equal((await fixture.send("203.0.113.2")).status, 200);
  fixture.nextHour();
  assert.equal((await fixture.send("203.0.113.1")).status, 200);
});

test("the shared corrections cap resets at UTC midnight", async () => {
  const fixture = corrections();
  for (let n = 1; n <= 200; n++) assert.equal((await fixture.send(`203.0.113.${n}`)).status, 200);
  assert.equal((await fixture.send("203.0.113.201")).status, 429);
  assert.equal(fixture.saved, 200);
  fixture.nextHour();
  assert.equal((await fixture.send("203.0.113.201")).status, 200);
});

test("correction IP failures allow a request while global failures stop it", async () => {
  const limits = createCorrectionLimits(process.env, {
    async send() { throw new Error("Unavailable"); },
  });
  const now = Date.parse("2026-11-20T23:00:00Z");
  assert.deepEqual(await limits.perIp.take("203.0.113.1", now), { ok: true });
  assert.deepEqual(await limits.daily.take("", now), { ok: false, retryAfterSeconds: 3600 });
});

test("sitewide security headers coexist with asset caching", async () => {
  const rules = await nextConfig.headers!();
  const keys = rules.find(({ source }) => source === "/(.*)")?.headers.map(({ key }) => key);
  for (const key of ["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "Content-Security-Policy"]) {
    assert.ok(keys?.includes(key), key);
  }
  assert.ok(rules.some(({ source, headers }) => source === "/video/:path*" && headers.some(({ key }) => key === "Cache-Control")));
});

test("legacy pages permanently redirect to the Kentucky site", async () => {
  const origin = "https://voter.naijei.com";
  const config = { ...nextConfig, basePath: "/voter" };
  for (const [source, destination] of [
    ["/states", "/states/ky"], ["/states/oh", "/states/ky"],
    ["/agent", "/sources"], ["/chat?year=2026", "/ask?year=2026"],
    ["/polls", "/"], ["/measures", "/"], ["/measures/ky/example", "/"],
  ]) {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}/voter${source}`, nextConfig: config });
    assert.equal(response.status, 308, source);
    assert.equal(response.headers.get("location"), `${origin}/voter${destination === "/" ? "" : destination}`);
  }
  const kentucky = await unstable_getResponseFromNextConfig({ url: `${origin}/voter/states/ky`, nextConfig: config });
  assert.equal(kentucky.headers.get("location"), null);
});

test("robots and sitemap use canonical Kentucky URLs", () => {
  assert.match(String(robots().sitemap), /^https:\/\/voter\.naijei\.com\//);
  const urls = sitemap().map(({ url }) => new URL(url));
  assert.ok(urls.every(({ origin }) => origin === "https://voter.naijei.com"));
  assert.ok(urls.some(({ pathname }) => pathname.endsWith("/races/2026-senate-KY/compare")));
  assert.ok(urls.every(({ pathname }) => !/\/(admin|account|api)(?:\/|$)/.test(pathname)));
});

test("Ask distinguishes ordinary roster questions from requests for advice", () => {
  for (const question of ["Who can I vote for in Kentucky?", "Who is on my ballot?", "Who is on the ballot?", "Who is running?", "What am I voting for?"]) {
    assert.equal(isVotingAdvice(question), false, question);
    assert.equal(isVagueRunningQuestion(question), true, question);
  }
  for (const question of ["Who should I vote for?", "Should I vote for X?", "Who do I vote for?", "Who is the best candidate?", "Who is the better candidate?", "Who to vote for?", "Which candidate should I pick?", "Which candidate should I support?", "Recommend a candidate."]) {
    assert.equal(isVotingAdvice(question), true, question);
  }
});
