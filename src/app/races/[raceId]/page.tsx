import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPanel } from "@/components/tv/Ask";
import { FollowButton } from "@/components/tv/client/Follow";
import { ReportButton } from "@/components/tv/client/Report";
import { SheetButton } from "@/components/tv/client/Sheet";
import { Tabs } from "@/components/tv/client/Tabs";
import { YoursContext } from "@/components/tv/client/Yours";
import { Crumbs, Empty, Face, PartyTag } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { FinanceTable, FundingLegend } from "@/components/tv/FinanceTable";
import { Icon } from "@/components/tv/Icon";
import { NewsList } from "@/components/tv/NewsList";
import { VoteRecord } from "@/components/tv/Votes";
import { WonTag } from "@/components/tv/Won";
import { formatMoney } from "@/lib/finance/model";
import { dayLabel } from "@/lib/format";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { profileFor } from "@/lib/site/profiles";
import { stanceIssues } from "@/lib/site/stances";
import { stateConfig, statePath } from "@/lib/states";
import { raceQuestions } from "@/lib/tv/ask";
import { newsForRace } from "@/lib/tv/news";
import { initials, lastName } from "@/lib/tv/party";
import { allRaces, backgroundParts, defaultPair, isHouseVote, raceView, stanceFor, voteChoice, type PersonView, type RaceView } from "@/lib/tv/people";
import { outsideSpending, raceTimeline, recordNote } from "@/lib/tv/race-extra";
import { isWinner } from "@/lib/tv/results-gate";
import { shortLine } from "@/lib/tv/short-line";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ raceId: string }> };

export function generateStaticParams() {
  return allRaces().map((race) => ({ raceId: race.raceId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const race = raceView((await params).raceId);
  if (!race) return { title: "Race not found" };
  return {
    alternates: { canonical: `/races/${race.raceId}` },
    title: `${race.title}, ${stateConfig().name}`,
    description: `Everyone running for ${race.title} in ${stateConfig().name}, with sourced facts, positions and campaign money.`,
  };
}

function Card({ person, race }: { person: PersonView; race: RaceView }) {
  return (
    <article className={`ccard ${person.party.key}`}>
      <div className="ph">
        {person.photo ? (
          <img src={person.photo.src} alt={`Portrait of ${person.name}`} loading="eager" width={400} height={400} />
        ) : (
          <div className="ph-empty">
            <span className="ini-big" aria-hidden="true">
              {initials(person.name)}
            </span>
            <span>No photo</span>
          </div>
        )}
        <PartyTag party={person.party} corner />
      </div>
      <div className="cb">
        <h3 className="cname">{person.name}</h3>
        <p className={`role ${person.party.key}`}>
          {person.role}
          {isWinner(race.raceId, person.name) ? <WonTag /> : null}
        </p>
        {person.oneLine ? <p className="one">{person.oneLine}</p> : <p className="one none">No background in our records.</p>}
        <Link className={`btn vp ${person.party.key}`} href={`/candidates/${person.id}`} aria-label={`View profile: ${person.name}`}>
          View Profile
        </Link>
        <p className="cacts">
          <Link href={`/candidates/${person.id}#money`} aria-label={`Money: ${person.name}`}>
            <Icon name="money" size="sm" />
            Money
          </Link>
        </p>
      </div>
    </article>
  );
}

function ColumnHead({ person }: { person: PersonView }) {
  return (
    <div className="sbs-h">
      <Link href={`/candidates/${person.id}`}>
        <Face person={person} eager />
        <span>
          <b>{person.name}</b>
        </span>
      </Link>
    </div>
  );
}

function Overview({ race }: { race: RaceView }) {
  const rows = ["Party", "Filed to run", "Ballot", "Campaign website", "Background"];
  return (
    <>
      <div
        className="sbs"
        style={
          {
            "--n": race.people.length,
            "--k": rows.length + 1,
          } as React.CSSProperties
        }
      >
        <div className="sbs-lab" aria-hidden="true">
          <div className="sbs-h" />
          {rows.map((row) => (
            <div className="sbs-c" key={row}>
              {row}
            </div>
          ))}
        </div>
        {race.people.map((person) => {
          const background = backgroundParts(person);
          return (
            <div className="sbs-col" role="group" aria-label={person.name} key={person.id}>
              <ColumnHead person={person} />
              <div className="sbs-c">
                <span className="cl">Party</span>
                <PartyTag party={person.party} size="sm" /> {person.role}
              </div>
              <div className="sbs-c">
                <span className="cl">Filed to run</span>
                {person.filing ? (
                  <>
                    {person.filing.label} ·{" "}
                    <ExtLink className="xl" href={person.filing.url} icon label={`${stateConfig().filings.name} filing for ${person.name}`}>
                      SOS
                    </ExtLink>
                  </>
                ) : (
                  <span className="none">Not in our records</span>
                )}
              </div>
              <div className="sbs-c">
                <span className="cl">Ballot</span>
                {person.writeIn ? "Write-in (not printed)" : "Printed on the ballot"}
              </div>
              <div className="sbs-c">
                <span className="cl">Campaign website</span>
                {person.website ? (
                  <ExtLink className="url" href={person.website.url} title={person.website.label}>
                    {person.website.label}
                  </ExtLink>
                ) : (
                  <span className="none">Not in our records</span>
                )}
              </div>
              <div className="sbs-c">
                <span className="cl">Background</span>
                {background.length === 0 ? <span className="none">Not in our records</span> : null}
                {background.map((part, index) => (
                  <span key={index}>
                    {index > 0 ? <br /> : null}
                    {part.says ? <span className="cs-t">Campaign says:</span> : null} {part.text}
                    {part.muted ? (
                      <>
                        {" "}
                        <span className="muted">{part.muted}</span>
                      </>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="src">
        Source:{" "}
        <ExtLink className="xl" href={stateConfig().filings.href} icon>
          {stateConfig().filings.name} filings
        </ExtLink>
        ;{" "}
        <ExtLink className="xl" href={KY_BALLOT_SOURCES[1].url} icon>
          Clerk of the House nominations
        </ExtLink>
      </p>
    </>
  );
}

function Issues({ race }: { race: RaceView }) {
  const issues = stanceIssues();
  return (
    <div
      className="sbs wide"
      style={
        {
          "--n": race.people.length,
          "--k": issues.length + 1,
        } as React.CSSProperties
      }
    >
      <div className="sbs-lab" aria-hidden="true">
        <div className="sbs-h" />
        {issues.map((issue) => (
          <div className="sbs-c" key={issue.id}>
            {issue.label}
          </div>
        ))}
      </div>
      {race.people.map((person) => (
        <div className="sbs-col" role="group" aria-label={person.name} key={person.id}>
          <ColumnHead person={person} />
          {issues.map((issue) => {
            const stance = stanceFor(person.id, issue.id);
            if (!stance) {
              return (
                <div className="sbs-c" key={issue.id}>
                  <span className="cl">{issue.label}</span>
                  <span className="none">Not in our records</span>
                </div>
              );
            }
            const line = shortLine(stance.text);
            const vote = isHouseVote(stance) ? voteChoice(stance.text) : null;
            return (
              <div className="sbs-c" key={issue.id}>
                <span className="cl">{issue.label}</span>
                <p className="pt">
                  {isHouseVote(stance) ? (
                    <>
                      <span className="vtag">House vote</span>{" "}
                    </>
                  ) : null}
                  {line.short}
                  {line.cut ? "…" : "."}
                </p>
                <p className="pm">
                  <time dateTime={stance.sourceDate}>{dayLabel(stance.sourceDate)}</time>{" "}
                  <ExtLink className="schip" href={stance.sourceUrl} title={stance.sourceName}>
                    <span className="lb">{stance.sourceName.split(",")[0]}</span>
                  </ExtLink>
                </p>
                {line.cut ? (
                  <details className="pmore">
                    <summary aria-label={`More: ${lastName(person.name)}, ${issue.label.toLowerCase()}`}>More</summary>
                    <p>{line.full}</p>
                  </details>
                ) : null}
                {vote ? <span className="hint">Vote: {vote}</span> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Record({ race }: { race: RaceView }) {
  return (
    <>
      {race.people.map((person) => {
        const votes = profileFor(person.id).votes;
        return (
          <div className="recblk" key={person.id}>
            <h3>
              <Face person={person} />
              {person.name}
            </h3>
            {votes.length > 0 ? (
              <>
                <VoteRecord votes={votes} first={4} more={false} />
                {votes.length > 4 ? <Link href={`/candidates/${person.id}#record`}>All {votes.length} votes</Link> : null}
              </>
            ) : (
              <p className="muted">{recordNote(person)}</p>
            )}
          </div>
        );
      })}
      <p className="src">
        Source:{" "}
        <ExtLink className="xl" href="https://clerk.house.gov/Votes" icon>
          House Clerk roll-call votes
        </ExtLink>
      </p>
    </>
  );
}

function Finance({ race }: { race: RaceView }) {
  const outside = outsideSpending(race);
  return (
    <>
      <h3 className="sub-h">Money reported</h3>
      <FundingLegend />
      <FinanceTable people={race.people} />
      <p className="src">
        Source:{" "}
        <ExtLink className="xl" href={KY_BALLOT_SOURCES[2].url} icon>
          FEC candidate totals
        </ExtLink>
      </p>
      {outside.length > 0 ? (
        <>
          <h3 className="sub-h">Outside spending</h3>
          <ul className="outlist">
            {outside.map((row) => (
              <li key={row.person.id}>
                <PartyTag party={row.person.party} size="sm" /> <Link href={`/candidates/${row.person.id}`}>{row.person.name}</Link>
                <p className="outl">
                  Outside groups for {row.person.name}: <b className="num">{formatMoney(Math.round(row.support)).replace(/\.00$/, "")}</b>
                </p>
                <p className="outl">
                  Outside groups against {row.person.name}: <b className="num">{formatMoney(Math.round(row.oppose)).replace(/\.00$/, "")}</b>
                </p>
              </li>
            ))}
          </ul>
          <p className="src">
            Source:{" "}
            {outside.map((row, index) => (
              <span key={row.person.id}>
                {index > 0 ? "; " : null}
                <ExtLink className="xl" href={row.sourceUrl} icon>
                  {outside.length > 1 ? `FEC independent expenditures, ${lastName(row.person.name)}` : "FEC independent expenditures"}
                </ExtLink>
              </span>
            ))}
          </p>
          <details className="how">
            <summary>Sources and method</summary>
            <div className="how-b">Outside groups spend on their own. This is not money the campaigns received.</div>
          </details>
        </>
      ) : null}
    </>
  );
}

export default async function RacePage({ params }: PageProps) {
  const race = raceView((await params).raceId);
  if (!race) notFound();
  const state = stateConfig();
  const pair = defaultPair(race);
  const compareHref = pair ? `/races/${race.raceId}/compare?a=${pair[0].id}&b=${pair[1].id}` : null;
  const news = await newsForRace(
    race.raceId,
    race.people.map((person) => person.id),
  );
  const statements = news.filter((item) => item.kind === "stmt");
  const reporting = news.filter((item) => item.kind !== "stmt");
  const timeline = raceTimeline(race);
  const place = race.office === "senate" ? "the Senate race" : race.short;
  const questions = raceQuestions(race);

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      panel: (
        <>
          <Overview race={race} />
          {compareHref ? (
            <p className="tabfoot">
              <Link className="btn outline" href={compareHref}>
                <Icon name="swap" size="sm" />
                Compare two candidates in detail
              </Link>
            </p>
          ) : null}
        </>
      ),
    },
    { id: "issues", label: "Issues", panel: <Issues race={race} /> },
    {
      id: "statements",
      label: "Statements",
      panel: statements.length > 0 ? <NewsList items={statements} /> : <Empty title="No candidate statements yet." />,
    },
    { id: "record", label: "Voting record", panel: <Record race={race} /> },
    {
      id: "polls",
      label: "Polls",
      panel: (
        <Empty title="No qualifying polls.">
          <p>
            <Link href="/polls">How polls are listed</Link>
          </p>
        </Empty>
      ),
    },
    {
      id: "finance",
      label: "Campaign finance",
      panel: <Finance race={race} />,
    },
    {
      id: "updates",
      label: "Updates",
      panel: (
        <>
          {timeline.length > 0 ? (
            <ol className="tl">
              {timeline.map((item, index) => (
                <li key={`${item.date}-${index}`}>
                  <time dateTime={item.date}>{dayLabel(item.date)}</time>
                  <p>{item.text}</p>
                  <ExtLink className="srcl" href={item.sourceUrl}>
                    {item.sourceName}
                  </ExtLink>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="No updates yet." />
          )}
          {reporting.length > 0 ? (
            <>
              <h3 className="sub-h">In the news</h3>
              <NewsList items={reporting} />
            </>
          ) : null}
        </>
      ),
    },
  ];

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { href: statePath(state), label: state.name }, { label: race.title }]} />
      <YoursContext />
      <div className="rhead">
        <div>
          <h1 className="t-h1">
            {race.title}
            {race.subtitle ? <span className="t-h1-sub">{race.subtitle}</span> : null}
          </h1>
        </div>
        <div className="ract">
          <SheetButton className="btn primary ask-inline" icon="ask" label="Ask about this race" title="Ask about this race">
            <AskPanel id="askm" place={place} questions={questions} />
          </SheetButton>
          <FollowButton id={race.raceId} name={race.title} label="Follow race" />
        </div>
      </div>

      <div className="cards">
        {race.people.map((person) => (
          <Card key={person.id} person={person} race={race} />
        ))}
      </div>
      {pair && compareHref ? (
        <p className="cmpgo">
          <Link className="btn primary" href={compareHref}>
            <Icon name="swap" size="sm" />
            Compare {lastName(pair[0].name)} and {lastName(pair[1].name)}
          </Link>
        </p>
      ) : null}

      <div className="race-g">
        <div className="race-main">
          <Tabs label="Compare the candidates" tabs={tabs} />
          <p className="page-f">
            <ReportButton />
            <Link href="/sources">Sources</Link>
          </p>
          <details className="how">
            <summary>Sources and method</summary>
            <div className="how-b">Candidates on the printed ballot are listed A to Z by last name, then write-in candidates.</div>
          </details>
        </div>
        <aside className="race-ask" aria-label="Ask about this race">
          <AskPanel id="askp" place={place} questions={questions} />
        </aside>
      </div>
      <SheetButton className="ask-fab btn primary" icon="ask" label="Ask about this race" title="Ask about this race">
        <AskPanel id="askf" place={place} questions={questions} />
      </SheetButton>
    </div>
  );
}
