import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { MultiFilingDetails } from "@/components/MultiFilingDetails";
import { AiPrototype } from "@/components/site/AiPrototype";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { generalElectionLabel } from "@/lib/copy";
import { personFilingNote } from "@/lib/data/filing-note";
import { httpsUrl, partyCue } from "@/lib/format";
import { stateName } from "@/lib/data/states";
import { loadContest } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ raceId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { raceId } = await params;
  const loaded = await loadContest(raceId);
  return { title: loaded.race?.title ?? "Race" };
}

export default async function RacePage({ params }: PageProps) {
  const { raceId } = await params;
  const loaded = await loadContest(raceId);
  if (!loaded.race) notFound();
  const race = loaded.race;
  const sourceHref = httpsUrl(race.sourceUrl);
  const stateHref = race.state ? `/states/${race.state.toLowerCase()}` : "/states";
  const when = race.cycle != null ? generalElectionLabel(race.cycle) : null;

  return (
    <article className="wrap">
      <p>
        <Link href={stateHref}>
          {race.state ? stateName(race.state) : "All states"}
        </Link>
      </p>
      <header>
        <h1>{race.title}</h1>
        <p>{race.jurisdiction}</p>
        <p>
          {when ? `Election day for the federal general election: ${when}. ` : null}
          Stage shown here: general election. Primary, special, and runoff stages are not stored as
          separate contests.
        </p>
        <p>Ballot status: not verified. A Form 2 filing is a statement of candidacy, not a place on the printed ballot.</p>
        <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
        {sourceHref ? (
          <p>
            <a href={sourceHref}>Source for this contest</a>
          </p>
        ) : null}
      </header>

      {!loaded.filingsLoaded ? (
        <p className="notice notice-error" role="status">
          Candidate names could not be loaded from the filings table. This page does not substitute
          sample people.
        </p>
      ) : null}

      <section className="section" aria-labelledby="candidates-heading">
        <h2 id="candidates-heading">Candidates</h2>
        <p>Listed A to Z by the name on the filing. The order is not a ranking.</p>
        {loaded.filingsLoaded && loaded.candidates.length === 0 ? (
          <p>No Form 2 filing is stored for this contest yet.</p>
        ) : (
          <ul className="person-grid">
            {loaded.candidates.map((candidate) => {
              const filingCount = candidate.alternateFilings.length + 1;
              const note = personFilingNote(candidate.filings);
              return (
                <li className="person-card" key={candidate.candidateId}>
                  <div className="photo-slot" aria-hidden="true">
                    Photo not on file
                  </div>
                  <h3>
                    <Link href={`/candidates/${candidate.candidateId}`}>{candidate.displayName}</Link>
                  </h3>
                  <p className="party">{partyCue([candidate.partyLabel])}</p>
                  <p>Incumbency: not in this record.</p>
                  <p>Filing: statement of candidacy stored. Ballot status: not verified.</p>
                  <p>Campaign website: not verified.</p>
                  <MultiFilingDetails count={filingCount}>
                    {note ? <p>{note}</p> : <p>{filingCount === 1 ? "One Form 2 id on this row." : null}</p>}
                  </MultiFilingDetails>
                  <FollowControl what="candidate" />
                </li>
              );
            })}
          </ul>
        )}
        <p>
          <Link className="btn btn-navy" href={`/races/${race.raceId}/compare`}>
            Compare candidates
          </Link>
        </p>
      </section>

      <div className="section race-layout">
        <FollowControl what="race" />
        <AiPrototype />
      </div>
      <p>
        <StatusMark kind="sample" />
        Issue positions, polls, and fundraising are not on this filing record. Open the comparison
        for those tabs.
      </p>
    </article>
  );
}
