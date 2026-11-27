import type { Metadata } from "next";
import Link from "next/link";
import { ReportButton } from "@/components/tv/client/Report";
import { YoursContext } from "@/components/tv/client/Yours";
import { Crumbs, PartyTag, SectionHead } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { FinanceTable, FundingLegend } from "@/components/tv/FinanceTable";
import { Icon } from "@/components/tv/Icon";
import { dollars } from "@/components/tv/MoneyView";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { stateConfig } from "@/lib/states";
import { allRaces } from "@/lib/tv/people";
import { campaignCommittee, pacs } from "@/lib/tv/money";
import { outsideSpending } from "@/lib/tv/race-extra";

export const metadata: Metadata = {
  alternates: { canonical: "/finance" },
  title: "Campaign Finance",
  description: "What Kentucky campaigns raised and spent, and where the money came from, from FEC reports.",
};
export const revalidate = 3600;

export default function FinancePage() {
  const state = stateConfig();
  const races = allRaces(state);
  const outside = races.flatMap((race) => outsideSpending(race));
  const committees = races.flatMap((race) =>
    race.people.flatMap((person) => {
      const committee = person.funding ? campaignCommittee(person) : null;
      return committee ? [{ person, committee }] : [];
    }),
  );
  const repeatGivers = pacs().filter((pac) => new Set(pac.gifts.map((gift) => gift.candidateId)).size > 1);

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Campaign Finance" }]} />
      <YoursContext />
      <h1 className="t-h1 pt">Campaign Finance</h1>
      <p className="lede">
        What {state.name} campaigns raised and spent, {state.cycle} cycle.
      </p>
      <nav className="jump" aria-label="On this page">
        <a href="#direct">Where the money comes from</a>
        {outside.length > 0 ? <a href="#outside">Outside spending</a> : null}
        <a href="#committees">Committees and PACs</a>
      </nav>

      <section className="sec" id="direct" aria-labelledby="h-dir">
        <SectionHead id="h-dir" title="Where the money comes from" />
        <FundingLegend />
        {races.map((race) => (
          <section className="sec fin-r" id={race.office === "senate" ? "senate" : `h${Number(race.district)}`} aria-labelledby={`f-${race.raceId}`} key={race.raceId}>
            <h3 id={`f-${race.raceId}`} className="fin-t">
              <Link href={`/races/${race.raceId}?tab=finance`}>{race.title}</Link>
            </h3>
            <FinanceTable people={race.people} />
          </section>
        ))}
        <p className="src">
          Source:{" "}
          <ExtLink className="xl" href={KY_BALLOT_SOURCES[2].url} icon>
            FEC candidate totals
          </ExtLink>
        </p>
      </section>

      {outside.length > 0 ? (
        <section className="sec" id="outside" aria-labelledby="h-out">
          <SectionHead id="h-out" title="Outside spending" />
          <ul className="outlist">
            {outside.map((row) => (
              <li key={row.person.id}>
                <PartyTag party={row.person.party} size="sm" /> <Link href={`/candidates/${row.person.id}`}>{row.person.name}</Link>
                <p className="outl">
                  Outside groups for {row.person.name}: <b className="num">{dollars(row.support)}</b>
                </p>
                <p className="outl">
                  Outside groups against {row.person.name}: <b className="num">{dollars(row.oppose)}</b>
                </p>
                <p className="srcl2">
                  <ExtLink className="xl" href={row.sourceUrl} icon>
                    FEC independent expenditures
                  </ExtLink>
                </p>
              </li>
            ))}
          </ul>
          <details className="how">
            <summary>Sources and method</summary>
            <div className="how-b">Outside groups spend on their own. This is not money the campaigns received.</div>
          </details>
        </section>
      ) : null}

      <section className="sec" id="committees" aria-labelledby="h-com">
        <SectionHead id="h-com" title="Committees and PACs" />
        <div className="rlist">
          {committees.map(({ person, committee }) => (
            <Link className="rrow" href={`/finance/candidates/${person.id}`} key={committee.committeeId}>
              <span className="num" aria-hidden="true">
                <Icon name="building" size="sm" />
              </span>
              <span className="rt">
                <b title={committee.name}>{committee.name}</b>
                <span>{person.name}</span>
              </span>
              <Icon name="right" size="sm" />
            </Link>
          ))}
          {repeatGivers.map((pac) => (
            <Link className="rrow" href={`/finance/committees/${pac.committeeId}`} key={pac.committeeId}>
              <span className="num" aria-hidden="true">
                <Icon name="building" size="sm" />
              </span>
              <span className="rt">
                <b>{pac.name}</b>
                <span>Gave to {state.name} campaigns</span>
              </span>
              <Icon name="right" size="sm" />
            </Link>
          ))}
        </div>
      </section>
      <p className="page-f">
        <ReportButton />
        <Link href="/sources#coverage">Coverage status</Link>
      </p>
    </div>
  );
}
