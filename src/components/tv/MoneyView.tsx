import Link from "next/link";
import type { FundingBreakdown } from "@/lib/finance/breakdown";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { lastName } from "@/lib/tv/party";
import type { PersonView } from "@/lib/tv/people";
import { campaignCommittee, latestGifts, pacPath, periodLong, reportsFor, type GiftRow } from "@/lib/tv/money";
import { outsideFor } from "@/lib/tv/race-extra";
import { ReportButton } from "./client/Report";
import { YoursContext } from "./client/Yours";
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

/** Where one campaign's money came from: bar, totals, receipts per report, committee gifts, outside groups. */
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
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/finance", label: "Campaign Finance" },
          { label: committee?.name ?? person.name },
        ]}
      />
      <YoursContext />
      <h1 className="t-h1 pt">Where {person.name}’s money comes from</h1>

      <section className="sec" aria-label="Where it came from">
        <FundingBlock name={person.name} row={funding} />
      </section>

      {ok ? (
        <section className="sec" aria-label="Totals">
          <dl className="stats">
            <div>
              <dt>Raised</dt>
              <dd className="num">{shortMoney(funding.receipts ?? 0)}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd className="num">{shortMoney(funding.disbursements ?? 0)}</dd>
            </div>
            <div>
              <dt>Cash</dt>
              <dd className="num">{shortMoney(funding.cash ?? 0)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {reports.length > 0 || gifts ? (
        <div className="mgrid">
          {reports.length > 0 ? (
            <section className="sec" aria-labelledby="h-per">
              <SectionHead id="h-per" title="Raised per report" />
              <div className="bars fbars" role="group" aria-label="Raised per report">
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
              <p className="src">
                Source:{" "}
                {[...reports].reverse().map((report, index) => (
                  <span key={report.fileNumber}>
                    {index > 0 ? "; " : null}
                    <ExtLink className="xl" href={report.sourceUrl} icon>
                      {index === 0 ? `FEC filing ${report.fileNumber}` : report.fileNumber}
                    </ExtLink>
                  </span>
                ))}
              </p>
            </section>
          ) : null}
          {gifts ? (
            <section className="sec" aria-labelledby="h-pac">
              <SectionHead id="h-pac" title={`Committee gifts, ${periodLong(gifts.start, gifts.end)} report`} />
              <div className="tscroll">
                <table className="tbl">
                  <caption className="sr">Committee gifts</caption>
                  <thead>
                    <tr>
                      <th scope="col">Committee</th>
                      <th scope="col" className="r">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gifts.rows.map((row) => (
                      <tr key={`${row.committeeId}-${row.name}`}>
                        <td>
                          {row.short === row.name ? (
                            <GiftName row={row} />
                          ) : (
                            <>
                              <GiftName row={row} />
                              <details className="fullnm">
                                <summary>
                                  Full name<span className="sr"> of {row.short}</span>
                                </summary>
                                {row.name}
                              </details>
                            </>
                          )}
                        </td>
                        <td className="r num">{dollars(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="src">
                Source:{" "}
                <ExtLink className="xl" href={gifts.sourceUrl} icon>
                  {gifts.fileNumber ? `FEC filing ${gifts.fileNumber}` : "FEC filing"}
                </ExtLink>
              </p>
            </section>
          ) : null}
        </div>
      ) : null}

      {outside ? (
        <section className="sec" aria-labelledby="h-o">
          <SectionHead id="h-o" title="Outside spending" />
          <p className="outl">
            Outside groups for {person.name}: <b className="num">{dollars(outside.support)}</b>
          </p>
          <p className="outl">
            Outside groups against {person.name}: <b className="num">{dollars(outside.oppose)}</b>
          </p>
          <p className="src">
            Source:{" "}
            <ExtLink className="xl" href={outside.sourceUrl} icon>
              FEC independent expenditures
            </ExtLink>
          </p>
        </section>
      ) : null}

      <p className="page-f">
        <Link className="btn primary" href={`/candidates/${person.id}`}>
          See {surname}’s profile
        </Link>
        {committee ? (
          <ExtLink className="xl" href={`https://www.fec.gov/data/receipts/?committee_id=${committee.committeeId}`} icon>
            Individual donors: FEC
          </ExtLink>
        ) : null}
        <ReportButton candidateId={person.id} />
      </p>
      <details className="how">
        <summary>Sources and method</summary>
        <div className="how-b">
          {reports.length > 0 ? `Raised per report: each bar is one FEC reporting period (${reports.length} in our records). ` : null}
          {gifts ? "Committee gifts cover one report only. " : null}
          Individual donors over $200 are listed by the FEC, not here. Outside groups spend on their own; that is not campaign money.
        </div>
      </details>
    </div>
  );
}
