"use client";

import { dayLabel } from "@/lib/format";
import Link from "next/link";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { PersonMark } from "@/components/site/PersonMark";
import { orgLabel } from "@/components/site/FinanceLists";
import { SourcePeek } from "@/components/site/SourcePeek";
import { coverageLabel, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

export type CompareStance = {
  issueId: string;
  issue: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type CompareCandidate = {
  candidateId: string;
  displayName: string;
  partyLabel: string;
  note?: string | null;
  photo?: string | null;
  photoCredit?: string | null;
  photoSource?: string;
  website?: { url: string; label: string } | null;
  stances?: CompareStance[];
  votes?: ReactNode;
  experience?: ReactNode;
  priorResults?: ReactNode;
  raised?: string | null;
  raisedChange?: string | null;
  moneyIds?: string[];
  raisedSource?: string;
};

const TABS = [
  "Overview",
  "Experience",
  "Prior results",
  "Issues",
  "Statements",
  "Voting Record",
  "Campaign Finance",
  "News",
] as const;

type Tab = (typeof TABS)[number];

export function visibleCompareTabs({ hasStances, hasVotes, hasFinance, hasUpdates, hasExperience, hasPriorResults }: {
  hasStances: boolean;
  hasVotes: boolean;
  hasFinance: boolean;
  hasUpdates: boolean;
  hasExperience?: boolean;
  hasPriorResults?: boolean;
}): Tab[] {
  const visible: Record<Tab, boolean> = {
    Overview: true,
    Experience: Boolean(hasExperience),
    "Prior results": Boolean(hasPriorResults),
    Issues: hasStances,
    Statements: hasStances,
    "Voting Record": hasVotes,
    "Campaign Finance": hasFinance,
    News: hasUpdates,
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
  const [excluded, setExcluded] = useState<string[]>([]);
  const opening = candidates.slice(0, 2).map((candidate) => candidate.candidateId);
  const [draftPair, setDraftPair] = useState<string[]>(opening);
  const [pair, setPair] = useState<string[]>(opening);
  const id = useId();
  const selected = candidates.filter((candidate) => !excluded.includes(candidate.candidateId));
  const moneyIds = new Set(selected.flatMap((candidate) => candidate.moneyIds ?? [candidate.candidateId]));
  const hasStances = selected.some((candidate) => candidate.stances?.length);
  const hasFinance = [...(finance?.direct ?? []), ...(finance?.outside ?? [])].some((row) => moneyIds.has(row.candidateId));
  const tabs = visibleCompareTabs({
    hasStances,
    hasVotes: selected.some((candidate) => candidate.votes),
    hasFinance,
    hasUpdates: updates.length > 0 && selected.length > 0,
    hasExperience: selected.some((candidate) => candidate.experience),
    hasPriorResults: selected.some((candidate) => candidate.priorResults),
  });
  const tab = tabs.includes(selectedTab) ? selectedTab : "Overview";
  const tabId = (item: Tab) => `${id}-${item.replace(/\s+/g, "-").toLowerCase()}`;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: tabs.length - 1 - index };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  return (
    <div className="compare-board">
      {candidates.length > 1 ? (
        <form
          className="compare-pair"
          onSubmit={(event) => {
            event.preventDefault();
            const [first, second] = draftPair;
            if (!first) return;
            const other = candidates.find((candidate) => candidate.candidateId !== first)?.candidateId ?? first;
            setPair(!second || second === first ? [first, other] : [first, second]);
          }}
        >
          {(["Left", "Right"] as const).map((side, index) => (
            <label key={side}>
              {side}
              <select
                value={draftPair[index] ?? ""}
                onChange={(event) => {
                  const next = [...draftPair];
                  next[index] = event.currentTarget.value;
                  setDraftPair(next);
                }}
              >
                {candidates.map((candidate) => (
                  <option key={candidate.candidateId} value={candidate.candidateId}>{candidate.displayName}</option>
                ))}
              </select>
            </label>
          ))}
          <button className="btn btn-navy" type="submit">Apply</button>
        </form>
      ) : null}
      {candidates.length > 1 ? (
        <fieldset className="compare-selection">
          <legend>Candidates to compare</legend>
          {candidates.map((candidate) => (
            <label key={candidate.candidateId}>
              <input
                type="checkbox"
                checked={!excluded.includes(candidate.candidateId)}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setExcluded((ids) => checked ? ids.filter((value) => value !== candidate.candidateId) : [...ids, candidate.candidateId]);
                }}
              />
              {candidate.displayName}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="tabs" role="tablist" aria-label="Comparison topics">
        {tabs.map((item, index) => (
          <button
            key={item}
            className="btn btn-ghost"
            type="button"
            role="tab"
            id={tabId(item)}
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            onKeyDown={(event) => moveTab(event, index)}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {summary ? <p>{summary}</p> : filingsLoaded ? <p>{filedLine(candidates.length)}</p> : null}
      <div className="compare-grid" role="tabpanel" aria-labelledby={tabId(tab)} tabIndex={selected.length ? undefined : 0}>
        {selected.map((candidate) => (
          <article className={pair.includes(candidate.candidateId) ? "person-card is-paired" : "person-card"} key={candidate.candidateId}>
            <PersonMark name={candidate.displayName} photo={candidate.photo ?? null} party={candidate.partyLabel} size="lg" />
            <h2>
              <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
            </h2>
            <p className="party">{candidate.partyLabel}</p>
            {candidate.note ? <p className="hint">{candidate.note}</p> : null}
            <TabBody tab={tab} candidate={candidate} finance={finance} issues={issues} updates={updates} />
            {candidate.photoCredit && candidate.photoSource ? <p className="hint compare-credit">Photo: <a href={candidate.photoSource}>{candidate.photoCredit}</a></p> : null}
          </article>
        ))}
        {!selected.length && candidates.length ? <p role="status">Choose candidates to compare.</p> : null}
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
  if (tab === "Experience") return candidate.experience;
  if (tab === "Prior results") return candidate.priorResults;
  if (tab === "Overview") {
    return (
      <div>
        {candidate.website ? (
          <p>
            <a className="action-link" href={candidate.website.url}>{candidate.website.label}</a>
          </p>
        ) : null}
        {candidate.raised ? <p>{candidate.raised === "No report on file" || candidate.raised === "Reported $0" ? candidate.raised : <>Raised {candidate.raised}</>}{candidate.raisedSource ? <> · <a href={candidate.raisedSource}>FEC</a></> : null}</p> : null}
        {candidate.raisedChange ? <p className="hint">{candidate.raisedChange}</p> : null}
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
              {stance ? (
                <p>
                  {stance.text}{" "}
                  <SourcePeek name={stance.sourceName} url={stance.sourceUrl} date={stance.sourceDate} excerpt={stance.text} />
                </p>
              ) : <p>No statement on record</p>}
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
              Candidate says · <a href={note.sourceUrl}>{note.sourceName}</a> · {dayLabel(note.sourceDate)}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "Voting Record") return candidate.votes;
  if (tab === "News") {
    if (updates.length === 0) return null;
    return (
      <ul className="plain-list">
        {updates.map((story) => (
          <li key={story.url}>
            <a href={story.url}>{story.title}</a>
            <span className="hint">
              {" "}
              Reporting · {story.source}
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
