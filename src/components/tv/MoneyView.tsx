import Link from "next/link";
import type { FundingBreakdown } from "@/lib/finance/breakdown";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { lastName } from "@/lib/tv/party";
import type { PersonView } from "@/lib/tv/people";
import { campaignCommittee, latestGifts, pacPath, periodLong, reportsFor, type GiftRow } from "@/lib/tv/money";
import { outsideFor } from "@/lib/tv/race-extra";
import { ReportButton } from "./client/Report";
import { Crumbs, SectionHead } from "./bits";
import { ExtLink } from "./ExtLink";
import { FundingBlock } from "./Funding";

export function dollars(value: number): string {
  return formatMoney(Math.round(value)).replace(/\.00$/, "");
}

function GiftName({ row }: { row: GiftRow }) {
  const path = pacPath(row.committeeId);
  const text = <span title={row.short === row.name ? undefined : row.name}>{row.short}</span>;
  return path ? <Link href={path}>{text}</Link> : text;
}

/** Who gives to one campaign: sources in plain words first, then groups that gave, then per-report detail. */
export function MoneyView({ person }: { person: PersonView & { funding: FundingBreakdown } }) {
  const funding = person.funding;
  const committee = campaignCommittee(person);
  const reports = reportsFor(person);
  const gifts = latestGifts(person);
  const outside = outsideFor(person);
  const top = Math.max(1, ...reports.map((report) => report.receipts));
  const ok = funding.status === "ok";
  const surname = lastName(person.name);

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/finance", label: "Campaign money" }, { label: person.name }]} />
      <h1 className="t-h1 pt">Who gives to {person.name}</h1>

      <section className="sec" aria-label="Where the money came from">
        <FundingBlock name={person.name} row={funding} />
        {ok ? (
          <p className="mspent">
            Spent <b className="num">{shortMoney(funding.disbursements ?? 0)}</b>. Cash left <b className="num">{shortMoney(funding.cash ?? 0)}</b>.
          </p>
        ) : null}
      </section>

      {gifts ? (
        <section className="sec" aria-labelledby="h-pac">
          <SectionHead id="h-pac" title="Groups that gave" />
          <p className="sec-sub">From the report for {periodLong(gifts.start, gifts.end)}.</p>
          <ul className="glist">
            {gifts.rows.map((row) => (
              <li key={`${row.committeeId}-${row.name}`}>
                <span className="gn">
                  <GiftName row={row} />
                  {row.short === row.name ? null : (
                    <details className="fullnm">
                      <summary>
                        Full name<span className="sr"> of {row.short}</span>
                      </summary>
                      {row.name}
                    </details>
                  )}
                </span>
                <b className="num">{dollars(row.total)}</b>
              </li>
            ))}
          </ul>
          <details className="srcd">
            <summary>Sources</summary>
            <p className="fnote">
              <ExtLink className="xl" href={gifts.sourceUrl} icon>
                {gifts.fileNumber ? `FEC filing ${gifts.fileNumber}` : "FEC filing"}
              </ExtLink>
            </p>
          </details>
        </section>
      ) : null}

      {reports.length > 0 ? (
        <details className="disc" id="reports">
          <summary>
            <span className="sec-t sm">Raised in each report</span>
          </summary>
          <div className="disc-b">
            <div className="bars fbars" role="group" aria-label="Raised in each report">
              {reports.map((report) => {
                const label = periodLong(report.start, report.end);
                return (
                  <div className="brow" key={`${report.start}-${report.end}`}>
                    <div className="who">
                      <span>{label}</span>
                    </div>
                    <div className="track" role="img" aria-label={`Raised ${dollars(report.receipts)} in the report for ${label}`}>
                      <span className="fill" style={{ width: `${((report.receipts / top) * 100).toFixed(1)}%` }} />
                    </div>
                    <span className="val" title={dollars(report.receipts)}>
                      {shortMoney(report.receipts)}
                    </span>
                  </div>
                );
              })}
            </div>
            <details className="srcd">
              <summary>Sources</summary>
              <ul className="srcl-list">
                {[...reports].reverse().map((report) => (
                  <li key={report.fileNumber}>
                    <ExtLink className="xl" href={report.sourceUrl} icon>
                      FEC filing {report.fileNumber}
                    </ExtLink>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </details>
      ) : null}

      {outside ? (
        <section className="sec" aria-labelledby="h-o">
          <SectionHead id="h-o" title="Outside groups" />
          <p className="sec-sub">Groups that spent on their own, not money the campaign received.</p>
          <p className="outl">
            For {person.name}: <b className="num">{dollars(outside.support)}</b>
          </p>
          <p className="outl">
            Against {person.name}: <b className="num">{dollars(outside.oppose)}</b>
          </p>
          <details className="srcd">
            <summary>Sources</summary>
            <p className="fnote">
              <ExtLink className="xl" href={outside.sourceUrl} icon>
                FEC outside spending
              </ExtLink>
            </p>
          </details>
        </section>
      ) : null}

      <p className="page-f">
        <Link className="btn primary" href={`/candidates/${person.id}`}>
          See {surname}’s profile
        </Link>
        {committee ? (
          <ExtLink className="xl" href={`https://www.fec.gov/data/receipts/?committee_id=${committee.committeeId}`} icon>
            People who gave over $200, on the FEC website
          </ExtLink>
        ) : null}
        <ReportButton candidateId={person.id} />
      </p>
    </div>
  );
}
