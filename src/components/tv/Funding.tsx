import { FUNDING_PARTS, type FundingBreakdown, type FundingPart } from "@/lib/finance/breakdown";
import { dayLabel } from "@/lib/format";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { ExtLink } from "./ExtLink";

/** Plain words for each kind of money. PAC is spelled out where it first appears. */
export const PLAIN_SOURCE: Record<FundingPart, string> = {
  individuals: "Individual people",
  committees: "Political action committees (PACs) and other groups",
  self: "The candidate’s own money",
  other: "Loans, transfers and refunds",
};

function wholeDollars(value: number): string {
  return formatMoney(Math.round(value)).replace(/\.00$/, "");
}

/** Each kind of money with an amount above zero, largest first. */
export function largestFirst(row: FundingBreakdown): Array<{ key: FundingPart; label: string; className: string; amount: number }> {
  return FUNDING_PARTS.map((part) => ({ key: part.key, label: PLAIN_SOURCE[part.key], className: part.className, amount: row[part.key] ?? 0 }))
    .filter((part) => part.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** "Individual people" to "individual people", keeping "PACs" as is. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function fundingLabel(name: string, row: FundingBreakdown): string {
  const parts = largestFirst(row).map((part) => `${lowerFirst(part.label)} ${shortMoney(part.amount)}`);
  return `${name} raised ${shortMoney(row.receipts ?? 0)}: ${parts.join(", ")}.`;
}

/** One stacked bar, largest source first. The amounts are listed as text beside it. */
export function FundingBar({ name, row }: { name: string; row: FundingBreakdown; compact?: boolean }) {
  const parts = largestFirst(row);
  if (parts.length === 0 || !row.receipts || row.receipts <= 0) return null;
  return (
    <div className="fbar" role="img" aria-label={fundingLabel(name, row)}>
      {parts.map((part) => (
        <span key={part.key} className={`fseg ${part.className}`} style={{ flexGrow: Number(((part.amount / (row.receipts || 1)) * 1000).toFixed(1)) }} title={`${part.label} ${wholeDollars(part.amount)}`} />
      ))}
    </div>
  );
}

/** Where the money came from, in plain words, largest first. */
export function FundingKey({ row, compact }: { row: FundingBreakdown; compact?: boolean }) {
  const parts = largestFirst(row);
  if (parts.length === 0) return null;
  return (
    <ul className={compact ? "fleg v fk" : "fleg v"} aria-label="Where the money came from, largest first">
      {parts.map((part) => (
        <li key={part.key}>
          <i className={`fsw ${part.className}`} aria-hidden="true" />
          <span>{part.label}</span>
          <b className="num">{shortMoney(part.amount)}</b>
        </li>
      ))}
    </ul>
  );
}

export function fundingCoverage(row: FundingBreakdown): string {
  return `Federal Election Commission totals, ${row.cycle} cycle${row.coverageEnd ? `, through ${dayLabel(row.coverageEnd)}` : ""}`;
}

/** Raised total, then sources in plain words. The FEC link sits under Sources. */
export function FundingBlock({ name, row }: { name: string; row: FundingBreakdown | null }) {
  if (!row || row.status !== "ok" || row.receipts == null) {
    return (
      <div className="fec">
        <p className="none">This campaign has reported no totals to the Federal Election Commission (FEC).</p>
        {row ? (
          <p className="fnote">
            <ExtLink className="xl" href={row.sourceUrl} icon>
              FEC committee page
            </ExtLink>
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="fec">
      <p className="ftot">
        Raised <b className="num">{shortMoney(row.receipts)}</b>
      </p>
      {row.receipts > 0 ? (
        <>
          <FundingKey row={row} />
          <FundingBar name={name} row={row} />
        </>
      ) : null}
      <details className="srcd">
        <summary>Sources</summary>
        <p className="fnote">
          <ExtLink className="xl" href={row.sourceUrl} icon>
            {fundingCoverage(row)}
          </ExtLink>
        </p>
      </details>
    </div>
  );
}
