import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { MultiFilingDetails } from "@/components/MultiFilingDetails";
import { AiPrototype } from "@/components/site/AiPrototype";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { personFilingNote } from "@/lib/data/filing-note";
import { generalElectionLabel } from "@/lib/copy";
import { httpsUrl, partyCue } from "@/lib/format";
import { stateName } from "@/lib/data/states";
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
  const place = race.state ? stateName(race.state) : "States";
  const stateHref = race.state ? `/states/${race.state.toLowerCase()}` : "/states";

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: stateHref, label: place },
          { label: shortRace(race) },
        ]}
      />
      <h1>{race.title}</h1>
      <p className="lede">
        {race.cycle != null ? `${generalElectionLabel(race.cycle)} · General` : "General"}
      </p>
      <p className="hint" title="Alphabetical by filing name. Not a ranking. A Form 2 is not the printed ballot.">
        A to Z
        {sourceHref ? (
          <>
            {" · "}
            <a href={sourceHref}>Source</a>
          </>
        ) : null}
      </p>
      <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
      {loaded.filingsLoaded ? null : (
        <p className="notice notice-error" role="status">
          Names could not be loaded. <Link href="/sources">About this data</Link>
        </p>
      )}

      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" className="sr-only">
          Candidates
        </h2>
        {loaded.filingsLoaded && loaded.candidates.length === 0 ? <p>No filing stored.</p> : null}
        <ul className="person-grid">
          {loaded.candidates.map((candidate) => {
            const filingCount = candidate.alternateFilings.length + 1;
            const note = personFilingNote(candidate.filings);
            return (
              <li className="person-card" key={candidate.candidateId}>
                <h3>
                  <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
                </h3>
                <p className="party">{partyCue([candidate.partyLabel])}</p>
                <p className="hint">Filing stored · Ballot not verified</p>
                <MultiFilingDetails count={filingCount}>{note ? <p>{note}</p> : null}</MultiFilingDetails>
              </li>
            );
          })}
        </ul>
        <div className="actions">
          <Link className="btn btn-navy" href={`/races/${race.raceId}/compare`}>
            Compare candidates
          </Link>
          <FollowControl what="race" />
        </div>
      </section>

      <details className="fold">
        <summary>Ask about this race</summary>
        <AiPrototype />
      </details>
    </article>
  );
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
