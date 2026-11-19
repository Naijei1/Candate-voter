"use client";

import { useEffect, useId, useState } from "react";
import type { Claim, CompareBasis, Evidence } from "@/lib/compare/evidence";
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

function SideBySide({ basis }: { basis: CompareBasis }) {
  const byIssue = new Map<string, Evidence[]>();
  for (const row of basis.evidence) {
    if (!row.personId) continue;
    const key = row.issue ?? (row.kind === "vote" ? "House votes" : "Other");
    byIssue.set(key, [...(byIssue.get(key) ?? []), row]);
  }
  return (
    <details className="side-by-side">
      <summary>What each candidate said, issue by issue</summary>
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

export function CompareSection({ bases }: { bases: readonly CompareBasis[] }) {
  const selectId = useId();
  const [raceId, setRaceId] = useState(bases[0]?.raceId ?? "");
  const [state, setState] = useState<State>({ raceId: "", summary: null, failed: false });
  const basis = bases.find((row) => row.raceId === raceId) ?? bases[0];

  useEffect(() => {
    if (!raceId) return;
    const controller = new AbortController();
    setState({ raceId, summary: null, failed: false });
    fetch(withBasePath(`/api/compare?race=${encodeURIComponent(raceId)}`), { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as CompareSummary;
        if (!body || !Array.isArray(body.know)) throw new Error("shape");
        setState({ raceId, summary: body, failed: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ raceId, summary: null, failed: true });
      });
    return () => controller.abort();
  }, [raceId]);

  if (!basis) return null;
  const byId = new Map(basis.evidence.map((row) => [row.id, row]));
  const summary = state.raceId === raceId ? state.summary : null;
  const loading = !summary && !(state.raceId === raceId && state.failed);
  const unavailable = "The AI summary isn't available right now. Below is what each candidate said, with sources, so you can compare for yourself.";

  return (
    <div className="compare-ai" data-testid="compare-ai">
      <label className="chart-picker" htmlFor={selectId}>
        Pick a race
        <select id={selectId} value={raceId} onChange={(event) => setRaceId(event.target.value)}>
          {bases.map((row) => (
            <option key={row.raceId} value={row.raceId}>
              {row.title}
            </option>
          ))}
        </select>
      </label>
      <div className="compare-cols" aria-live="polite" aria-busy={loading}>
        <section className="compare-col">
          <h3>What to know</h3>
          <ClaimList claims={basis.know} byId={byId} />
        </section>
        <section className="compare-col">
          <h3>Where they differ</h3>
          {loading ? <p className="hint">Reading the cited records…</p> : null}
          {summary && summary.differ.length > 0 ? <ClaimList claims={summary.differ} byId={byId} /> : null}
          {summary?.differRefusal ? <p className="refusal">{summary.differRefusal}</p> : null}
          {!summary && !loading ? <p className="refusal">{unavailable}</p> : null}
        </section>
        <section className="compare-col">
          <h3>Where they agree</h3>
          {loading ? <p className="hint">Reading the cited records…</p> : null}
          {summary && summary.agree.length > 0 ? <ClaimList claims={summary.agree} byId={byId} /> : null}
          {summary?.agreeRefusal ? <p className="refusal">{summary.agreeRefusal}</p> : null}
          {!summary && !loading ? <p className="refusal">{unavailable}</p> : null}
        </section>
      </div>
      {summary?.notice ? <p className="notice">{summary.notice}</p> : null}
      <SideBySide basis={basis} />
      <p className="hint">
        {summary?.mode === "ai"
          ? "Written by AI from the cited statements and votes stored on this site. Every point links to its source. Check the source before you rely on it."
          : "Built only from the cited statements and votes stored on this site."}{" "}
        It does not rate candidates or predict results. <a href={`/races/${basis.raceId}/compare`}>Full side-by-side comparison</a>
      </p>
    </div>
  );
}
