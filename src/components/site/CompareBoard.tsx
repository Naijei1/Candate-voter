"use client";

import Link from "next/link";
import { useState } from "react";
import { PersonMark } from "@/components/site/PersonMark";
import { orgLabel } from "@/components/site/FinanceLists";
import { coverageLabel, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

export type CompareStance = {
  issueId: string;
  issue: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type CompareVote = {
  bill: string;
  date: string;
  vote: string;
  sourceName: string;
  sourceUrl: string;
};

export type CompareCandidate = {
  candidateId: string;
  displayName: string;
  partyLabel: string;
  note?: string | null;
  photo?: string | null;
  photoCredit?: string | null;
  website?: { url: string; label: string } | null;
  stances?: CompareStance[];
  votes?: CompareVote[];
  raised?: string | null;
  moneyIds?: string[];
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
  issues = [],
  updates = [],
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
  issues?: readonly { id: string; label: string }[];
  updates?: readonly { title: string; url: string; date: string | null; source: string }[];
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
            id={`compare-tab-${item.replace(/\s+/g, "-").toLowerCase()}`}
            aria-selected={tab === item}
            aria-controls="compare-panel"
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="hint" title="Alphabetical by name. Not a ranking.">
        {statusLine}
      </p>
      {summary ? <p>{summary}</p> : filingsLoaded ? <p>{filedLine(candidates.length)}</p> : null}
      <div className="compare-grid" id="compare-panel" role="tabpanel">
        {candidates.map((candidate) => (
          <article className="person-card" key={candidate.candidateId}>
            <PersonMark name={candidate.displayName} photo={candidate.photo ?? null} />
            {candidate.photoCredit ? <p className="hint">{candidate.photoCredit}</p> : null}
            <h3>
              <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
            </h3>
            <p className="party">{candidate.partyLabel}</p>
            {candidate.note ? <p className="hint">{candidate.note}</p> : null}
            <TabBody tab={tab} candidate={candidate} finance={finance} issues={issues} updates={updates} />
          </article>
        ))}
      </div>
      <p>
        <Link href={raceHref}>Back to race</Link>
      </p>
    </div>
  );
}

function filedLine(count: number): string {
  if (count === 0) return "No one has filed to run.";
  if (count === 1) return "One person has filed to run.";
  return `${count} people have filed to run.`;
}

function plainSource(label: string): string {
  if (label === "FEC filing") return "Official filing";
  if (label === "FEC committee report") return "Official report";
  if (label === "FEC independent expenditures") return "Outside spending record";
  return "Election commission totals";
}

function TabBody({
  tab,
  candidate,
  finance,
  issues,
  updates,
}: {
  tab: Tab;
  candidate: CompareCandidate;
  finance: {
    notice: string | null;
    direct: readonly FinanceDirect[];
    outside: readonly FinanceOutside[];
  } | null;
  issues: readonly { id: string; label: string }[];
  updates: readonly { title: string; url: string; date: string | null; source: string }[];
}) {
  const notes = candidate.stances ?? [];
  if (tab === "Overview") {
    return (
      <div>
        {candidate.website ? (
          <p>
            <a href={candidate.website.url}>{candidate.website.label}</a>
          </p>
        ) : (
          <p>No campaign site is stored.</p>
        )}
        <p>{candidate.raised ? `Raised ${candidate.raised}` : "No money total is stored."}</p>
      </div>
    );
  }
  if (tab === "Issues") {
    const rows = issues.length > 0 ? issues : notes.map((note) => ({ id: note.issueId, label: note.issue }));
    return (
      <ul className="plain-list">
        {rows.map((issue) => {
          const stance = notes.find((note) => note.issueId === issue.id);
          return (
            <li key={issue.id}>
              <p>{issue.label}</p>
              <p>{stance ? stance.text : "No public stance found."}</p>
            </li>
          );
        })}
        {rows.length === 0 ? <li>No public stance found.</li> : null}
      </ul>
    );
  }
  if (tab === "Statements") {
    if (notes.length === 0) return <p>No statement is stored.</p>;
    return (
      <ul className="plain-list">
        {notes.map((note) => (
          <li key={note.issueId}>
            <p>{note.text}</p>
            <p className="hint">
              <a href={note.sourceUrl}>{note.sourceName}</a> · {note.sourceDate}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "Voting Record") {
    const votes = candidate.votes ?? [];
    if (votes.length === 0) return <p>No legislative record.</p>;
    return (
      <ul className="plain-list">
        {votes.map((vote) => (
          <li key={`${vote.bill}-${vote.date}`}>
            {vote.date}: {vote.vote} on {vote.bill}. <a href={vote.sourceUrl}>{vote.sourceName}</a>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "Polls") return <p>No qualifying polls.</p>;
  if (tab === "Updates") {
    if (updates.length === 0) return <p>No matching Kentucky Lantern story.</p>;
    return (
      <ul className="plain-list">
        {updates.map((story) => (
          <li key={story.url}>
            <a href={story.url}>{story.title}</a>
            <span className="hint">
              {" "}
              {story.source}
              {story.date ? ` · ${story.date}` : ""}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  const ids = new Set(candidate.moneyIds ?? [candidate.candidateId]);
  const direct = finance?.direct.filter((row) => ids.has(row.candidateId)) ?? [];
  const outside = finance?.outside.filter((row) => ids.has(row.candidateId)) ?? [];
  if (direct.length === 0 && outside.length === 0) return <p>No money total is stored.</p>;
  return (
    <div>
      <ul className="plain-list">
        {direct.map((row) => (
          <li key={`${row.candidateId}-${row.coverageEnd}`}>
            Raised {formatMoney(row.receipts)}, spent {formatMoney(row.disbursements)}, cash left {formatMoney(row.cashOnHand)}, debts {formatMoney(row.debts)}. {coverageLabel(row.coverageStart, row.coverageEnd)}
            {row.sourceUrl ? (
              <>
                {" "}
                <a href={row.sourceUrl}>{plainSource(row.sourceLabel)}</a>
              </>
            ) : null}
          </li>
        ))}
        {outside.map((row) => (
          <li key={`${row.committeeId}-${row.support}`}>
            {orgLabel(row.committeeName) ?? row.committeeId} {row.support === "support" ? "supports" : "opposes"} this person: {formatMoney(row.total)}. This is not money the campaign received.
          </li>
        ))}
      </ul>
    </div>
  );
}
