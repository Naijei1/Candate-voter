import { DatasetUpdated } from "@/components/site/DatasetUpdated";
import { ShortList } from "@/components/site/ShortList";
import type { Metadata } from "next";
import Link from "next/link";
import { CandidateCard } from "@/components/site/CandidateCard";
import { candidateCards, raceCardTitle as titleFor } from "@/lib/site/candidate-cards";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";

export const metadata: Metadata = { alternates: { canonical: "/candidates" }, title: "Candidates" };

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
      <DatasetUpdated date={KY_BALLOT_CHECKED} />
      <p className="lede">Kentucky&apos;s U.S. Senate and House candidates, Nov 3, 2026.</p>
      <nav className="chip-row" aria-label="Jump to a race">
        {races.map((race) => (
          <a key={race.raceId} className="chip" aria-label={titleFor(race.raceId)} href={`#${race.raceId}`}>
            {titleFor(race.raceId).replace("U.S. House ", "")}
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
          <ShortList
            className="cand-grid"
            items={candidateCards(race.raceId).map((person) => (
              <CandidateCard key={person.id} person={person} />
            ))}
          />
        </section>
      ))}
      <p className="hint">Source: <a href={KY_BALLOT_SOURCES[0].url}>Kentucky Secretary of State ↗</a></p>
      <p>
        <Link className="action-link" href="/officeholders">Officeholders</Link>
      </p>
    </article>
  );
}
