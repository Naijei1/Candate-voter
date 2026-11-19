"use client";

import { useEffect, useId, useState } from "react";
import type { Claim, CompareOption, Evidence } from "@/lib/compare/evidence";
import { REFUSALS } from "@/lib/compare/refusals";
import type { CompareSummary } from "@/lib/compare/summarize";
import { withBasePath } from "@/lib/base-path";

type State = { raceId: string; summary: CompareSummary | null; failed: boolean };

function Cites({ ids, byId }: { ids: readonly string[]; byId: ReadonlyMap<string, Evidence> }) {
  return (
    <span className="cites">
      {ids.map((id) => {
        const row = byId.get(id);
        if (!row) return null;
        const label = row.personName ? `${row.personName}: ${row.sourceName}` : row.sourceName;
        return (
          <a key={id} className="cite" href={row.sourceUrl} title={label}>
            <span className="sr-only">Source: {label}</span>
            <span aria-hidden="true">{row.personName ? lastName(row.personName) : "Ballot"} ↗</span>
          </a>
        );
      })}
    </span>
  );
}

function lastName(name: string): string {
  const parts = name.replace(/["“”]/g, "").split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name;
}

function ClaimList({ claims, byId }: { claims: readonly Claim[]; byId: ReadonlyMap<string, Evidence> }) {
  return (
    <ul className="claim-list">
      {claims.map((claim) => (
        <li key={claim.text}>
          {claim.text} <Cites ids={claim.cites} byId={byId} />
        </li>
      ))}
    </ul>
  );
}

function SideBySide({ evidence, open, loading }: { evidence: readonly Evidence[]; open: boolean; loading: boolean }) {
  const byIssue = new Map<string, Evidence[]>();
  for (const row of evidence) {
    if (!row.personId) continue;
    const key = row.issue ?? (row.kind === "vote" ? "House votes" : "Other");
    byIssue.set(key, [...(byIssue.get(key) ?? []), row]);
  }
  return (
    <details className="side-by-side" open={open || undefined}>
      <summary>What each candidate said, issue by issue</summary>
      {loading ? <p className="hint">Loading the candidates&apos; statements…</p> : null}
      {!loading && byIssue.size === 0 ? <p className="hint">No cited statements or votes are stored for this race yet.</p> : null}
      {[...byIssue.entries()].map(([issue, rows]) => (
        <div key={issue} className="issue-block">
          <h4>{issue}</h4>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.personName}:</strong> {row.text}{" "}
                <a href={row.sourceUrl}>
                  {row.sourceName}
                  {row.sourceDate ? `, ${row.sourceDate}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

/** One message when neither AI column has anything to show, instead of the same sentence twice. */
export function sharedRefusal(summary: CompareSummary | null, failed: boolean): string | null {
  if (failed) return REFUSALS.unavailable;
  if (!summary) return null;
  if (summary.differ.length > 0 || summary.agree.length > 0) return null;
  if (summary.differRefusal && summary.differRefusal === summary.agreeRefusal) return summary.differRefusal;
  return null;
}

export function CompareSection({ options }: { options: readonly CompareOption[] }) {
  const selectId = useId();
  const [raceId, setRaceId] = useState(options[0]?.raceId ?? "");
  const [state, setState] = useState<State>({ raceId: "", summary: null, failed: false });
  const option = options.find((row) => row.raceId === raceId) ?? options[0];

  useEffect(() => {
    if (!raceId) return;
    const controller = new AbortController();
    setState({ raceId, summary: null, failed: false });
    fetch(withBasePath(`/api/compare?race=${encodeURIComponent(raceId)}`), { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as CompareSummary;
        if (!body || !Array.isArray(body.know)) throw new Error("shape");
        setState({ raceId, summary: { ...body, evidence: Array.isArray(body.evidence) ? body.evidence : [] }, failed: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ raceId, summary: null, failed: true });
      });
    return () => controller.abort();
  }, [raceId]);

  if (!option) return null;
  const current = state.raceId === raceId ? state : { raceId, summary: null, failed: false };
  const summary = current.summary;
  const loading = !summary && !current.failed;
  const evidence = summary?.evidence ?? [];
  const byId = new Map([...option.ballot, ...evidence].map((row) => [row.id, row]));
  const shared = sharedRefusal(summary, current.failed);
  const status = loading
    ? `Loading the comparison for ${option.title}.`
    : shared
      ? `${option.title}: ${shared}`
      : `${option.title}: comparison ready.`;

  return (
    <div className="compare-ai" data-testid="compare-ai">
      <label className="chart-picker" htmlFor={selectId}>
        Pick a race
        <select id={selectId} value={raceId} onChange={(event) => setRaceId(event.target.value)}>
          {options.map((row) => (
            <option key={row.raceId} value={row.raceId}>
              {row.title}
            </option>
          ))}
        </select>
      </label>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <div className="compare-cols" aria-busy={loading}>
        <section className="compare-col">
          <h3>What to know</h3>
          <ClaimList claims={option.know} byId={byId} />
        </section>
        {shared ? (
          <section className="compare-col compare-col-wide" data-testid="compare-refusal">
            <h3>Where they differ and agree</h3>
            <p className="refusal">{shared}</p>
          </section>
        ) : (
          <>
            <section className="compare-col">
              <h3>Where they differ</h3>
              {loading ? <p className="hint">Reading the cited records…</p> : null}
              {summary && summary.differ.length > 0 ? <ClaimList claims={summary.differ} byId={byId} /> : null}
              {summary?.differRefusal ? <p className="refusal">{summary.differRefusal}</p> : null}
            </section>
            <section className="compare-col">
              <h3>Where they agree</h3>
              {loading ? <p className="hint">Reading the cited records…</p> : null}
              {summary && summary.agree.length > 0 ? <ClaimList claims={summary.agree} byId={byId} /> : null}
              {summary?.agreeRefusal ? <p className="refusal">{summary.agreeRefusal}</p> : null}
            </section>
          </>
        )}
      </div>
      {summary?.notice ? <p className="notice">{summary.notice}</p> : null}
      <SideBySide key={raceId} evidence={evidence} open={Boolean(shared)} loading={loading} />
      <p className="hint">
        {summary?.mode === "ai"
          ? "Written by AI from the cited statements and votes stored on this site. Every point links to its source. Check the source before you rely on it."
          : "Built only from the cited statements and votes stored on this site."}{" "}
        It does not rate candidates or predict results.{" "}
        <a href={withBasePath(`/races/${option.raceId}/compare`)}>Full side-by-side comparison</a>
      </p>
    </div>
  );
}
