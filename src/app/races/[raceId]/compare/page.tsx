import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ExpandAll } from "@/components/tv/client/ExpandAll";
import { PopMenu } from "@/components/tv/client/PopMenu";
import { ReportButton } from "@/components/tv/client/Report";
import { YoursContext } from "@/components/tv/client/Yours";
import { Crumbs, Face, PartyTag } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { FundingBar, FundingKey } from "@/components/tv/Funding";
import { Icon } from "@/components/tv/Icon";
import { WonTag } from "@/components/tv/Won";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { dayLabel } from "@/lib/format";
import { profileFor } from "@/lib/site/profiles";
import { stanceIssues, type Stance } from "@/lib/site/stances";
import { stateConfig, statePath } from "@/lib/states";
import { newsForRace } from "@/lib/tv/news";
import { lastName } from "@/lib/tv/party";
import { backgroundParts, defaultPair, isHouseVote, mainRival, voteChoice, raceView, stanceFor, type PersonView, type RaceView } from "@/lib/tv/people";
import { outsideFor, recordNote } from "@/lib/tv/race-extra";
import { isWinner } from "@/lib/tv/results-gate";
import { shortLine } from "@/lib/tv/short-line";

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

function Short({ text, label, says }: { text: string; label: string; says?: boolean }) {
  const line = shortLine(text);
  return (
    <>
      <p className="pt">
        {says ? <span className="cs-t">Says:</span> : null}
        {says ? " " : null}
        {line.short}
        {line.cut ? "…" : "."}
      </p>
      {line.cut ? (
        <details className="pmore">
          <summary aria-label={label}>More</summary>
          <p>{line.full}</p>
        </details>
      ) : null}
    </>
  );
}

function StanceCell({ person, issue, stance }: { person: PersonView; issue: string; stance: Stance }) {
  const line = shortLine(stance.text);
  const vote = isHouseVote(stance) ? voteChoice(stance.text) : null;
  return (
    <>
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
        <ExtLink className="schip" href={stance.sourceUrl} title={stance.sourceName} icon>
          <span className="lb">{stance.sourceName.split(",")[0]}</span>
        </ExtLink>
      </p>
      {line.cut ? (
        <details className="pmore">
          <summary aria-label={`More: ${lastName(person.name)}, ${issue.toLowerCase()}`}>More</summary>
          <p>{line.full}</p>
        </details>
      ) : null}
      {vote ? <span className="hint">Vote: {vote}</span> : null}
    </>
  );
}

function Background({ person }: { person: PersonView }) {
  const parts = backgroundParts(person);
  const surname = lastName(person.name);
  if (parts.length === 0) return <span className="none">Not in our records</span>;
  if (parts[0].says) {
    const first = shortLine(parts[0].text);
    return (
      <>
        <p className="pt">
          <span className="cs-t">Says:</span> {first.short}…
        </p>
        <details className="pmore">
          <summary aria-label={`More about ${surname}’s background`}>More</summary>
          <p>
            {parts.map((part, index) => (
              <span key={index}>
                {index > 0 ? <br /> : null}
                <span className="cs-t">Campaign says:</span> {part.text}
                {part.muted ? (
                  <>
                    {" "}
                    <span className="muted">{part.muted}</span>
                  </>
                ) : null}
              </span>
            ))}
          </p>
        </details>
      </>
    );
  }
  if (parts.length === 1 && !parts[0].muted) return <Short text={parts[0].text} label={`More about ${surname}’s background`} />;
  if (parts.length === 1) {
    return (
      <>
        {parts[0].text} <span className="muted">{parts[0].muted}</span>
      </>
    );
  }
  return (
    <>
      <p className="pt">{parts[0].text.split(" · ")[0]}</p>
      <details className="pmore">
        <summary aria-label={`More about ${surname}’s background`}>More</summary>
        <p>
          {parts.map((part, index) => (
            <span key={index}>
              {index > 0 ? <br /> : null}
              {part.text}
              {part.muted ? (
                <>
                  {" "}
                  <span className="muted">{part.muted}</span>
                </>
              ) : null}
            </span>
          ))}
        </p>
      </details>
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

function Block({ id, title, open = true, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <section className="cblk" id={id}>
      <details open={open}>
        <summary>
          <h2 className="sec-t sm">{title}</h2>
        </summary>
        {children}
      </details>
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
    <PopMenu label="Compare with" button={<Icon name="swap" size="sm" />} buttonClass="btn ghost sm" buttonLabel={`Change ${lastName(person.name)}`}>
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
  const missing = [...neither, ...(hasStatements ? [] : ["Statements"]), "Polls"];
  const votes = { [a.id]: profileFor(a.id).votes.length, [b.id]: profileFor(b.id).votes.length };
  const funded = pair.filter((person) => person.funding?.status === "ok");

  return (
    <div className="wrap cmp">
      <Crumbs items={[{ href: "/", label: "Home" }, { href: statePath(state), label: state.name }, { href: `/races/${race.raceId}`, label: race.title }, { label: "Compare" }]} />
      <h1 className="t-h1 pt">
        {lastName(a.name)} and {lastName(b.name)}
      </h1>
      <YoursContext />
      <ExpandAll scope=".cmp" />

      <div className="chead">
        <div className="crow">
          <div className="ck" aria-hidden="true" />
          {pair.map((person, index) => (
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
              <Swap race={race} person={person} other={pair[1 - index]} side={index === 0 ? "a" : "b"} />
            </div>
          ))}
        </div>
      </div>

      <Block id="c-overview" title="Overview">
        <Row
          label="Filed"
          pair={pair}
          cell={(person) =>
            person.filing ? (
              <>
                {person.filing.label} ·{" "}
                <ExtLink className="xl" href={person.filing.url} icon label={`${state.filings.name} filing for ${person.name}`}>
                  SOS
                </ExtLink>
              </>
            ) : (
              <span className="none">Not in our records</span>
            )
          }
        />
        <Row label="Background" pair={pair} cell={(person) => <Background person={person} />} />
      </Block>

      {both.length + onlyA.length + onlyB.length > 0 ? (
        <Block id="c-issues" title="Issues">
          {both.map((row) => (
            <Row key={row.issue.id} label={row.issue.label} pair={pair} cell={(person) => <StanceCell person={person} issue={row.issue.label} stance={(person.id === a.id ? row.a : row.b)!} />} />
          ))}
          {(
            [
              [a, onlyA, "a"],
              [b, onlyB, "b"],
            ] as const
          ).map(([person, rows, side]) =>
            rows.length > 0 ? (
              <div className="conly" key={person.id}>
                <p className="conly-h">Only {lastName(person.name)} has a sourced statement on:</p>
                <div className="conly-l">
                  {rows.map((row) => (
                    <details className="ct" key={row.issue.id}>
                      <summary>{row.issue.label}</summary>
                      <div className="ctb">
                        <StanceCell person={person} issue={row.issue.label} stance={(side === "a" ? row.a : row.b)!} />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </Block>
      ) : null}

      <Block id="c-record" title="Voting record" open={false}>
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

      <Block id="c-finance" title="Where the money comes from">
        {funded.length === 0 ? (
          <Row label="Raised" pair={pair} cell={() => <span className="none">No FEC totals reported</span>} />
        ) : (
          <>
            <Row
              label="Raised"
              pair={pair}
              cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.receipts)}</span> : <span className="none">No FEC totals reported</span>)}
            />
            <Row label="Spent" pair={pair} cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.disbursements)}</span> : null)} />
            <Row label="Cash on hand" pair={pair} cell={(person) => (person.funding?.status === "ok" ? <span className="num">{money(person.funding.cash)}</span> : null)} />
            <Row
              label="Funding"
              pair={pair}
              cell={(person) =>
                person.funding?.status === "ok" && (person.funding.receipts ?? 0) > 0 ? (
                  <>
                    <FundingBar name={person.name} row={person.funding} compact />
                    <FundingKey row={person.funding} compact />
                  </>
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
              </>
            );
          }}
        />
      </Block>

      <div className="cov-f">
        <details className="how">
          <summary>Sources and method</summary>
          <div className="how-b">Blank means we found none. Nothing found for either candidate: {missing.join(", ")}.</div>
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
