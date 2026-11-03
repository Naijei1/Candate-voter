"use client";

import Link from "next/link";
import { useState } from "react";
import { orgLabel } from "@/components/site/FinanceLists";
import { coverageLabel, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

export type CompareCandidate = {
  candidateId: string;
  displayName: string;
  partyLabel: string;
  note?: string | null;
};

const TABS = [
  "Overview",
  "Issues",
  "Statements",
  "Voting Record",
  "Polls",
  "Campaign Finance",
  "Updates",
] as const;

type Tab = (typeof TABS)[number];

export function CompareBoard({
  candidates,
  raceHref,
  filingsLoaded = true,
  summary = null,
  statusLine = "A to Z. Filed to run. Not confirmed on the ballot.",
  finance = null,
}: {
  candidates: readonly CompareCandidate[];
  raceHref: string;
  filingsLoaded?: boolean;
  summary?: string | null;
  statusLine?: string;
  finance?: {
    notice: string | null;
    direct: readonly FinanceDirect[];
    outside: readonly FinanceOutside[];
  } | null;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Comparison topics">
        {TABS.map((item) => (
          <button
            key={item}
            className="btn btn-ghost"
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="hint" title="Alphabetical by filing name. Not a ranking.">
        {statusLine}
      </p>
      {summary ? <p>{summary}</p> : filingsLoaded ? <p>{filedLine(candidates.length)}</p> : null}
      {candidates.length === 0 ? null : (
        <div className="compare-grid">
          {candidates.map((candidate) => (
            <article className="person-card" key={candidate.candidateId}>
              <h3>
                <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
              </h3>
              <p className="party">{candidate.partyLabel}</p>
              {candidate.note ? <p className="hint">{candidate.note}</p> : null}
            </article>
          ))}
        </div>
      )}
      <div className="card" role="tabpanel">
        <TabBody tab={tab} finance={finance} />
      </div>
      <p>
        <Link href={raceHref}>Back to race</Link>
      </p>
    </div>
  );
}

function plainSource(label: string): string {
  if (label === "FEC filing") return "Official filing";
  if (label === "FEC committee report") return "Official report";
  if (label === "FEC independent expenditures") return "Outside spending record";
  return "Election commission totals";
}

function filedLine(count: number): string {
  if (count === 0) return "No one has filed to run.";
  if (count === 1) return "One person has filed to run.";
  return `${count} people have filed to run.`;
}

function TabBody({
  tab,
  finance,
}: {
  tab: Tab;
  finance: {
    notice: string | null;
    direct: readonly FinanceDirect[];
    outside: readonly FinanceOutside[];
  } | null;
}) {
  if (tab === "Overview") return <p>Everyone is compared on the same facts.</p>;
  if (tab === "Campaign Finance") {
    if (!finance || (finance.direct.length === 0 && finance.outside.length === 0)) {
      return <p>Money totals are not loaded for this race yet.</p>;
    }
    return (
      <div>
        {finance.notice ? <p>{finance.notice}</p> : null}
        <p>
          <Link href="/finance#direct-and-outside">Money a campaign reports is separate from money other groups spend.</Link>
        </p>
        <ul className="plain-list">
          {finance.direct.map((row) => (
            <li key={row.candidateId}>
              <Link href={`/candidates/${row.candidateId}`}>{row.name ?? row.candidateId}</Link>
              {": "}
              raised {formatMoney(row.receipts)}, spent {formatMoney(row.disbursements)}, cash left{" "}
              {formatMoney(row.cashOnHand)}, debts {formatMoney(row.debts)}. {coverageLabel(row.coverageStart, row.coverageEnd)}
              {row.sourceUrl ? (
                <>
                  {" "}
                  <a href={row.sourceUrl}>{plainSource(row.sourceLabel)}</a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {finance.outside.length > 0 ? (
          <ul className="plain-list">
            {finance.outside.map((row) => (
              <li key={`${row.candidateId}-${row.committeeId}-${row.support}`}>
                {orgLabel(row.committeeName) ?? row.committeeId} {row.support === "support" ? "supports" : "opposes"}{" "}
                {row.candidateName ?? "this person"}: {formatMoney(row.total)}. This is not money the campaign received.
                {row.sourceUrl ? (
                  <>
                    {" "}
                    <a href={row.sourceUrl}>{plainSource(row.sourceLabel)}</a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (tab === "Polls") return <p>No qualifying polls. A real poll would name who ran it, when, and how many people were asked.</p>;
  if (tab === "Voting Record") return <p>No voting record is loaded. That does not mean the person voted against something.</p>;
  if (tab === "Updates") return <p>No updates beyond the filing.</p>;
  return <p>Not loaded yet.</p>;
}
