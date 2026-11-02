"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusMark } from "@/components/site/StatusMark";

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
}: {
  candidates: readonly CompareCandidate[];
  raceHref: string;
  filingsLoaded?: boolean;
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
      {filingsLoaded ? <p>{filedLine(candidates.length)}</p> : null}
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
        <TabBody tab={tab} />
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

function TabBody({ tab }: { tab: Tab }) {
  if (tab === "Overview") return <p>Same fields on every card.</p>;
  if (tab === "Campaign Finance") {
    return (
      <p>
        <StatusMark kind="sample" /> Not loaded. <Link href="/finance">Sample finance</Link>
      </p>
    );
  }
  if (tab === "Polls") return <p>No qualifying polls available.</p>;
  if (tab === "Voting Record") return <p>Not available.</p>;
  if (tab === "Updates") return <p>No updates beyond the filing.</p>;
  return <p>Not available.</p>;
}
