"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useId, useState } from "react";
import Link from "next/link";
import { FILING_MEANS } from "@/lib/copy";
import { formatInstant, instantDateTime, partyToneClass } from "@/lib/format";

/**
 * Name and a short cue first. The short card stays free of FEC links.
 * Full records opens the candidate page.
 */
export function CandidateDisclosure({
  name,
  cue,
  partyAffiliation = null,
  href,
  filingCount,
  updatedAt,
  runningFor = null,
}: {
  name: string;
  cue: string;
  partyAffiliation?: string | null;
  href: string;
  filingCount: number;
  updatedAt: string | null;
  /** Plain office, such as "U.S. Senate — Kentucky". Shown after the row opens. */
  runningFor?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toneClass = partyToneClass(partyAffiliation);
  const updated = formatInstant(updatedAt);
  const updatedDate = instantDateTime(updatedAt);

  return (
    <div data-testid="candidate-disclosure" className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md py-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="min-w-0 break-words font-medium text-ink">{name}</span>
        <span className="row-cue">
          Details <span aria-hidden="true">{open ? "▾" : "›"}</span>
        </span>
        <span className={`party-cue text-sm ${toneClass}`}>{cue}</span>
      </button>
      {open ? (
        <div id={panelId} className="mt-2 rounded-md border border-line bg-paper px-3 py-2">
          {runningFor ? (
            <p className="text-sm font-medium leading-6 text-ink">Running for: {runningFor}</p>
          ) : null}
          <p className={`${runningFor ? "mt-1" : ""} text-sm leading-6 text-muted`}>{FILING_MEANS}</p>
          {filingCount > 1 ? (
            <p className="mt-1 text-sm text-ink">{filingCount} filings under this name.</p>
          ) : null}
          {updated ? (
            <p className="mt-1 text-sm text-muted">
              Updated {updatedDate ? <time dateTime={updatedDate}>{updated}</time> : updated}
            </p>
          ) : null}
          <Link
            href={href}
            className="mt-2 inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Full records
          </Link>
        </div>
      ) : null}
    </div>
  );
}
