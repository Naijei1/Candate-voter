import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { loadProfile } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadProfile((await params).candidateId);
  return { title: loaded.ok ? loaded.candidate.displayName : "Candidate" };
}

export default async function CandidatePage({ params }: PageProps) {
  const loaded = await loadProfile((await params).candidateId);
  if (!loaded.ok) {
    if (loaded.missing) notFound();
    return (
      <article className="wrap">
        <h1>Candidate</h1>
        <p className="notice notice-error" role="status">
          This candidate could not be loaded from the filings table.
        </p>
        <p>
          <Link href="/states/ky">Back to Kentucky</Link>
        </p>
      </article>
    );
  }

  const { candidate, race, filings } = loaded;
  const website = httpsUrl(candidate.sourceUrl);
  return (
    <article className="wrap">
      <p>
        {race ? <Link href={`/races/${race.raceId}`}>{race.title}</Link> : <Link href="/states">States</Link>}
      </p>
      <header className="hero-grid">
        <div>
          <h1>{candidate.displayName}</h1>
          <p className="party">
            {partyCue([partyLabel(candidate.partyAffiliation, candidate.partyLabel)])}
          </p>
          <p>{race ? `Filed for ${race.title}.` : "Race record was not loaded."}</p>
          <p>Incumbency: not in this record.</p>
          <p>
            Campaign website:{" "}
            {website ? <a href={website}>Source link on the filing record</a> : "not verified."}
          </p>
          <FollowControl what="candidate" />
        </div>
        <div className="photo-slot" role="img" aria-label="No approved photograph is on file.">
          Photo not on file
        </div>
      </header>

      <section className="section" aria-labelledby="bio">
        <h2 id="bio">Biography</h2>
        <p>
          <StatusMark kind="awaiting" />
          A sourced biography has not been added. This page will not draft one.
        </p>
      </section>

      <section className="section" aria-labelledby="claims">
        <h2 id="claims">What the candidate says, and what is verified</h2>
        <p>
          <StatusMark kind="awaiting" />
          The candidate’s own claims and independently checked facts will be kept apart. Neither
          list is available yet.
        </p>
      </section>

      <section className="section" aria-labelledby="votes">
        <h2 id="votes">Voting record</h2>
        <p>
          No bill, date, or vote is in this record. That is an absence of data, not a judgment
          about someone who has not served in a legislature we track.
        </p>
      </section>

      <section className="section" aria-labelledby="filings-heading">
        <h2 id="filings-heading">Filings</h2>
        <p>A Form 2 tells the FEC the person intends to run. It is not the final ballot.</p>
        {filings.length === 0 ? (
          <p>No filing document is stored on this profile.</p>
        ) : (
          <ul>
            {filings.map((filing) => {
              const href = httpsUrl(filing.sourceUrl);
              const when = formatInstant(filing.updatedAt);
              return (
                <li key={filing.filingId}>
                  Form 2
                  {href ? (
                    <>
                      {" "}
                      · <a href={href}>Filing document</a>
                    </>
                  ) : null}
                  {when ? ` · stored ${when}` : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {race ? (
        <p>
          <Link href={`/races/${race.raceId}/compare`}>Compare everyone in this contest</Link>
        </p>
      ) : null}
    </article>
  );
}
