import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBanner } from "@/components/SampleBanner";
import {
  getCandidate,
  getRace,
  listCandidateIds,
  listFilingsForCandidate,
} from "@/lib/placeholders";

type CandidatePageProps = {
  params: Promise<{ candidateId: string }>;
};

export function generateStaticParams() {
  return listCandidateIds().map((candidateId) => ({ candidateId }));
}

export async function generateMetadata({
  params,
}: CandidatePageProps): Promise<Metadata> {
  const { candidateId } = await params;
  const candidate = getCandidate(candidateId);
  if (!candidate) return { title: "Candidate" };
  return { title: candidate.displayName };
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { candidateId } = await params;
  const candidate = getCandidate(candidateId);
  if (!candidate) notFound();

  const race = getRace(candidate.raceId);
  const filings = listFilingsForCandidate(candidate.candidateId);

  return (
    <article className="space-y-8">
      <p className="text-sm">
        {race ? (
          <Link
            href={`/races/${race.raceId}`}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {race.title}
            <span className="text-muted"> · {race.jurisdiction}</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="text-accent underline-offset-4 hover:underline"
          >
            Federal races
          </Link>
        )}
      </p>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {candidate.displayName}
        </h1>
        <p className="text-base text-muted">
          Party not loaded
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          FEC candidate id not loaded
        </p>
      </header>
      <SampleBanner />
      <section aria-labelledby="filings-heading" className="space-y-2">
        <h2 id="filings-heading" className="text-lg font-semibold">
          Filings
        </h2>
        {filings.length === 0 ? (
          <p className="text-sm leading-6 text-muted">
            No filings loaded. When FEC Form 2 ingest runs, each filing will
            show its form, a source link, the filing time, and the time this
            site retrieved it.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-card">
            {filings.map((filing) => (
              <li key={filing.filingId} className="px-4 py-3 text-sm">
                <p className="font-medium">Form {filing.formType}</p>
                <p className="text-muted">
                  Filed {filing.filedAt ?? "unknown"} · Retrieved{" "}
                  {filing.retrievedAt ?? "unknown"}
                </p>
                {filing.sourceUrl ? (
                  <a href={filing.sourceUrl} className="text-accent">
                    Source
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
