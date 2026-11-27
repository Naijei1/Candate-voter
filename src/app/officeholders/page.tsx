import type { Metadata } from "next";
import Link from "next/link";
import { ReportButton } from "@/components/tv/client/Report";
import { Crumbs, PartyTag, ScopeNav } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { WonTag } from "@/components/tv/Won";
import { dayLabel } from "@/lib/format";
import { currentKentuckyOfficeholders, KY_CONGRESSIONAL_ROSTER_SOURCE } from "@/lib/site/ky-officeholders";
import { kyStatewide, type StatewideOfficial } from "@/lib/site/ky-statewide";
import { portraitFor } from "@/lib/site/stances";
import { stateConfig, statePath } from "@/lib/states";
import { initials, partyInfo } from "@/lib/tv/party";
import { allRaces } from "@/lib/tv/people";
import { RESULTS_SOURCE, RESULTS_VISIBLE, winnerName } from "@/lib/tv/results-gate";

export const metadata: Metadata = { alternates: { canonical: "/officeholders" }, title: "Officeholders" };
export const revalidate = 3600;

type Row = { key: string; name: string; url: string; party: string; line: string; photo: string | null; race?: { href: string; title: string } | null };

function Person({ row }: { row: Row }) {
  return (
    <li className="orow">
      <span className={`oph${row.photo ? "" : " noimg"}`}>{row.photo ? <img src={row.photo} alt="" width={64} height={80} loading="lazy" /> : <span className="ini">{initials(row.name)}</span>}</span>
      <div className="ob">
        <b>
          <ExtLink href={row.url} icon>
            {row.name}
          </ExtLink>
        </b>
        <PartyTag party={partyInfo(row.party)} size="sm" />
        <p>{row.line}</p>
        {row.race ? (
          <p className="ol">
            <Link className="rtag" href={row.race.href}>
              {row.race.title}
            </Link>
          </p>
        ) : null}
      </div>
    </li>
  );
}

function statewideRow(person: StatewideOfficial): Row {
  return { key: person.id, name: person.name, url: person.officialSite, party: person.party, line: `${person.office}. ${person.term}`, photo: person.photo?.src ?? null };
}

export default function OfficeholdersPage() {
  const state = stateConfig();
  const races = allRaces(state);
  const raceFor = (fecIds: readonly string[]) => {
    const race = races.find((item) => item.people.some((person) => fecIds.includes(person.id)));
    return race ? { href: `/races/${race.raceId}`, title: race.title } : null;
  };
  const members = currentKentuckyOfficeholders();
  const { senators, officers } = kyStatewide();
  const senateRows: Row[] = senators.map(statewideRow);
  const houseRows: Row[] = members
    .filter((member) => member.office === "house")
    .sort((a, b) => (a.district ?? 0) - (b.district ?? 0))
    .map((member) => ({
      key: member.bioguide,
      name: member.name,
      url: member.url,
      party: member.party,
      line: `District ${member.district}. Term ends ${dayLabel(member.termEnd)}.`,
      photo: member.fecIds.map((id) => portraitFor(id)?.src).find(Boolean) ?? null,
      race: raceFor(member.fecIds),
    }));
  const incoming = RESULTS_VISIBLE ? races.flatMap((race) => (winnerName(race.raceId) ? [{ race, name: winnerName(race.raceId) as string }] : [])) : [];
  return (
    <>
      <ScopeNav current="congress" />
      <div className="wrap">
        <Crumbs items={[{ href: "/", label: "Home" }, { label: "Officeholders" }]} />
        <h1 className="t-h1 pt">Officeholders</h1>
        <p className="lede">
          Who holds office now. <Link href={statePath(state)}>Who is running</Link>
        </p>
        <section className="sec" aria-labelledby="o-s">
          <div className="sec-head">
            <div>
              <h2 id="o-s" className="sec-t">
                U.S. Senate
              </h2>
            </div>
          </div>
          <ul className="olist">
            {senateRows.map((row) => (
              <Person key={row.key} row={row} />
            ))}
          </ul>
        </section>
        <section className="sec" aria-labelledby="o-h">
          <div className="sec-head">
            <div>
              <h2 id="o-h" className="sec-t">
                U.S. House
              </h2>
            </div>
          </div>
          <ul className="olist">
            {houseRows.map((row) => (
              <Person key={row.key} row={row} />
            ))}
          </ul>
          <p className="src">
            Source:{" "}
            <ExtLink className="xl" href={KY_CONGRESSIONAL_ROSTER_SOURCE} icon>
              Congress legislators, current members
            </ExtLink>
          </p>
        </section>
        {incoming.length ? (
          <section className="sec" aria-labelledby="o-i">
            <div className="sec-head">
              <div>
                <h2 id="o-i" className="sec-t">
                  Elected in {state.cycle}
                </h2>
              </div>
            </div>
            <ul className="rlist">
              {incoming.map(({ race, name }) => (
                <li key={race.raceId}>
                  <Link className="rrow sr-row" href={`/races/${race.raceId}`}>
                    <span className="ai">
                      <Icon name="ballot" size="sm" />
                    </span>
                    <span className="rt">
                      <b>
                        {name} <WonTag />
                      </b>
                      <span>{race.title}</span>
                    </span>
                    <Icon name="right" size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="src">
              Source:{" "}
              <ExtLink className="xl" href={RESULTS_SOURCE.url} icon>
                {RESULTS_SOURCE.label}
              </ExtLink>
            </p>
          </section>
        ) : null}
        <section className="sec" aria-labelledby="o-w">
          <div className="sec-head">
            <div>
              <h2 id="o-w" className="sec-t">
                Statewide offices
              </h2>
            </div>
          </div>
          <ul className="olist">
            {officers.map((person) => (
              <Person key={person.id} row={statewideRow(person)} />
            ))}
          </ul>
          <p className="src">
            Source:{" "}
            {[...new Map(officers.flatMap((person) => person.sources).map((source) => [source.url, source])).values()].map((source, index) => (
              <span key={source.url}>
                {index ? "; " : ""}
                <ExtLink className="xl" href={source.url} icon>
                  {source.name}
                </ExtLink>
              </span>
            ))}
          </p>
        </section>
        <p className="page-f">
          <ReportButton>
            <Icon name="flag" size="sm" />
            Report an error
          </ReportButton>
        </p>
      </div>
    </>
  );
}
