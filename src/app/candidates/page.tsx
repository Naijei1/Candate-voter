import type { Metadata } from "next";
import Link from "next/link";
import { CandidateCard } from "@/components/site/CandidateCard";
import { candidateCards, raceCardTitle as titleFor } from "@/lib/site/candidate-cards";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, calendarDay, kyBallot } from "@/lib/site/ky-ballot";

export const metadata: Metadata = { title: "Candidates" };

const RACE_IDS = [
  "2026-senate-KY",
  "2026-house-KY-01",
  "2026-house-KY-02",
  "2026-house-KY-03",
  "2026-house-KY-04",
  "2026-house-KY-05",
  "2026-house-KY-06",
];

export default function CandidatesPage() {
  const races = RACE_IDS.map((id) => kyBallot(id)).filter((race) => race != null);
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p className="lede">Everyone on Kentucky&apos;s November 3, 2026 ballot for U.S. Senate and U.S. House. Tap a card for the full profile.</p>
      <nav className="chip-row" aria-label="Jump to a race">
        {races.map((race) => (
          <a key={race.raceId} className="chip" href={`#${race.raceId}`}>
            {titleFor(race.raceId)}
          </a>
        ))}
        <Link className="chip" href="/?map=statewide#map">
          Statewide officeholders
        </Link>
      </nav>
      {races.map((race) => (
        <section key={race.raceId} id={race.raceId} className="race-cards" aria-labelledby={`${race.raceId}-heading`}>
          <div className="section-head">
            <h2 id={`${race.raceId}-heading`}>{titleFor(race.raceId)}</h2>
            <Link className="section-more" href={`/races/${race.raceId}`}>
              Race details <span aria-hidden="true">→</span>
            </Link>
          </div>
          {race.note ? <p className="hint">{race.note}</p> : null}
          <ul className="cand-grid">
            {candidateCards(race.raceId).map((person) => (
              <CandidateCard key={person.id} person={person} />
            ))}
          </ul>
        </section>
      ))}
      <p className="hint">
        <Link href="/candidates/S6KY00286">Andy Barr</Link> is listed as a Kentucky member on the Sept. 16, 2026 House roll call and is a Senate
        nominee, not a House nominee. <a href="https://clerk.house.gov/Votes/2026312">Roll call 312</a>
      </p>
      <p className="hint">
        Ballot list checked {calendarDay(KY_BALLOT_CHECKED)} against <a href={KY_BALLOT_SOURCES[0].url}>{KY_BALLOT_SOURCES[0].name}</a> and{" "}
        <a href={KY_BALLOT_SOURCES[1].url}>{KY_BALLOT_SOURCES[1].name}</a>. Photos are shown only when their license is clear; other cards show
        initials. State legislative, county, city, judicial, and school-board candidates are not covered yet.
      </p>
      <p>
        <Link href="/officeholders">Officeholder page</Link>
      </p>
    </article>
  );
}
