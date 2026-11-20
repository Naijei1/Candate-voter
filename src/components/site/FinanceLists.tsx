import { isKentuckyFinanceRow } from "@/lib/site/ky-finance";
import Link from "next/link";
import { normalizePersonName } from "@/lib/data/names";
import { httpsUrl } from "@/lib/format";
import { formatOrgName } from "@/lib/site/org-name";
import { coverageLabel, formatMoney, type FinanceDirect, type FinanceOutside } from "@/lib/finance/model";

function personLabel(name: string | null, fallback: string): string {
  const normalized = name ? normalizePersonName(name) ?? name : fallback;
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0] && parts[1]) return `${parts[1]} ${parts[0]}`;
  return normalized;
}

export function orgLabel(name: string | null): string | null {
  if (!name) return null;
  return formatOrgName(name);
}

function plainSource(label: string): string {
  if (label === "FEC filing") return "Official filing";
  if (label === "FEC committee report") return "Official report";
  if (label === "FEC independent expenditures") return "Outside spending record";
  return "Election commission totals";
}

export function DirectList({ rows }: { rows: readonly FinanceDirect[] }) {
  const kentuckyRows = rows.filter(isKentuckyFinanceRow);
  if (kentuckyRows.length === 0) return null;
  return (
    <ul className="card-grid">
      {kentuckyRows.map((row) => {
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
            {row.receipts != null ? <p>Raised {formatMoney(row.receipts)}</p> : null}
            {row.disbursements != null ? <p>Spent {formatMoney(row.disbursements)}</p> : null}
            {row.cashOnHand != null ? <p>Cash on hand {formatMoney(row.cashOnHand)}</p> : null}
            {row.debts != null ? <p>Debts {formatMoney(row.debts)}</p> : null}
            {row.coverageStart || row.coverageEnd ? <p className="hint">{coverageLabel(row.coverageStart, row.coverageEnd)}</p> : null}
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
  const kentuckyRows = rows.filter(isKentuckyFinanceRow);
  if (kentuckyRows.length === 0) return null;
  return (
    <ul className="card-grid">
      {kentuckyRows.map((row) => {
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
