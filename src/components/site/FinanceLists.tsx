import Link from "next/link";
import { normalizePersonName } from "@/lib/data/names";
import { httpsUrl } from "@/lib/format";
import { coverageLabel, FINANCE_EXPLANATION, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

export function FinanceExplanation() {
  return (
    <p id="direct-and-outside">
      {FINANCE_EXPLANATION}
    </p>
  );
}

export function DirectList({ rows }: { rows: readonly FinanceDirect[] }) {
  if (rows.length === 0) return <p>No committee totals for this filter.</p>;
  return (
    <ul className="card-grid">
      {rows.map((row) => {
        const name = row.name ? normalizePersonName(row.name) ?? row.name : row.candidateId;
        const source = httpsUrl(row.sourceUrl);
        return (
          <li className="card" key={`${row.scope}-${row.candidateId}-${row.committeeId ?? ""}-${row.coverageEnd ?? ""}-${row.fileNumber ?? ""}`}>
            <h3>
              {row.committeeId ? (
                <Link href={`/finance/committees/${row.committeeId}`}>{row.committeeName ?? row.committeeId}</Link>
              ) : (
                row.committeeName ?? "Committee"
              )}
            </h3>
            <p>
              <Link href={`/candidates/${row.candidateId}`}>{name}</Link>
            </p>
            <p>Receipts {formatMoney(row.receipts)}</p>
            <p>Disbursements {formatMoney(row.disbursements)}</p>
            <p>Cash on hand {formatMoney(row.cashOnHand)}</p>
            <p>Debts {formatMoney(row.debts)}</p>
            <p className="hint">{coverageLabel(row.coverageStart, row.coverageEnd)}</p>
            {source ? (
              <p>
                <a href={source}>{row.sourceLabel}</a>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function OutsideList({ rows }: { rows: readonly FinanceOutside[] }) {
  if (rows.length === 0) return <p>No independent expenditures for this cycle.</p>;
  return (
    <ul className="card-grid">
      {rows.map((row) => {
        const source = httpsUrl(row.sourceUrl);
        const who = row.candidateName ? normalizePersonName(row.candidateName) ?? row.candidateName : row.candidateId;
        return (
          <li className="card" key={`${row.candidateId}-${row.committeeId}-${row.support}`}>
            <h3>
              <Link href={`/finance/committees/${row.committeeId}`}>{row.committeeName ?? row.committeeId}</Link>
            </h3>
            <p>
              {row.support === "support" ? "Supports" : "Opposes"}{" "}
              <Link href={`/candidates/${row.candidateId}`}>{who}</Link>
            </p>
            <p>{formatMoney(row.total)}</p>
            <p className="hint">Not money the candidate committee received.</p>
            {source ? (
              <p>
                <a href={source}>{row.sourceLabel}</a>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
