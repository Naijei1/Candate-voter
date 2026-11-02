"use client";

import Link from "next/link";
import { useState } from "react";
import { coverageLabel, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

export type CompareCandidate = {
  candidateId: string;
  displayName: string;
  partyLabel: string;
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
  finance = null,
}: {
  candidates: readonly CompareCandidate[];
  raceHref: string;
  filingsLoaded?: boolean;
  summary?: string | null;
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
        A to Z
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
              <p className="hint">Filing stored · Ballot not verified</p>
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

function filedLine(count: number): string {
  if (count === 0) return "No one has filed.";
  if (count === 1) return "Uncontested — only 1 filed.";
  return `Only ${count} filed.`;
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
  if (tab === "Overview") return <p>Same fields on every card.</p>;
  if (tab === "Campaign Finance") {
    if (!finance || (finance.direct.length === 0 && finance.outside.length === 0)) {
      return <p>No FEC totals stored for this race.</p>;
    }
    return (
      <div>
        {finance.notice ? <p>{finance.notice}</p> : null}
        <p>
          <Link href="/finance#direct-and-outside">Direct money and outside spending are not added together.</Link>
        </p>
        <ul className="plain-list">
          {finance.direct.map((row) => (
            <li key={row.candidateId}>
              <Link href={`/candidates/${row.candidateId}`}>{row.name ?? row.candidateId}</Link>
              {": "}
              receipts {formatMoney(row.receipts)}, disbursements {formatMoney(row.disbursements)}, cash{" "}
              {formatMoney(row.cashOnHand)}, debts {formatMoney(row.debts)}. {coverageLabel(row.coverageStart, row.coverageEnd)}
              {row.sourceUrl ? (
                <>
                  {" "}
                  <a href={row.sourceUrl}>{row.sourceLabel}</a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {finance.outside.length > 0 ? (
          <ul className="plain-list">
            {finance.outside.map((row) => (
              <li key={`${row.candidateId}-${row.committeeId}-${row.support}`}>
                {row.committeeName ?? row.committeeId} {row.support === "support" ? "supports" : "opposes"}{" "}
                {row.candidateName ?? row.candidateId}: {formatMoney(row.total)}. Not a receipt.
                {row.sourceUrl ? (
                  <>
                    {" "}
                    <a href={row.sourceUrl}>{row.sourceLabel}</a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (tab === "Polls") return <p>No qualifying polls available.</p>;
  if (tab === "Voting Record") return <p>Not available.</p>;
  if (tab === "Updates") return <p>No updates beyond the filing.</p>;
  return <p>Not available.</p>;
}
