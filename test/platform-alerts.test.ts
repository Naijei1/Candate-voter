import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canDispatch, DISPATCH_HEADER, sendNewEvents } from "../src/lib/alerts/dispatch";
import { certifiedEvents, fecReportEvents, parseSosFilings, sosEvents, SOS_SENATE, type SosFiling } from "../src/lib/alerts/events";
import { ALERT_FOLLOW_LIMIT, followFilter, MUTED_FILTER } from "../src/lib/alerts/filter";
import type { FinanceDirect } from "../src/lib/finance/model";

const sourceRows = JSON.parse(readFileSync("data/ky-sos-filing-snapshot.json", "utf8")) as SosFiling[];

const report: FinanceDirect = {
  scope: "period", candidateId: "S6KY00286", raceId: "2026-senate-KY", name: "Andy Barr", committeeId: "C00467571", committeeName: null,
  cycle: 2026, receipts: null, disbursements: null, cashOnHand: null, debts: null, coverageStart: null, coverageEnd: null,
  fileNumber: "1234", sourceLabel: "FEC committee report", sourceUrl: "https://docquery.fec.gov/report.pdf", updatedAt: "2026-11-22T00:00:00Z",
};

test("SNS filters use unique follow keys, cap at 100, and match nothing without eligible follows", () => {
  assert.equal(followFilter([{ targetType: "issue", targetId: "health" }]), MUTED_FILTER);
  const sample = [
    { targetType: "race" as const, targetId: "2026-senate-KY" },
    { targetType: "candidate" as const, targetId: "S6KY00286" },
  ];
  assert.deepEqual(JSON.parse(followFilter([...sample, ...sample])), {
    follow: ["candidate:S6KY00286", "race:2026-senate-KY"],
  });
  const long = Array.from({ length: 110 }, (_, id) => ({ targetType: "race" as const, targetId: String(id) }));
  assert.equal(JSON.parse(followFilter(long)).follow.length, ALERT_FOLLOW_LIMIT);
});

test("only stored finance periods, SOS entries and explicitly certified results produce events", () => {
  const [fec] = fecReportEvents([report, { ...report, scope: "cycle" }, { ...report, sourceUrl: null }]);
  assert.equal(fec.id, "fec:C00467571:1234");
  assert.deepEqual(fec.follow, ["race:2026-senate-KY", "candidate:S6KY00286"]);
  assert.equal(fecReportEvents([{ ...report, raceId: "2026-senate-TN" }]).length, 0);

  const row = sourceRows.find(({ id }) => id === "11385")!;
  const html = `<option selected="selected">2026 General Election</option><div id="ctl00_MainContent_pOfficeResults"><tr class="boldleft"><td><a href="Default.aspx?cand=${row.id}">${row.name}</a></td><td></td><td>US Senator</td><td></td><td></td><td>${row.filed}</td></tr></div>`;
  assert.deepEqual(parseSosFilings(html, SOS_SENATE), [{ id: row.id, raceId: row.raceId, name: row.name, filed: row.filed, sourceUrl: row.sourceUrl }]);
  assert.deepEqual(sosEvents([row])[0].follow, ["race:2026-senate-KY", "candidate:S6KY00286"]);
  assert.throws(() => parseSosFilings("<html></html>", SOS_SENATE));

  const official = "https://elect.ky.gov/results/2020-2029/Pages/2026.aspx";
  const input = (status: string) => [{ raceId: "2026-senate-KY", election: "general", status, sourceUrl: official }];
  assert.deepEqual(certifiedEvents(input("unofficial")), []);
  assert.equal(certifiedEvents(input("certified"))[0]?.id, "certified:2026-senate-KY");
  assert.equal(certifiedEvents([{ ...input("certified")[0], election: "primary", party: "Democratic Party" }])[0]?.id,
    "certified:2026-senate-KY:primary:Democratic Party");
  assert.deepEqual(certifiedEvents(null), []);
});

test("dispatch coalesces matching follows into one publish and claims an event once across invocations", async () => {
  const [event] = fecReportEvents([report]);
  const ids = new Set<string>();
  const sent: string[][] = [];
  async function claim({ id }: typeof event) {
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  }
  const publish = async (item: typeof event) => { sent.push(item.follow); };
  const inputs = [event, { ...event, follow: ["candidate:S6KY00385"] }];
  const runs = await Promise.all([sendNewEvents(inputs, claim, publish), sendNewEvents(inputs, claim, publish)]);
  assert.equal(runs.reduce((n, count) => n + count), 1);
  assert.deepEqual(sent, [[...event.follow, "candidate:S6KY00385"]]);
});

test("alert dispatch requires the configured secret header", () => {
  const req = (secret?: string) => new Request("https://voter.example/api/alerts/dispatch", {
    method: "POST", headers: secret ? { [DISPATCH_HEADER]: secret } : {},
  });
  assert.equal(canDispatch(req("secret"), "secret"), true);
  assert.equal(canDispatch(req("secreT"), "secret"), false);
  assert.equal(canDispatch(req("different length"), "secret"), false);
  assert.equal(canDispatch(req(), "secret"), false);
  assert.equal(canDispatch(req("secret"), ""), false);
});
