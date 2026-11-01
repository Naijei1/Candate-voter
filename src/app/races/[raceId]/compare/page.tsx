import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPrototype } from "@/components/site/AiPrototype";
import { CompareBoard } from "@/components/site/CompareBoard";
import { loadContest } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ raceId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadContest((await params).raceId);
  return { title: loaded.race ? `Compare · ${loaded.race.title}` : "Compare" };
}

export default async function ComparePage({ params }: PageProps) {
  const loaded = await loadContest((await params).raceId);
  if (!loaded.race) notFound();
  const race = loaded.race;
  return (
    <article className="wrap">
      <p>
        <Link href={`/races/${race.raceId}`}>{race.title}</Link>
      </p>
      <h1>Compare candidates</h1>
      <p>
        {race.jurisdiction}
        {race.cycle ? ` · ${race.cycle}` : ""}. Cards use the same fields. On a narrow screen they
        stack.
      </p>
      {!loaded.filingsLoaded ? (
        <p className="notice notice-error" role="status">
          Candidate names could not be loaded. Sample cards below are labeled and are not a
          substitute roster.
        </p>
      ) : null}
      <div className="section race-layout">
        <CompareBoard
          raceHref={`/races/${race.raceId}`}
          candidates={loaded.candidates.map((candidate) => ({
            candidateId: candidate.candidateId,
            displayName: candidate.displayName,
            partyLabel: candidate.partyLabel,
          }))}
        />
        <AiPrototype />
      </div>
    </article>
  );
}
