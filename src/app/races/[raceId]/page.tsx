import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { MultiFilingDetails } from "@/components/MultiFilingDetails";
import { AskPanel } from "@/components/site/AskPanel";
import { CheckHistory } from "@/components/site/CheckHistory";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { cardsForRace } from "@/lib/site/showcase";
import { personFilingNote } from "@/lib/data/filing-note";
import { generalElectionLabel } from "@/lib/copy";
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
  const roster = cardsForRace(race.raceId, loaded.candidates, loaded.filingsLoaded);
  const checks = await loadChecks("race", race.raceId);
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
      <p className="lede">
        {race.cycle != null ? `${generalElectionLabel(race.cycle)} · General` : "General"}
      </p>
      <p className="hint" title="Alphabetical by filing name. Not a ranking. A Form 2 is not the printed ballot.">
        Listed A to Z. Not a ranking.
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
      {loaded.filingsLoaded ? null : roster.fecList ? (
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
      </section>
      <AskPanel raceId={race.raceId} cycle={race.cycle} state={race.state} />
      </div>
    </article>
  );
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
