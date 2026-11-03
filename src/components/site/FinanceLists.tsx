import Link from "next/link";
import { normalizePersonName } from "@/lib/data/names";
import { httpsUrl } from "@/lib/format";
import { coverageLabel, FINANCE_EXPLANATION, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

function personLabel(name: string | null, fallback: string): string {
  const normalized = name ? normalizePersonName(name) ?? name : fallback;
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0] && parts[1]) return `${parts[1]} ${parts[0]}`;
  return normalized;
}

export function orgLabel(name: string | null): string | null {
  if (!name) return null;
  return name
    .split(/\s+/)
    .map((word) => {
      if (word === "PAC" || word === "FEC" || word === "GOP" || word === "DNC" || word === "RNC") return word;
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) return `${word.charAt(0)}${word.slice(1).toLowerCase()}`;
      return word;
    })
    .join(" ");
}

function plainSource(label: string): string {
  if (label === "FEC filing") return "Official filing";
  if (label === "FEC committee report") return "Official report";
  if (label === "FEC independent expenditures") return "Outside spending record";
  return "Election commission totals";
}

export function FinanceExplanation() {
  return (
    <p id="direct-and-outside">
      {FINANCE_EXPLANATION}
    </p>
  );
}

export function DirectList({ rows }: { rows: readonly FinanceDirect[] }) {
  if (rows.length === 0) return <p>No campaign totals for this view.</p>;
  return (
    <ul className="card-grid">
      {rows.map((row) => {
        const name = personLabel(row.name, row.candidateId);
        const source = httpsUrl(row.sourceUrl);
        return (
          <li className="card" key={`${row.scope}-${row.candidateId}-${row.committeeId ?? ""}-${row.coverageEnd ?? ""}-${row.fileNumber ?? ""}`}>
            <h3>
              {row.committeeId ? (
                <Link href={`/finance/committees/${row.committeeId}`}>{orgLabel(row.committeeName) ?? row.committeeId}</Link>
              ) : (
                orgLabel(row.committeeName) ?? "Campaign group"
              )}
            </h3>
            <p>
              <Link href={`/candidates/${row.candidateId}`}>{name}</Link>
            </p>
            <p>Raised {formatMoney(row.receipts)}</p>
            <p>Spent {formatMoney(row.disbursements)}</p>
            <p>Cash left {formatMoney(row.cashOnHand)}</p>
            <p>Debts {formatMoney(row.debts)}</p>
            <p className="hint">{coverageLabel(row.coverageStart, row.coverageEnd)}</p>
            {source ? (
              <p>
                <a href={source}>{plainSource(row.sourceLabel)}</a>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function OutsideList({ rows }: { rows: readonly FinanceOutside[] }) {
  if (rows.length === 0) return <p>No outside spending is recorded for this year.</p>;
  return (
    <ul className="card-grid">
      {rows.map((row) => {
        const source = httpsUrl(row.sourceUrl);
        const who = personLabel(row.candidateName, row.candidateId);
        return (
          <li className="card" key={`${row.candidateId}-${row.committeeId}-${row.support}`}>
            <h3>
              <Link href={`/finance/committees/${row.committeeId}`}>{orgLabel(row.committeeName) ?? row.committeeId}</Link>
            </h3>
            <p>
              {row.support === "support" ? "Supports" : "Opposes"}{" "}
              <Link href={`/candidates/${row.candidateId}`}>{who}</Link>
            </p>
            <p>{formatMoney(row.total)}</p>
            <p className="hint">Not money the campaign received.</p>
            {source ? (
              <p>
                <a href={source}>{plainSource(row.sourceLabel)}</a>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
