import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/tv/client/Follow";
import { More } from "@/components/tv/client/More";
import { ReportButton } from "@/components/tv/client/Report";
import { YoursContext } from "@/components/tv/client/Yours";
import { Crumbs, Face, PartyTag } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { FundingBlock } from "@/components/tv/Funding";
import { Icon } from "@/components/tv/Icon";
import { VoteRecord } from "@/components/tv/Votes";
import { WonTag } from "@/components/tv/Won";
import { dayLabel } from "@/lib/format";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { stateConfig, statePath } from "@/lib/states";
import { newsForPerson } from "@/lib/tv/news";
import { initials, lastName } from "@/lib/tv/party";
import { allPeople, mainRival, personRecord, personView } from "@/lib/tv/people";
import { isWinner } from "@/lib/tv/results-gate";
import { splitSentence } from "@/lib/tv/short-line";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export function generateStaticParams() {
  return allPeople().map((person) => ({ candidateId: person.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).candidateId;
  const person = personView(id);
  if (!person) return { title: "Candidate not found" };
  return {
    alternates: { canonical: `/candidates/${encodeURIComponent(person.id)}` },
    title: person.name,
    description: `${person.name}, ${person.role} for ${person.race.title}: verified facts, statements and campaign money, each with its source.`,
  };
}

export default async function CandidatePage({ params }: PageProps) {
  const id = (await params).candidateId;
  const person = personView(id);
  if (!person) notFound();
  const state = stateConfig();
  const race = person.race;
  const record = personRecord(person);
  const rival = mainRival(race, person.id);
  const news = await newsForPerson(person.id);
  const others = race.people.filter((row) => row.id !== person.id);
  const social = record.profile.social;
  const campaignLinks = social.filter((row) => row.kind === "campaign");
  const officeLinks = social.filter((row) => row.kind === "office");
  const website = record.profile.website;
  const hasLinks = Boolean(website) || social.length > 0;
  const won = isWinner(race.raceId, person.name);
  const surname = lastName(person.name);

  return (
    <div className="wrap">
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: statePath(state), label: state.name },
          { href: `/races/${race.raceId}`, label: race.title },
          { label: person.name },
        ]}
      />
      <YoursContext />

      <div className="phead">
        <div className="pcol">
          <div className={`pph ${person.party.key}`}>
            {person.photo ? (
              <img src={person.photo.src} alt={`Portrait of ${person.name}`} width={400} height={500} />
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
          {person.photo ? (
            <p className="credit">
              Photo:{" "}
              <ExtLink href={person.photo.sourceUrl}>
                {person.photo.license.startsWith("CC") ? `${person.photo.credit}, ${person.photo.license}` : person.photo.credit}
              </ExtLink>
            </p>
          ) : null}
        </div>
        <div className="pwho">
          <h1 className="t-h1">{person.name}</h1>
          <p className={`role ${person.party.key}`}>
            {person.role}
            {won ? <WonTag /> : null}
          </p>
          <p className="lede">
            Running for <Link href={`/races/${race.raceId}`}>{race.runningFor}</Link>.
          </p>
          <div className="pact">
            {rival ? (
              <Link className="btn primary" href={`/races/${race.raceId}/compare?a=${person.id}&b=${rival.id}`}>
                <Icon name="swap" size="sm" />
                Compare with {lastName(rival.name)}
              </Link>
            ) : null}
            <FollowButton id={person.id} name={person.name} />
          </div>
          <p className="pmeta">
            <ReportButton candidateId={person.id} />
          </p>
        </div>
      </div>

      <nav className="jump" aria-labelledby="jump-l">
        <span className="jump-l" id="jump-l">
          On this page
        </span>
        <a href="#facts">Verified facts</a>
        <a href="#own">In their own words</a>
        <a href="#money">Campaign money</a>
        {news.length > 0 ? <a href="#updates">News ({news.length})</a> : null}
      </nav>

      <div className="two">
        <section id="facts" className="sec" aria-labelledby="h-vf">
          <h2 id="h-vf" className="sec-t">
            Verified facts
          </h2>
          <dl className="facts">
            <div>
              <dt>Party on the ballot</dt>
              <dd>
                <PartyTag party={person.party} size="sm" /> {person.party.name}
                {person.writeIn ? (
                  <ExtLink className="srcl" href={state.filings.href}>
                    {state.filings.name}
                  </ExtLink>
                ) : (
                  <ExtLink className="srcl" href={KY_BALLOT_SOURCES[1].url}>
                    Clerk of the House nominations
                  </ExtLink>
                )}
              </dd>
            </div>
            <div>
              <dt>Filed to run</dt>
              <dd>
                {person.filing ? (
                  <>
                    {person.filing.label}
                    <ExtLink className="srcl" href={person.filing.url}>
                      {state.filings.name}
                    </ExtLink>
                  </>
                ) : (
                  <span className="none">Not in our records</span>
                )}
              </dd>
            </div>
            {record.facts.map((fact, index) => (
              <div key={`${fact.term}-${index}`}>
                <dt>{fact.term}</dt>
                <dd>
                  {fact.text}
                  {fact.muted ? <> <span className="muted">{fact.muted}</span></> : null}
                  {fact.hint ? <span className="hint">{fact.hint}</span> : null}
                  {fact.sources.map((source) => (
                    <ExtLink key={source.url} className="srcl" href={source.url}>
                      {source.label}
                    </ExtLink>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="own" className="sec claims" aria-labelledby="h-own">
          <h2 id="h-own" className="sec-t">
            In their own words
          </h2>
          <p className="sec-sub">Not checked by THE VOTE.</p>
          {record.claims.length === 0 ? <p className="none">No sourced statements in our records.</p> : null}
          {record.claims.map((group, index) => (
            <div className="own" key={`${group.source.url}-${index}`}>
              {group.items.map((item, itemIndex) => {
                const [first, rest] = splitSentence(item.text);
                return (
                  <div className="own-i" key={`${item.heading}-${itemIndex}`}>
                    <h3>
                      {item.heading}
                      {item.tag ? <> <span className="cs">{item.tag}</span></> : null}
                    </h3>
                    {item.parts ? (
                      <p>
                        {item.parts.map((part, partIndex) => (
                          <span key={partIndex}>
                            {partIndex > 0 ? <br /> : null}
                            {part.text}
                            {part.muted ? <> <span className="muted">{part.muted}</span></> : null}
                          </span>
                        ))}
                      </p>
                    ) : rest ? (
                      <p>
                        <More short={first} rest={rest} context={`${surname}'s ${item.heading.toLowerCase()} statement`} />
                      </p>
                    ) : (
                      <p>{item.text}</p>
                    )}
                  </div>
                );
              })}
              <p className="srcl2 bot">
                {group.items.length > 1 ? `Source for these ${group.items.length} statements: ` : "Source: "}
                <ExtLink className="xl srcl" href={group.source.url} icon>
                  {group.source.label}
                </ExtLink>
                {group.source.date ? `, ${dayLabel(group.source.date)}` : null}
              </p>
            </div>
          ))}
          {record.missingIssues.length > 0 ? <p className="none">No sourced statement: {record.missingIssues.join(", ")}.</p> : null}
          {hasLinks ? (
            <>
              {website || campaignLinks.length > 0 ? (
                <div className="lgrp">
                  <h3>{website?.kind === "office" && campaignLinks.length === 0 ? "Official office" : "Campaign"}</h3>
                  <div className="chips">
                    {website ? (
                      <ExtLink className="chip" href={website.url}>
                        <Icon name="link" size="sm" />
                        Website
                        <Icon name="ext" size="xs" />
                      </ExtLink>
                    ) : null}
                    {campaignLinks.map((row) => (
                      <ExtLink key={row.url} className="chip" href={row.url}>
                        {row.platform}
                        <Icon name="ext" size="xs" />
                      </ExtLink>
                    ))}
                  </div>
                </div>
              ) : null}
              {officeLinks.length > 0 ? (
                <div className="lgrp">
                  <h3>Official office</h3>
                  <div className="chips">
                    {officeLinks.map((row) => (
                      <ExtLink key={row.url} className="chip" href={row.url}>
                        {row.platform}
                        <Icon name="ext" size="xs" />
                      </ExtLink>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <section id="money" className="sec" aria-labelledby="h-mo">
        <h2 id="h-mo" className="sec-t">
          Campaign money
        </h2>
        <FundingBlock name={person.name} row={person.funding} />
        {person.funding?.status === "ok" ? (
          <p className="whence-b">
            <Link className="btn primary" href={`/finance/candidates/${person.id}`}>
              <Icon name="money" size="sm" />
              See who funds {person.name}
            </Link>
          </p>
        ) : null}
      </section>

      <div className="discs">
        {news.length > 0 ? (
          <details className="disc" id="updates">
            <summary>
              <span className="sec-t sm">News ({news.length})</span>
            </summary>
            <div className="disc-b">
              <ul className="nlite">
                {news.map((item) => (
                  <li key={item.url}>
                    <ExtLink href={item.url}>{item.title}</ExtLink>
                    <span className="nm">
                      {item.source} · {dayLabel(item.date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
        {record.profile.votes.length > 0 ? (
          <details className="disc" id="record">
            <summary>
              <span className="sec-t sm">Voting record ({record.profile.votes.length})</span>
            </summary>
            <div className="disc-b">
              <VoteRecord votes={record.profile.votes} />
            </div>
          </details>
        ) : null}
        {record.profile.endorsements.length > 0 ? (
          <details className="disc" id="endorsements">
            <summary>
              <span className="sec-t sm">Endorsements ({record.profile.endorsements.length})</span>
            </summary>
            <div className="disc-b">
              <ul className="nlite">
                {record.profile.endorsements.map((row) => (
                  <li key={`${row.text}-${row.sourceUrl}`}>
                    {row.text}
                    <span className="nm">
                      <ExtLink href={row.sourceUrl}>{row.sourceName}</ExtLink>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
        {others.length > 0 ? (
          <details className="disc" id="also">
            <summary>
              <span className="sec-t sm">Also running ({others.length})</span>
            </summary>
            <div className="disc-b">
              <ul className="also">
                {others.map((row) => (
                  <li key={row.id}>
                    <Link href={`/candidates/${row.id}`}>
                      <Face person={row} />
                      <span>
                        <b>{row.name}</b>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
