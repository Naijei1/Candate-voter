import { coverageLabel, formatMoney, shortMoney, type FinanceDirect } from "@/lib/finance/model";
import { filingPeriods, committeeContributions } from "@/lib/site/fec-reports";
import { kentuckyCandidates } from "@/lib/site/ky-candidate-mentions";
import { raceTitle } from "@/lib/site/money-charts";
import { orgLabel } from "./FinanceLists";

export function FilingCharts({ direct }: { direct: readonly FinanceDirect[] }) {
  const races = new Map<string, React.ReactNode[]>();
  for (const person of kentuckyCandidates) {
    if (!person.fecCandidateId) continue;
    const filings = filingPeriods(direct, person.fecCandidateId);
    const byCommittee = new Map<string, FinanceDirect[]>();
    for (const row of filings) {
      if (!row.committeeId) continue;
      byCommittee.set(row.committeeId, [...(byCommittee.get(row.committeeId) ?? []), row]);
    }
    const charts = [...byCommittee.entries()].filter(([, rows]) => rows.length > 1);
    const contributions = committeeContributions.find((entry) => entry.candidateId === person.fecCandidateId);
    if (!charts.length && !contributions) continue;
    const entries = races.get(person.raceId) ?? [];
    entries.push(
      <section key={person.id} className="stack">
        <h4>{person.name}</h4>
        {charts.map(([id, rows]) => <FilingChart key={id} rows={rows} />)}
        {contributions ? (
          <section className="chart" aria-label={`${person.name}’s top contributing committees`}>
            <h5 className="chart-title">Top contributing committees</h5>
            <p className="chart-foot">{coverageLabel(contributions.start, contributions.end)} · <a href={contributions.sourceUrl}>FEC Schedule A</a></p>
            <ul className="plain-list">
              {[...contributions.committees].filter((row) => row.total > 0).sort((a, b) => b.total - a.total).slice(0, 5).map((row) => (
                <li key={row.committeeId ?? row.name} className="flex flex-wrap justify-between gap-x-4">
                  {row.committeeId
                    ? <a href={`https://www.fec.gov/data/committee/${row.committeeId}/`}>{orgLabel(row.name)}</a>
                    : <span>{orgLabel(row.name)}</span>}
                  <span>{formatMoney(row.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>,
    );
    races.set(person.raceId, entries);
  }
  if (!races.size) return null;
  return (
    <section className="home-section stack" aria-labelledby="filing-charts-heading">
      <h2 id="filing-charts-heading">Campaign filings</h2>
      {[...races].map(([raceId, panels]) => (
        <section key={raceId} className="stack" aria-labelledby={`filings-${raceId}`}>
          <h3 id={`filings-${raceId}`}>{raceTitle(raceId)}</h3>
          <div className="card-grid">{panels}</div>
        </section>
      ))}
    </section>
  );
}

function FilingChart({ rows }: { rows: readonly FinanceDirect[] }) {
  const first = Date.parse(rows[0].coverageEnd ?? "");
  const last = Date.parse(rows.at(-1)?.coverageEnd ?? "");
  const values = rows.map((row) => row.receipts ?? 0);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const points = rows.map((row) => [
    8 + 304 * (Date.parse(row.coverageEnd ?? "") - first) / (last - first || 1),
    100 - 92 * ((row.receipts ?? 0) - min) / (max - min),
  ]);
  const label = orgLabel(rows[0].committeeName);
  return (
    <figure className="chart">
      <figcaption className="chart-title">Receipts by filing period</figcaption>
      {label ? <p className="chart-foot">{label}</p> : null}
      <div aria-hidden="true" className="mt-2 text-sm tabular-nums">
        <p>{shortMoney(Math.max(...values))} highest period</p>
        <svg className="block w-full text-accent" viewBox="0 0 320 108">
          <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" />
          {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="3" fill="currentColor" />)}
        </svg>
        <p>{coverageLabel(rows[0].coverageEnd, rows.at(-1)?.coverageEnd ?? null)}</p>
      </div>
      <details className="chart-table">
        <summary>View as table</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="FEC filing periods">
          <table>
            <caption className="sr-only">Campaign receipts by filing period</caption>
            <thead><tr><th scope="col">Period</th><th scope="col">Receipts</th><th scope="col">Source</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.coverageStart}:${row.coverageEnd}`}>
                  <th scope="row">{coverageLabel(row.coverageStart, row.coverageEnd)}</th>
                  <td>{formatMoney(row.receipts)}</td>
                  <td>{row.sourceUrl ? <a href={row.sourceUrl}>FEC</a> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
