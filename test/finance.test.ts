import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { mapCandidateCycleTotal, mapCommitteeReport, mapScheduleEByCandidate } from "../src/lib/finance/map";
import { fecImagePdf } from "../src/lib/finance/model";
import { runTotalsIngest } from "../src/lib/finance/ingest";
import { coverageChoices, selectDirect, selectOutside } from "../src/lib/finance/present";
import { financeAlertNotice } from "../src/lib/users/alerts";
import type { Race, Candidate } from "../src/lib/types";

const context = {
  raceId: "2026-senate-KY",
  name: "Booker, Charles",
  committeeId: "C00929208",
  committeeName: "BOOKER FOR THE COMMONWEALTH",
  updatedAt: "2026-11-02T00:00:00.000Z",
};

test("cycle totals keep cash, debts, and the filing image separate from outside spending", () => {
  const direct = mapCandidateCycleTotal(
    {
      candidate_id: "S6KY00385",
      cycle: 2026,
      receipts: 1936323.82,
      disbursements: 1632724.93,
      last_cash_on_hand_end_period: 303598.89,
      last_debts_owed_by_committee: 130576.87,
      coverage_start_date: "2025-10-01T00:00:00",
      coverage_end_date: "2026-10-14T00:00:00",
      last_beginning_image_number: "202610229941012642",
    },
    context,
  );
  assert.ok(direct);
  assert.equal(direct.scope, "cycle");
  assert.equal(direct.cashOnHand, 303598.89);
  assert.equal(direct.debts, 130576.87);
  assert.equal(direct.sourceLabel, "FEC filing");
  assert.equal(
    fecImagePdf("202610229941012642"),
    "https://docquery.fec.gov/pdf/642/202610229941012642/202610229941012642.pdf",
  );
  const outside = mapScheduleEByCandidate(
    {
      candidate_id: "S6KY00385",
      committee_id: "C00489252",
      committee_name: "NEW POWER PAC",
      support_oppose_indicator: "S",
      total: 3427.87,
      count: 2,
      cycle: 2026,
    },
    { raceId: context.raceId, candidateName: context.name, updatedAt: context.updatedAt },
  );
  assert.ok(outside);
  assert.equal(outside.total, 3427.87);
  assert.equal("receipts" in outside, false);
  assert.notEqual(direct.receipts, (direct.receipts ?? 0) + outside.total);
});

test("an amended report is skipped and a period is not shown beside the cycle total", () => {
  const cycle = mapCandidateCycleTotal(
    {
      candidate_id: "S6KY00385",
      cycle: 2026,
      receipts: 100,
      disbursements: 40,
      cash_on_hand_end_period: 10,
      debts_owed_by_committee: 2,
      coverage_start_date: "2025-01-01",
      coverage_end_date: "2026-09-30",
    },
    context,
  );
  const stale = mapCommitteeReport(
    { most_recent: false, cycle: 2026, committee_id: "C00929208", total_receipts_period: 999, coverage_end_date: "2026-10-14" },
    { ...context, candidateId: "S6KY00385" },
  );
  const period = mapCommitteeReport(
    {
      most_recent: true,
      cycle: 2026,
      committee_id: "C00929208",
      file_number: 2037626,
      total_receipts_period: "25.50",
      total_disbursements_period: 10,
      cash_on_hand_end_period: 8,
      debts_owed_by_committee: 1,
      coverage_start_date: "2026-10-01",
      coverage_end_date: "2026-10-14",
      pdf_url: "https://docquery.fec.gov/pdf/642/202610229941012642/202610229941012642.pdf",
    },
    { ...context, candidateId: "S6KY00385" },
  );
  assert.equal(stale, null);
  assert.ok(cycle && period);
  const rows = [cycle, period];
  const cycleView = selectDirect(rows, null);
  assert.deepEqual(cycleView.map((row) => row.receipts), [100]);
  const periodView = selectDirect(rows, "2026-10-01..2026-10-14");
  assert.deepEqual(periodView.map((row) => row.receipts), [25.5]);
  assert.equal(selectOutside([], "2026-10-01..2026-10-14").length, 0);
  assert.ok(coverageChoices(rows).includes("2026-10-01..2026-10-14"));
});

test("totals ingest writes direct and outside rows without combining them", async () => {
  const repo = new MemoryVoterRepository();
  const race: Race = {
    raceId: "2026-senate-KY",
    office: "senate",
    cycle: 2026,
    state: "KY",
    district: null,
    title: "U.S. Senate, Kentucky",
    jurisdiction: "Kentucky",
    sourceUrl: null,
    updatedAt: "2026-11-02T00:00:00.000Z",
  };
  const candidate: Candidate = {
    candidateId: "S6KY00385",
    raceId: race.raceId,
    displayName: "Charles Booker",
    nameAsFiled: "BOOKER, CHARLES",
    office: "senate",
    partyAffiliation: "DEM",
    fecCandidateId: "S6KY00385",
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: "2026-11-02T00:00:00.000Z",
  };
  await repo.upsertRace(race);
  await repo.upsertCandidate(candidate);
  const summary = await runTotalsIngest({
    repo,
    cycles: [2026],
    now: () => new Date("2026-11-02T12:00:00.000Z"),
    fec: {
      async getCandidateTotals() {
        return { candidate_id: "S6KY00385", cycle: 2026, receipts: 100, disbursements: 40, cash_on_hand_end_period: 10, debts_owed_by_committee: 2, coverage_end_date: "2026-09-30" };
      },
      async getCandidateCommittees() {
        return [{ committee_id: "C00929208", name: "BOOKER FOR THE COMMONWEALTH", designation: "P" }];
      },
      async *iterateCommitteeReports() {
        yield [
          { most_recent: false, cycle: 2026, committee_id: "C00929208", total_receipts_period: 999, coverage_end_date: "2026-03-31", file_number: 1 },
          { most_recent: true, cycle: 2026, committee_id: "C00929208", total_receipts_period: 15, coverage_end_date: "2026-03-31", file_number: 2, pdf_url: "https://docquery.fec.gov/pdf/example.pdf" },
        ];
      },
      async getScheduleEByCandidate() {
        return [{ candidate_id: "S6KY00385", committee_id: "C00489252", committee_name: "NEW POWER PAC", support_oppose_indicator: "S", total: 9, cycle: 2026, count: 1 }];
      },
    },
  });
  assert.equal(summary.directUpserted, 1);
  assert.equal(summary.periodsUpserted, 1);
  assert.equal(summary.outsideUpserted, 1);
  const stored = await repo.listFinance(2026);
  assert.equal(stored.direct.find((row) => row.scope === "cycle")?.receipts, 100);
  assert.equal(stored.outside[0]?.total, 9);
  assert.equal(selectDirect(stored.direct, null).reduce((sum, row) => sum + (row.receipts ?? 0), 0), 100);
  const mark = await repo.getTotalsWatermark();
  assert.equal(mark?.source, "fec-totals");
  assert.equal(mark?.lastStatus, "success");
  assert.equal(mark?.cursorCandidateId, null);
});

test("totals ingest stops before the time budget and the next run resumes", async () => {
  const repo = new MemoryVoterRepository();
  await repo.upsertRace({
    raceId: "2026-senate-KY",
    office: "senate",
    cycle: 2026,
    state: "KY",
    district: null,
    title: "U.S. Senate, Kentucky",
    jurisdiction: "Kentucky",
    sourceUrl: null,
    updatedAt: "2026-11-02T00:00:00.000Z",
  });
  for (const id of ["S6KY00001", "S6KY00002"]) {
    await repo.upsertCandidate({
      candidateId: id,
      raceId: "2026-senate-KY",
      displayName: id,
      nameAsFiled: id,
      office: "senate",
      partyAffiliation: null,
      fecCandidateId: id,
      sourceUrl: null,
      sourceLoadedAt: null,
      updatedAt: "2026-11-02T00:00:00.000Z",
    });
  }
  const seen: string[] = [];
  const fec = {
    async getCandidateTotals(id: string) {
      seen.push(id);
      return { candidate_id: id, cycle: 2026, receipts: 1, disbursements: 1, cash_on_hand_end_period: 1, debts_owed_by_committee: 0 };
    },
    async getCandidateCommittees() {
      return [];
    },
    async *iterateCommitteeReports() {
      yield [];
    },
    async getScheduleEByCandidate() {
      return [];
    },
  };
  let allow = true;
  const first = await runTotalsIngest({
    repo,
    fec,
    cycles: [2026],
    shouldContinue: () => {
      const ok = allow;
      allow = false;
      return ok;
    },
  });
  assert.equal(first.status, "partial");
  assert.equal(first.cursorCandidateId, "S6KY00001");
  const saved = await repo.getTotalsWatermark();
  assert.equal(saved?.lastStatus, "partial");
  assert.equal(saved?.cursorCandidateId, "S6KY00001");
  const second = await runTotalsIngest({
    repo,
    fec,
    cycles: [2026],
    shouldContinue: () => true,
  });
  assert.equal(second.status, "success");
  assert.deepEqual(seen, ["S6KY00001", "S6KY00002"]);
  assert.equal((await repo.getTotalsWatermark())?.cursorCandidateId, null);
});

test("finance alerts use the coverage date as the event time", () => {
  const first = financeAlertNotice({
    userId: "user-1",
    category: "finance-receipts",
    targetType: "candidate",
    targetId: "S6KY00385",
    eventAt: "2026-10-14",
    detectedAt: "2026-11-02T00:00:00.000Z",
  });
  const again = financeAlertNotice({ ...first, detectedAt: "2026-11-03T00:00:00.000Z" });
  assert.equal(first.dedupeKey, again.dedupeKey);
  assert.equal(first.dedupeKey.includes("2026-11-02"), false);
  assert.equal(first.eventAt, "2026-10-14");
});

test("totals worker is a second function and does not itemize Schedule E lines", () => {
  const template = readFileSync("infra/template.yaml", "utf8");
  assert.equal(template.includes("ManagedPolicyName:"), false);
  assert.match(template, /Description: >-/);
  assert.match(template, /FunctionName: candate-voter-fec-totals/);
  assert.match(template, /workers\/fec-totals\/app\.ts/);
  assert.match(template, /FEC_API_KEY: !Ref FecApiKey/);
  const client = readFileSync("src/lib/fec/client.ts", "utf8");
  assert.match(client, /\/schedules\/schedule_e\/by_candidate\//);
  assert.equal(client.includes("/schedules/schedule_e/?"), false);
  const page = readFileSync("src/app/finance/page.tsx", "utf8");
  const lists = readFileSync("src/components/site/FinanceLists.tsx", "utf8");
  assert.equal(page.includes("example-pac"), false);
  assert.match(page, /FinanceExplanation/);
  assert.match(lists, /id="direct-and-outside"/);
});
