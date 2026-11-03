import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { MultiFilingDetails } from "@/components/MultiFilingDetails";
import { AskPanel } from "@/components/site/AskPanel";
import { CheckHistory } from "@/components/site/CheckHistory";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { ResultsNote } from "@/components/site/ResultsNote";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, calendarDay, kyBallot, kyBallotIds } from "@/lib/site/ky-ballot";
import { newsForNames } from "@/lib/site/ky-news";
import { cardsForRace } from "@/lib/site/showcase";
import { personFilingNote } from "@/lib/data/filing-note";
import { generalElectionLabel } from "@/lib/copy";
import { formatMoney } from "@/lib/finance/model";
import { httpsUrl } from "@/lib/format";
import { loadChecks } from "@/lib/content/store";
import { loadContest } from "@/lib/site/contest";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ raceId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadContest((await params).raceId);
  return { title: loaded.race?.title ?? "Race" };
}

export default async function RacePage({ params }: PageProps) {
  const loaded = await loadContest((await params).raceId);
  if (!loaded.race) notFound();
  const race = loaded.race;
  const sourceHref = httpsUrl(race.sourceUrl);
  const ballot = kyBallot(race.raceId);
  const roster = cardsForRace(race.raceId, loaded.candidates, loaded.filingsLoaded);
  const checks = await loadChecks("race", race.raceId);
  const ballotIds = ballot ? kyBallotIds(ballot) : null;
  const stories = ballot ? await newsForNames(ballot.people.map((person) => person.name)) : [];
  const others = ballotIds
    ? loaded.candidates.filter((candidate) => !ballotIds.has(candidate.candidateId) && !ballotIds.has(candidate.fecCandidateId ?? ""))
    : [];
  const stateHref = race.state ? `/states/${race.state.toLowerCase()}` : "/states";

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: stateHref, label: "My races" },
          { label: shortRace(race) },
        ]}
      />
      <h1>{race.title}</h1>
      {ballot ? <ElectionDayBanner /> : null}
      <p className="lede">
        {race.cycle != null ? `${generalElectionLabel(race.cycle)} · General` : "General"}
      </p>
      <p className="hint" title="Alphabetical by name. Not a ranking. A filing is not the printed ballot.">
        {ballot ? "November 3, 2026 ballot, A to Z" : "Listed A to Z. Not a ranking."}
        {sourceHref ? (
          <>
            {" · "}
            <a href={sourceHref} title="FEC filing, Form 2">
              Official filing
            </a>
          </>
        ) : null}
      </p>
      <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
      {ballot || loaded.filingsLoaded ? null : roster.fecList ? (
        <p className="notice" role="status">
          Live filings could not be loaded. Names below are from the election commission candidate list.
        </p>
      ) : (
        <p className="notice notice-error" role="status">
          Names could not be loaded. <Link href="/sources">About this data</Link>
        </p>
      )}

      <CheckHistory checks={checks} />
      <div className="race-layout">
      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" className="sr-only">
          Candidates
        </h2>
        {ballot ? (
          <>
            <div className="actions sticky-mobile">
              <Link className="btn btn-navy" href={`/races/${race.raceId}/compare`}>
                Compare
              </Link>
              <Link className="btn btn-ghost" href="/">
                Your ballot
              </Link>
            </div>
            {ballot.note ? <p>{ballot.note}</p> : null}
            <ResultsNote />
            <ul className="person-grid">
              {[...ballot.people].sort((a, b) => a.name.localeCompare(b.name)).map((person) => (
                <li className="person-card" key={person.id}>
                  <h3>
                    <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                  </h3>
                  <p className="party">{person.party}</p>
                  {person.holdsOffice ? <p className="hint">Holds this office now</p> : null}
                  {person.finance ? <p className="hint">Raised {formatRaceMoney(person.finance.receipts)}</p> : null}
                </li>
              ))}
            </ul>
            <p className="hint">
              Kentucky Secretary of State general-election filings, checked {calendarDay(KY_BALLOT_CHECKED)}. Nominees also
              match the Clerk of the House list published Oct 8, 2026.{" "}
              <a href={KY_BALLOT_SOURCES[0].url}>Filing list</a>
            </p>
            {stories.length > 0 ? (
              <section aria-labelledby="news-heading">
                <h2 id="news-heading">News</h2>
                <ul className="plain-list">
                  {stories.map((story) => (
                    <li key={story.url}>
                      <a href={story.url}>{story.title}</a>
                      <span className="hint">
                        {" "}
                        {story.source}
                        {story.date ? ` · ${story.date}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length > 0 ? (
              <details>
                <summary>Filed earlier, not on the November list ({others.length})</summary>
                <ul className="plain-list">
                  {others.map((candidate) => (
                    <li key={candidate.candidateId}>
                      <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
                      {" · "}
                      {candidate.partyLabel}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <>
        {loaded.filingsLoaded && loaded.candidates.length === 0 && roster.cards.length === 0 ? (
          <p>No one has filed for this race yet.</p>
        ) : null}
        {roster.summary ? <p>{roster.summary}</p> : null}
        {race.electionStage ? <p>Stage: {race.electionStage}</p> : null}
        <ul className="person-grid">
          {roster.cards.map((candidate) => {
            const live = loaded.candidates.find((row) => row.candidateId === candidate.id);
            const filingCount = live ? live.alternateFilings.length + 1 : 1;
            const note = live ? publicFilingNote(personFilingNote(live.filings)) : null;
            return (
              <li className="person-card" key={candidate.id}>
                <h3>
                  <Link href={`/candidates/${candidate.id}`}>{candidate.name}</Link>
                </h3>
                <p className="party">{candidate.party}</p>
                <p className="hint">{candidate.line}</p>
                {live ? (
                  <MultiFilingDetails count={filingCount}>{note ? <p>{note}</p> : null}</MultiFilingDetails>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="actions">
          <Link className="btn btn-navy" href={`/races/${race.raceId}/compare`}>
            Compare candidates
          </Link>
          <FollowControl what="race" targetId={race.raceId} />
        </div>
          </>
        )}
      </section>
      <AskPanel raceId={race.raceId} cycle={race.cycle} state={race.state} />
      </div>
    </article>
  );
}

function formatRaceMoney(value: number): string {
  return formatMoney(value);
}

function publicFilingNote(note: string | null): string | null {
  if (!note) return null;
  const cleaned = note.replace(/\s*FEC\s+[A-Z0-9, ]+\./g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
