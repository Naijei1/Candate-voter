"use client";

import { dayLabel } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { partyMark, PersonMark } from "@/components/site/PersonMark";
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
  raisedSource?: string;
};

const TABS = [
  "Overview",
  "Issues",
  "Statements",
  "Voting Record",
  "Campaign Finance",
  "Updates",
] as const;

type Tab = (typeof TABS)[number];

export function visibleCompareTabs({ hasStances, hasVotes, hasFinance, hasUpdates }: {
  hasStances: boolean;
  hasVotes: boolean;
  hasFinance: boolean;
  hasUpdates: boolean;
}): Tab[] {
  const visible: Record<Tab, boolean> = {
    Overview: true,
    Issues: hasStances,
    Statements: hasStances,
    "Voting Record": hasVotes,
    "Campaign Finance": hasFinance,
    Updates: hasUpdates,
  };
  return TABS.filter((tab) => visible[tab]);
}

export function CompareBoard({
  candidates,
  raceHref,
  filingsLoaded = true,
  summary = null,
  finance = null,
  issues = [],
  updates = [],
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
  issues?: readonly { id: string; label: string }[];
  updates?: readonly { title: string; url: string; date: string | null; source: string }[];
}) {
  const [selectedTab, setTab] = useState<Tab>("Overview");
  const moneyIds = new Set(candidates.flatMap((candidate) => candidate.moneyIds ?? [candidate.candidateId]));
  const hasStances = candidates.some((candidate) => candidate.stances?.length);
  const hasFinance = [...(finance?.direct ?? []), ...(finance?.outside ?? [])].some((row) => moneyIds.has(row.candidateId));
  const tabs = visibleCompareTabs({
    hasStances,
    hasVotes: candidates.some((candidate) => candidate.votes?.length),
    hasFinance,
    hasUpdates: updates.length > 0,
  });
  const tab = tabs.includes(selectedTab) ? selectedTab : "Overview";
  return (
    <div className="compare-board">
      <div className="tabs" role="tablist" aria-label="Comparison topics">
        {tabs.map((item) => (
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
      {summary ? <p>{summary}</p> : filingsLoaded ? <p>{filedLine(candidates.length)}</p> : null}
      <div className="compare-grid" id="compare-panel" role="tabpanel">
        {candidates.map((candidate) => (
          <article className="person-card" key={candidate.candidateId}>
            <PersonMark name={candidate.displayName} photo={candidate.photo ?? null} party={candidate.partyLabel} size="lg" />
            <h2>
              <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
            </h2>
            <p className="party">{partyMark(candidate.partyLabel).letter} · {candidate.partyLabel}</p>
            {candidate.note ? <p className="hint">{candidate.note}</p> : null}
            <TabBody tab={tab} candidate={candidate} finance={finance} issues={issues} updates={updates} />
            {candidate.photoCredit ? <p className="hint compare-credit">Photo: {candidate.photoCredit}</p> : null}
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
            <a className="action-link" href={candidate.website.url}>{candidate.website.label}</a>
          </p>
        ) : null}
        {candidate.raised ? <p>Raised {candidate.raised}{candidate.raisedSource ? <> · <a href={candidate.raisedSource}>FEC</a></> : null}</p> : null}
      </div>
    );
  }
  if (tab === "Issues") {
    const rows = issues.length > 0 ? issues : notes.map((note) => ({ id: note.issueId, label: note.issue }));
    return (
      <ul className="plain-list">
        {rows.map((issue) => {
          const stance = notes.find((note) => note.issueId === issue.id);
          if (!stance) return null;
          return (
            <li key={issue.id}>
              <p>{issue.label}</p>
              <p>{stance.text} <a href={stance.sourceUrl}>Source ↗</a></p>
            </li>
          );
        })}
      </ul>
    );
  }
  if (tab === "Statements") {
    if (notes.length === 0) return null;
    return (
      <ul className="plain-list">
        {notes.map((note) => (
          <li key={note.issueId}>
            <p>{note.text}</p>
            <p className="hint">
              <a href={note.sourceUrl}>{note.sourceName}</a> · {dayLabel(note.sourceDate)}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "Voting Record") {
    const votes = candidate.votes ?? [];
    if (votes.length === 0) return null;
    return (
      <ul className="plain-list">
        {votes.map((vote) => (
          <li key={`${vote.bill}-${vote.date}`}>
            {dayLabel(vote.date)}: {vote.vote} on {vote.bill}. <a href={vote.sourceUrl}>{vote.sourceName}</a>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "Updates") {
    if (updates.length === 0) return null;
    return (
      <ul className="plain-list">
        {updates.map((story) => (
          <li key={story.url}>
            <a href={story.url}>{story.title}</a>
            <span className="hint">
              {" "}
              {story.source}
              {story.date ? ` · ${dayLabel(story.date)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  const ids = new Set(candidate.moneyIds ?? [candidate.candidateId]);
  const direct = finance?.direct.filter((row) => ids.has(row.candidateId)) ?? [];
  const outside = finance?.outside.filter((row) => ids.has(row.candidateId)) ?? [];
  if (direct.length === 0 && outside.length === 0) return null;
  return (
    <div>
      <ul className="plain-list">
        {direct.map((row) => (
          <li key={`${row.candidateId}-${row.coverageEnd}`}>
            {[
              row.receipts != null ? `Raised ${formatMoney(row.receipts)}` : null,
              row.disbursements != null ? `Spent ${formatMoney(row.disbursements)}` : null,
              row.cashOnHand != null ? `Cash ${formatMoney(row.cashOnHand)}` : null,
              row.debts != null ? `Debts ${formatMoney(row.debts)}` : null,
              row.coverageStart || row.coverageEnd ? coverageLabel(row.coverageStart, row.coverageEnd) : null,
            ].filter(Boolean).join(" · ")}
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
            {orgLabel(row.committeeName) ?? row.committeeId} {row.support === "support" ? "supports" : "opposes"} this person: {formatMoney(row.total)}. {row.sourceUrl ? <a href={row.sourceUrl}>Source ↗</a> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
