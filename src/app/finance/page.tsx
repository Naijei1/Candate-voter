import type { Metadata } from "next";
import Link from "next/link";
import { MoneyFilter } from "@/components/tv/client/MoneyFilter";
import { ReportButton } from "@/components/tv/client/Report";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { MoneyList } from "@/components/tv/MoneyList";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { stateConfig } from "@/lib/states";
import { allRaces } from "@/lib/tv/people";
import { pacs } from "@/lib/tv/money";

export const metadata: Metadata = {
  alternates: { canonical: "/finance" },
  title: "Campaign money",
  description: "Who gives to Kentucky’s U.S. Senate and House campaigns, from Federal Election Commission reports.",
};
export const revalidate = 3600;

export default function FinancePage() {
  const state = stateConfig();
  const races = allRaces(state);
  const keyOf = (office: string, district?: string | null) => (office === "senate" ? "senate" : String(Number(district)));
  const sets = Object.fromEntries(
    races.map((race) => [
      keyOf(race.office, race.district),
      <section className="sec fin-r" aria-labelledby={`f-${race.raceId}`} key={race.raceId}>
        <h2 id={`f-${race.raceId}`} className="sec-t sm">
          <Link href={`/races/${race.raceId}?tab=money`}>{race.title}</Link>
        </h2>
        <MoneyList race={race} />
      </section>,
    ]),
  );
  const repeatGivers = pacs().filter((pac) => new Set(pac.gifts.map((gift) => gift.candidateId)).size > 1);

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Campaign money" }]} />
      <h1 className="t-h1 pt">Campaign money</h1>
      <p className="lede">Who gives to each campaign. Campaigns report this to the Federal Election Commission (FEC).</p>

      <MoneyFilter races={races.map((race) => ({ key: keyOf(race.office, race.district), label: race.office === "senate" ? "U.S. Senate" : race.short }))} sets={sets} />

      {repeatGivers.length > 0 ? (
        <section className="sec" aria-labelledby="h-pac">
          <h2 id="h-pac" className="sec-t sm">
            Political action committees (PACs) that gave to more than one {state.name} campaign
          </h2>
          <ul className="srcl-list">
            {repeatGivers.map((pac) => (
              <li key={pac.committeeId}>
                <Link href={`/finance/committees/${pac.committeeId}`}>{pac.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="srcd">
        <summary>Sources</summary>
        <p className="fnote">
          <ExtLink className="xl" href={KY_BALLOT_SOURCES[2].url} icon>
            FEC candidate totals
          </ExtLink>
        </p>
      </details>
      <p className="page-f">
        <ReportButton />
        <Link href="/sources">Where our facts come from</Link>
      </p>
    </div>
  );
}
