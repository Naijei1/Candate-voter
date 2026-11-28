import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PopMenu } from "@/components/tv/client/PopMenu";
import { ReportButton } from "@/components/tv/client/Report";
import { Crumbs, Face, PartyTag } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { FundingBar, fundingCoverage, FundingKey } from "@/components/tv/Funding";
import { Icon } from "@/components/tv/Icon";
import { WonTag } from "@/components/tv/Won";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { dayLabel } from "@/lib/format";
import { profileFor } from "@/lib/site/profiles";
import { stanceIssues, type Stance } from "@/lib/site/stances";
import { stateConfig } from "@/lib/states";
import { MY_RACES_CRUMB } from "@/lib/tv/nav";
import { newsForRace } from "@/lib/tv/news";
import { lastName } from "@/lib/tv/party";
import { backgroundParts, defaultPair, isHouseVote, mainRival, voteChoice, raceView, stanceFor, type PersonView, type RaceView } from "@/lib/tv/people";
import { outsideFor, recordNote } from "@/lib/tv/race-extra";
import { isWinner } from "@/lib/tv/results-gate";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ raceId: string }>;
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick(race: RaceView, a?: string, b?: string): [PersonView, PersonView] | null {
  const find = (id?: string) => race.people.find((person) => person.id === id) ?? null;
  let first = find(a);
  let second = find(b);
  if (first && second && first.id === second.id) second = null;
  if (!first && !second) return defaultPair(race);
  if (first && !second) second = mainRival(race, first.id);
  if (!first && second) first = mainRival(race, second.id);
  return first && second ? [first, second] : null;
}

function compareHref(race: RaceView, a: string, b: string): string {
  return `/races/${race.raceId}/compare?a=${a}&b=${b}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const race = raceView((await params).raceId);
  if (!race) return { title: "Compare" };
  const query = await searchParams;
  const pair = pick(race, one(query.a), one(query.b));
  return {
    alternates: { canonical: `/races/${race.raceId}/compare` },
    title: pair ? `Compare ${lastName(pair[0].name)} and ${lastName(pair[1].name)}` : `Compare · ${race.title}`,
  };
}

function StanceCell({ stance }: { stance: Stance }) {
  const vote = isHouseVote(stance) ? voteChoice(stance.text) : null;
  return (
    <>
      <p className="pt">
        {isHouseVote(stance) ? (
          <>
            <span className="vtag">House vote</span>{" "}
          </>
        ) : null}
        {stance.text}
      </p>
      <p className="pm">
        <time dateTime={stance.sourceDate}>{dayLabel(stance.sourceDate)}</time>{" "}
        <ExtLink className="schip" href={stance.sourceUrl} icon>
          <span className="lb">{stance.sourceName}</span>
        </ExtLink>
      </p>
      {vote ? <span className="hint">Vote: {vote}</span> : null}
    </>
  );
}

function Background({ person }: { person: PersonView }) {
  const parts = backgroundParts(person);
  if (parts.length === 0) return <span className="none">Not in our records</span>;
  return (
    <>
      {parts.map((part, index) => (
        <p className="pt" key={index}>
          {part.says ? <span className="cs-t">The campaign says:</span> : null}
          {part.says ? " " : null}
          {part.text}
          {part.muted ? (
            <>
              {" "}
              <span className="muted">{part.muted}</span>
            </>
          ) : null}
        </p>
      ))}
    </>
  );
}

function Row({ label, pair, cell }: { label: string; pair: [PersonView, PersonView]; cell: (person: PersonView) => ReactNode }) {
  return (
    <div className="crow">
      <div className="ck">{label}</div>
      {pair.map((person) => (
        <div className="cv" key={person.id}>
          <span className="cn">{lastName(person.name)}</span>
          {cell(person)}
        </div>
      ))}
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="cblk" id={id} aria-labelledby={`${id}-h`}>
      <h2 className="sec-t sm" id={`${id}-h`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function money(value: number | null | undefined): string {
  return value == null ? "—" : shortMoney(value);
}

function Swap({ race, person, other, side }: { race: RaceView; person: PersonView; other: PersonView; side: "a" | "b" }) {
  const choices = race.people.filter((row) => row.id !== person.id && row.id !== other.id);
  if (choices.length === 0) return null;
  return (
    <PopMenu label={`Compare ${lastName(other.name)} with`} button={<>Change {lastName(person.name)}</>} buttonClass="btn outline sm">
      {choices.map((row) => (
        <Link key={row.id} href={side === "a" ? compareHref(race, row.id, other.id) : compareHref(race, other.id, row.id)} role="menuitem">
          <b>{row.name}</b>
          <span>{row.role}</span>
        </Link>
      ))}
    </PopMenu>
  );
}

export default async function ComparePage({ params, searchParams }: PageProps) {
  const race = raceView((await params).raceId);
  if (!race) notFound();
  const query = await searchParams;
  const pair = pick(race, one(query.a), one(query.b));
  if (!pair) notFound();
  const [a, b] = pair;
  const state = stateConfig();
  const issues = stanceIssues();
  const stances = issues.map((issue) => ({ issue, a: stanceFor(a.id, issue.id), b: stanceFor(b.id, issue.id) }));
  const both = stances.filter((row) => row.a && row.b);
  const onlyA = stances.filter((row) => row.a && !row.b);
  const onlyB = stances.filter((row) => !row.a && row.b);
  const neither = stances.filter((row) => !row.a && !row.b).map((row) => row.issue.label);
  const news = await newsForRace(race.raceId, [a.id, b.id]);
  const hasStatements = news.some((item) => item.kind === "stmt" && (item.personIds.includes(a.id) || item.personIds.includes(b.id)));
  const missing = [...neither, ...(hasStatements ? [] : ["Statements"])];
  const votes = { [a.id]: profileFor(a.id).votes.length, [b.id]: profileFor(b.id).votes.length };
  const funded = pair.filter((person) => person.funding?.status === "ok");

  return (
    <div className="wrap cmp">
      <Crumbs items={[{ href: "/", label: "Home" }, MY_RACES_CRUMB, { href: `/races/${race.raceId}`, label: race.title }, { label: "Compare" }]} />
      <h1 className="t-h1 pt">
        Compare {lastName(a.name)} and {lastName(b.name)}
      </h1>
      {race.people.length > 2 ? (
        <div className="cswap">
          <Swap race={race} person={a} other={b} side="a" />
          <Swap race={race} person={b} other={a} side="b" />
        </div>
      ) : null}

      <div className="chead">
        <div className="crow">
          <div className="ck" aria-hidden="true" />
          {pair.map((person) => (
            <div className="cw" key={person.id}>
              <Link href={`/candidates/${person.id}`}>
                <Face person={person} size="lg" eager />
                <span>
                  <b>{person.name}</b>
                  <span className="cw-r">
                    <PartyTag party={person.party} size="sm" /> {person.role}
                    {isWinner(race.raceId, person.name) ? <WonTag /> : null}
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Block id="c-overview" title="Background">
        <Row
          label="Filed to run"
          pair={pair}
          cell={(person) =>
            person.filing ? (
              <>
                {person.filing.label} ·{" "}
                <ExtLink className="xl" href={person.filing.url} icon label={`filing for ${person.name}`}>
                  {state.filings.name}
                </ExtLink>
              </>
            ) : (
              <span className="none">Not in our records</span>
            )
          }
        />
        <Row label="Experience" pair={pair} cell={(person) => <Background person={person} />} />
      </Block>

      {both.length + onlyA.length + onlyB.length > 0 ? (
        <Block id="c-issues" title="Issues">
          {both.map((row) => (
            <Row key={row.issue.id} label={row.issue.label} pair={pair} cell={(person) => <StanceCell stance={(person.id === a.id ? row.a : row.b)!} />} />
          ))}
          {(
            [
              [a, onlyA, "a"],
              [b, onlyB, "b"],
            ] as const
          ).map(([person, rows, side]) =>
            rows.length > 0 ? (
              <div className="conly" key={person.id}>
                <p className="conly-h">Only {lastName(person.name)} has spoken on:</p>
                <div className="conly-l">
                  {rows.map((row) => (
                    <details className="ct" key={row.issue.id}>
                      <summary>{row.issue.label}</summary>
                      <div className="ctb">
                        <StanceCell stance={(side === "a" ? row.a : row.b)!} />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </Block>
      ) : null}

      <Block id="c-record" title="Voting record">
        <Row
          label="Record"
          pair={pair}
          cell={(person) =>
            votes[person.id] > 0 ? (
              <>
                {votes[person.id]} House votes. <Link href={`/candidates/${person.id}#record`}>See them</Link>
              </>
            ) : (
              <span className="muted">{recordNote(person)}</span>
            )
          }
        />
      </Block>

      <Block id="c-finance" title="Campaign money">
        {funded.length === 0 ? (
          <Row label="Raised" pair={pair} cell={() => <span className="none">No totals reported to the Federal Election Commission</span>} />
        ) : (
          <>
            <Row
              label="Raised"
              pair={pair}
              cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.receipts)}</span> : <span className="none">No totals reported</span>)}
            />
            <Row label="Spent" pair={pair} cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.disbursements)}</span> : null)} />
            <Row label="Cash on hand" pair={pair} cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.cash)}</span> : null)} />
            <Row
              label="Where it came from"
              pair={pair}
              cell={(person) =>
                person.funding?.status === "ok" && (person.funding.receipts ?? 0) > 0 ? (
                  <>
                    <FundingKey row={person.funding} compact />
                    <FundingBar name={person.name} row={person.funding} compact />
                  </>
                ) : null
              }
            />
            <Row
              label="Sources"
              pair={pair}
              cell={(person) =>
                person.funding ? (
                  <details className="srcd">
                    <summary>Sources</summary>
                    <p className="fnote">
                      <ExtLink className="xl" href={person.funding.sourceUrl} icon>
                        {person.funding.status === "ok" ? fundingCoverage(person.funding) : "FEC committee page"}
                      </ExtLink>
                    </p>
                  </details>
                ) : null
              }
            />
          </>
        )}
        <Row
          label="Outside groups"
          pair={pair}
          cell={(person) => {
            const outside = outsideFor(person);
            if (!outside) return <span className="none">None reported</span>;
            return (
              <>
                <p className="outl">
                  Outside groups for {person.name}: <b className="num">{formatMoney(Math.round(outside.support)).replace(/\.00$/, "")}</b>
                </p>
                <p className="outl">
                  Outside groups against {person.name}: <b className="num">{formatMoney(Math.round(outside.oppose)).replace(/\.00$/, "")}</b>
                </p>
                <p className="fnote">
                  <ExtLink className="xl" href={outside.sourceUrl} icon>
                    FEC independent expenditures
                  </ExtLink>
                </p>
              </>
            );
          }}
        />
      </Block>

      <div className="cov-f">
        <details className="how">
          <summary>Sources and method</summary>
          <div className="how-b">Blank means we found none.{missing.length > 0 ? ` Nothing found for either candidate: ${missing.join(", ")}.` : ""}</div>
        </details>
      </div>
      <p className="page-f">
        {funded.map((person) => (
          <Link key={person.id} className="btn primary" href={`/finance/candidates/${person.id}`}>
            <Icon name="money" size="sm" />
            See who funds {lastName(person.name)}
          </Link>
        ))}
        <ReportButton />
      </p>
    </div>
  );
}
