import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBanner } from "@/components/SampleBanner";
import {
  getRace,
  listCandidatesForRace,
  listRaceIds,
} from "@/lib/placeholders";

type RacePageProps = {
  params: Promise<{ raceId: string }>;
};

export function generateStaticParams() {
  return listRaceIds().map((raceId) => ({ raceId }));
}

export async function generateMetadata({
  params,
}: RacePageProps): Promise<Metadata> {
  const { raceId } = await params;
  const race = getRace(raceId);
  if (!race) return { title: "Race" };
  return { title: race.title };
}

export default async function RacePage({ params }: RacePageProps) {
  const { raceId } = await params;
  const race = getRace(raceId);
  if (!race) notFound();

  const candidates = listCandidatesForRace(race.raceId);

  return (
    <article className="space-y-8">
      <p className="text-sm">
        <Link
          href="/"
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Federal races
        </Link>
      </p>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{race.title}</h1>
        <p className="text-base text-muted">
          {race.jurisdiction}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          Cycle not loaded
        </p>
      </header>
      <SampleBanner />
      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" className="text-lg font-semibold">
          Candidates
        </h2>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            No candidates loaded for this race.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {candidates.map((candidate) => (
              <li key={candidate.candidateId}>
                <Link
                  href={`/candidates/${candidate.candidateId}`}
                  className="flex min-h-14 flex-col justify-center px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className="font-medium">{candidate.displayName}</span>
                  <span className="text-sm text-muted">
                    Party not loaded
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="sources-heading" className="space-y-2">
        <h2 id="sources-heading" className="text-lg font-semibold">
          Sources
        </h2>
        <p className="text-sm leading-6 text-muted">
          No filings loaded. FEC Form 2 ingest is not connected, so this page
          has no source link and no retrieval time.
        </p>
      </section>
    </article>
  );
}
