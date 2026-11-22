import type { Metadata } from "next";
import Link from "next/link";
import { CandidateDirectory } from "@/components/site/CandidateDirectory";
import { candidateCards, primaryCandidateCards, raceCardTitle } from "@/lib/site/candidate-cards";
import { KY_FEDERAL_RACES, primaryResults } from "@/lib/site/certified-results";
import { KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";
import { KY_CONGRESSIONAL_ROSTER_SOURCE } from "@/lib/site/ky-officeholders";

export const metadata: Metadata = { alternates: { canonical: "/candidates" }, title: "Candidates" };
export const revalidate = 3600;

export default function CandidatesPage() {
  const general = KY_FEDERAL_RACES.map((id) => ({
    id,
    title: raceCardTitle(id),
    note: kyBallot(id)?.note,
    groups: [{ people: candidateCards(id) }],
  }));
  const primary = KY_FEDERAL_RACES.flatMap((id) => {
    const groups = primaryCandidateCards(id);
    return groups.length ? [{ id, title: raceCardTitle(id), groups }] : [];
  });
  const primarySources = Array.from(new Set(KY_FEDERAL_RACES.flatMap((id) => primaryResults(id).map((result) => result.sourceUrl))));
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p className="lede">Kentucky’s U.S. Senate and House candidates.</p>
      <CandidateDirectory general={general} primary={primary} generalSources={KY_BALLOT_SOURCES.slice(0, 2)} primarySources={primarySources} />
      <p className="hint"><a href={KY_CONGRESSIONAL_ROSTER_SOURCE}>Congress Legislators roster</a></p>
      <div className="actions">
        <Link className="action-link" href="/officeholders">Officeholders</Link>
        <Link className="action-link" href="/?map=statewide#map">Statewide officeholders</Link>
      </div>
    </article>
  );
}
