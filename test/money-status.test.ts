import assert from "node:assert/strict";
import test from "node:test";
import type { FinanceDirect } from "../src/lib/finance/model";
import { financeHeadline, sinceLastFiling } from "../src/lib/site/money-status";
import { orderedPair, raisedOverview, type CompareCandidate } from "../src/components/site/CompareBoard";

function period(input: Partial<FinanceDirect> & Pick<FinanceDirect, "coverageStart" | "coverageEnd" | "receipts">): FinanceDirect {
  return {
    scope: "period",
    candidateId: "H6KY02068",
    raceId: "2026-house-KY-02",
    name: null,
    committeeId: "C00902130",
    committeeName: null,
    cycle: 2026,
    disbursements: null,
    cashOnHand: null,
    debts: null,
    fileNumber: null,
    sourceUrl: "https://docquery.fec.gov/example.pdf",
    sourceLabel: "FEC committee report",
    updatedAt: "2026-11-22T00:00:00Z",
    ...input,
  };
}

test("a fundraising change shows only when the two reports meet", () => {
  const touching = sinceLastFiling([
    period({ coverageStart: "2026-07-01", coverageEnd: "2026-09-30", receipts: 100 }),
    period({ coverageStart: "2026-10-01", coverageEnd: "2026-10-14", receipts: 40, sourceUrl: "https://docquery.fec.gov/latest.pdf" }),
  ]);
  assert.equal(touching?.amount, 40);
  assert.equal(touching?.since, "2026-09-30");

  const gap = sinceLastFiling([
    period({ coverageStart: "2025-04-01", coverageEnd: "2026-06-30", receipts: 7539 }),
    period({ coverageStart: "2026-10-01", coverageEnd: "2026-10-14", receipts: 2045.49 }),
  ]);
  assert.equal(gap, null);

  const otherCommittee = sinceLastFiling([
    period({ coverageStart: "2026-07-01", coverageEnd: "2026-09-30", receipts: 100, committeeId: "C1" }),
    period({ coverageStart: "2026-10-01", coverageEnd: "2026-10-14", receipts: 40, committeeId: "C2" }),
  ]);
  assert.equal(otherCommittee, null);
  assert.equal(sinceLastFiling([
    period({ coverageStart: "2026-07-01", coverageEnd: "2026-09-30", receipts: 1 }),
    period({ coverageStart: null, coverageEnd: "2026-10-14", receipts: 2 }),
  ]), null);
});

test("a stored total replaces a blank ballot seed, and an unclear set states no total", () => {
  const cycle: FinanceDirect = {
    ...period({ coverageStart: "2025-01-01", coverageEnd: "2026-10-14", receipts: 1200 }),
    scope: "cycle",
    disbursements: 400,
    cashOnHand: 800,
    sourceLabel: "FEC candidate totals",
    sourceUrl: "https://www.fec.gov/data/candidate/H6KY06242/",
  };
  const stored = financeHeadline([cycle], null);
  assert.equal(stored.kind, "reported");
  if (stored.kind === "reported") assert.equal(stored.receipts, 1200);

  assert.equal(financeHeadline([], null).kind, "missing");
  const filed = financeHeadline([period({ coverageStart: "2026-10-01", coverageEnd: "2026-10-14", receipts: 20 })], null);
  assert.equal(filed.kind, "filed");
  const several = financeHeadline([cycle, { ...cycle, committeeId: "C2" }], null);
  assert.equal(several.kind, "filed");
});

test("a report without a total is not labeled as money raised", () => {
  assert.equal(raisedOverview("Report on file"), "Report on file");
  assert.equal(raisedOverview("$12,000"), "Raised $12,000");
});

test("phone compare keeps the chosen left and right order", () => {
  const cards = ["a", "b", "c"].map((id) => ({ candidateId: id, displayName: id, partyLabel: "" })) as CompareCandidate[];
  assert.deepEqual(orderedPair(cards, ["c", "a"]).map((card) => card.candidateId), ["c", "a", "b"]);
});
