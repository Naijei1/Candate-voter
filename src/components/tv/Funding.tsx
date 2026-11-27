import { FUNDING_PARTS, fundingSegments, type FundingBreakdown } from "@/lib/finance/breakdown";
import { dayLabel } from "@/lib/format";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { ExtLink } from "./ExtLink";

function wholeDollars(value: number): string {
  return formatMoney(Math.round(value)).replace(/\.00$/, "");
}

export function fundingLabel(name: string, row: FundingBreakdown): string {
  const parts = FUNDING_PARTS.map((part) => `${part.label.replace(/ \(.*\)$/, "").toLowerCase().replace(/^pacs/, "PACs")} ${shortMoney(row[part.key] ?? 0)}`);
  return `${name} raised ${shortMoney(row.receipts ?? 0)}: ${parts.join(", ")}.`;
}

/** One stacked bar: individuals, PACs and other committees, self-funding, other. Shares are also listed as text. */
export function FundingBar({ name, row, compact }: { name: string; row: FundingBreakdown; compact?: boolean }) {
  const segments = fundingSegments(row);
  if (segments.length === 0) return null;
  const top = segments.reduce((best, segment) => (segment.perMille > best.perMille ? segment : best), segments[0]);
  return (
    <div className="fbar" role="img" aria-label={fundingLabel(name, row)}>
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`fseg ${segment.className}`}
          style={{ flexGrow: Number(((segment.amount / (row.receipts || 1)) * 1000).toFixed(1)) }}
          title={`${segment.label} ${wholeDollars(segment.amount)}`}
        >
          {!compact && segment === top && segment.percent >= 40 ? <span className="fl">{`${segment.label.replace(/ \(.*\)$/, "")} ${segment.percent}%`}</span> : null}
        </span>
      ))}
    </div>
  );
}

export function FundingKey({ row, compact }: { row: FundingBreakdown; compact?: boolean }) {
  return (
    <ul className={compact ? "fleg v fk" : "fleg v"} aria-label="Bar key, same order as the bar">
      {FUNDING_PARTS.map((part) => (
        <li key={part.key}>
          <i className={`fsw ${part.className}`} aria-hidden="true" />
          <span>{part.label}</span>
          <b className="num">{shortMoney(row[part.key] ?? 0)}</b>
        </li>
      ))}
    </ul>
  );
}

export function fundingCoverage(row: FundingBreakdown): string {
  return `FEC totals, ${row.cycle} cycle${row.coverageEnd ? `, through ${dayLabel(row.coverageEnd)}` : ""}`;
}

/** Raised total, bar, key and FEC source for one candidate. Says plainly when FEC has nothing. */
export function FundingBlock({ name, row }: { name: string; row: FundingBreakdown | null }) {
  if (!row || row.status !== "ok" || row.receipts == null) {
    return (
      <div className="fec">
        <p className="none">No FEC totals reported for this campaign.</p>
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
          <FundingBar name={name} row={row} />
          <FundingKey row={row} />
        </>
      ) : null}
      <p className="fnote">
        <ExtLink className="xl" href={row.sourceUrl} icon>
          {fundingCoverage(row)}
        </ExtLink>
      </p>
    </div>
  );
}
