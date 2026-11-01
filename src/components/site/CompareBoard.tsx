"use client";

import Link from "next/link";
import { useState } from "react";
import { SAMPLE_PAC } from "@/content/pilot";
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
}: {
  candidates: readonly CompareCandidate[];
  raceHref: string;
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
      <p>Candidates are ordered A to Z by the name on the filing. That order is not a ranking.</p>
      {candidates.length === 0 ? (
        <p>No candidates are stored for this contest, so there is nothing to compare.</p>
      ) : (
        <div className="compare-grid">
          {candidates.map((candidate) => (
            <article className="person-card" key={candidate.candidateId}>
              <h3>
                <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
              </h3>
              <p className="party">{candidate.partyLabel}</p>
              <p>Photo: not on file. Incumbency: not in this record.</p>
              <p>Filing: statement of candidacy when a Form 2 is stored. Ballot status is not verified.</p>
              <p>Campaign website: not verified.</p>
              <p>
                <Link href={raceHref}>Back to the race</Link>
              </p>
            </article>
          ))}
        </div>
      )}
      <div className="card" role="tabpanel">
        <h3>{tab}</h3>
        <TabBody tab={tab} />
      </div>
      {candidates.length < 3 ? <SampleTrio /> : null}
    </div>
  );
}

function TabBody({ tab }: { tab: Tab }) {
  if (tab === "Overview") {
    return (
      <p>
        Each card lists the same fields: name, party as text, photo, incumbency, filing status,
        and campaign website. Missing fields stay missing.
      </p>
    );
  }
  if (tab === "Campaign Finance") {
    return (
      <>
        <p>Reported fundraising for this person is not loaded. Form 2 is not a fundraising report.</p>
        <p>
          <StatusMark kind="sample" />
          The sample amounts live on the{" "}
          <Link href="/finance">campaign finance page</Link>, separate from these names.
        </p>
      </>
    );
  }
  if (tab === "Polls") {
    return <p>No qualifying polls available.</p>;
  }
  if (tab === "Voting Record") {
    return (
      <p>
        No legislative votes are in this record. An empty voting record is not a score, and it does
        not mean the person has never held office.
      </p>
    );
  }
  if (tab === "Updates") {
    return <p>No sourced updates beyond the stored filing are available.</p>;
  }
  return <p>Not available. This tab is not filled with generated positions or quotations.</p>;
}

function SampleTrio() {
  return (
    <section className="section" aria-labelledby="sample-trio">
      <h2 id="sample-trio">
        <StatusMark kind="sample" />
        Layout for more than two candidates
      </h2>
      <p>
        These three cards are a demonstration of the layout. They are not people in the contest
        above. {SAMPLE_PAC.name} is not a real committee.
      </p>
      <div className="compare-grid">
        {["Sample candidate A", "Sample candidate B", "Sample candidate C"].map((name) => (
          <article className="person-card" key={name}>
            <h3>{name}</h3>
            <p className="party">Party label</p>
            <p>Same fields as a live card. All of this text is sample copy.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
