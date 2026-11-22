"use client";

import { dayLabel } from "@/lib/format";
import { useEffect, useId, useState } from "react";
import type { Claim, CompareOption, Evidence } from "@/lib/compare/evidence";
import type { CompareSummary } from "@/lib/compare/summarize";
import { withBasePath } from "@/lib/base-path";

type State = { raceId: string; summary: CompareSummary | null; failed: boolean; fallback?: Evidence[] };

export function uniqueSources(ids: readonly string[], byId: ReadonlyMap<string, Evidence>): Evidence[] {
  const sources = new Map<string, Evidence>();
  for (const id of ids) {
    const row = byId.get(id);
    if (row && !sources.has(row.sourceUrl)) sources.set(row.sourceUrl, row);
  }
  return [...sources.values()];
}

function sourceLabel(name: string) {
  if (name.startsWith("Office of the Clerk, House roll call")) {
    return name.replace("Office of the Clerk, House", "Clerk of the House,");
  }
  return name.split(",")[0]
    .replace("Ballotpedia Candidate Connection survey", "Ballotpedia")
    .replace("Louisville Courier Journal questionnaire", "Courier Journal");
}

function Cites({ ids, byId }: { ids: readonly string[]; byId: ReadonlyMap<string, Evidence> }) {
  return (
    <span className="cites">
      {uniqueSources(ids, byId).map((row) => (
        <a key={row.sourceUrl} className="cite" href={row.sourceUrl} title={row.sourceName}>
          {sourceLabel(row.sourceName)} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </span>
  );
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

function SideBySide({ evidence, open }: { evidence: readonly Evidence[]; open: boolean }) {
  const byIssue = new Map<string, Evidence[]>();
  for (const row of evidence) {
    if (!row.personId) continue;
    const key = row.issue ?? (row.kind === "vote" ? "House votes" : "Other");
    byIssue.set(key, [...(byIssue.get(key) ?? []), row]);
  }
  if (!byIssue.size) return null;
  return (
    <details className="side-by-side" open={open || undefined}>
      <summary>Candidate statements and votes</summary>
      {[...byIssue.entries()].map(([issue, rows]) => (
        <div key={issue} className="issue-block">
          <h4>{issue}</h4>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.personName}</strong> · {row.kind === "vote" ? "Official record" : "Candidate says"} · {row.text}{" "}
                <a href={row.sourceUrl}>
                  {row.sourceName}
                  {row.sourceDate ? `, ${dayLabel(row.sourceDate)}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

export function CompareSection({ options, initialRaceId, onRaceChange, compact = false }: {
  options: readonly CompareOption[];
  initialRaceId?: string;
  onRaceChange?: (raceId: string) => void;
  compact?: boolean;
}) {
  const selectId = useId();
  const [raceId, setRaceId] = useState(initialRaceId ?? options[0]?.raceId ?? "");
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
      .catch(async (error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const fallback = await import("@/lib/compare/evidence")
          .then(({ compareBasis, candidateEvidence }) => {
            const basis = compareBasis(raceId);
            return basis ? candidateEvidence(basis) : [];
          })
          .catch(() => []);
        if (!controller.signal.aborted) setState({ raceId, summary: null, failed: true, fallback });
      });
    return () => controller.abort();
  }, [raceId]);

  if (!option) return null;
  const current = state.raceId === raceId ? state : { raceId, summary: null, failed: false };
  const summary = current.summary;
  const loading = !summary && !current.failed;
  const evidence = summary?.evidence ?? current.fallback ?? [];
  const byId = new Map([...option.ballot, ...evidence].map((row) => [row.id, row]));
  const hasSummary = Boolean(summary?.differ.length || summary?.agree.length);

  return (
    <div className="compare-ai" data-testid="compare-ai">
      <div className="chart-picker">
        <label htmlFor={selectId}>Pick a race</label>
        <select id={selectId} value={raceId} onChange={(event) => {
          setRaceId(event.target.value);
          onRaceChange?.(event.target.value);
        }}>
          {options.map((row) => (
            <option key={row.raceId} value={row.raceId}>
              {row.title}
            </option>
          ))}
        </select>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? "Loading comparison…" : ""}
      </p>
      <div className="compare-cols" aria-busy={loading}>
        <section className="compare-col">
          <h3>What to know</h3>
          <ClaimList claims={option.know} byId={byId} />
        </section>
        {summary?.differ.length || (compact && !loading) ? (
          <section className="compare-col">
            <h3>Where they differ</h3>
            {summary?.differ.length
              ? <ClaimList claims={summary.differ} byId={byId} />
              : <p className="hint">{summary?.differRefusal ?? "See the candidate records below."}</p>}
          </section>
        ) : null}
        {summary?.agree.length || (compact && !loading) ? (
          <section className="compare-col">
            <h3>Where they agree</h3>
            {summary?.agree.length
              ? <ClaimList claims={summary.agree} byId={byId} />
              : <p className="hint">{summary?.agreeRefusal ?? "See the candidate records below."}</p>}
          </section>
        ) : null}
      </div>
      {summary?.mode === "ai" && hasSummary ? <p className="hint">AI summary</p> : null}
      {!loading ? <SideBySide key={raceId} evidence={evidence} open={!hasSummary && !compact} /> : null}
      <p className="hint">
        <a href={withBasePath(`/races/${option.raceId}/compare`)}>Full side-by-side comparison</a>
      </p>
    </div>
  );
}
