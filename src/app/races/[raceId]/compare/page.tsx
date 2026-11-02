import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPrototype } from "@/components/site/AiPrototype";
import { CompareBoard } from "@/components/site/CompareBoard";
import { Crumbs } from "@/components/site/Crumbs";
import { stateName } from "@/lib/data/states";
import { loadContest } from "@/lib/site/contest";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ raceId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadContest((await params).raceId);
  return { title: loaded.race ? `Compare · ${loaded.race.title}` : "Compare" };
}

export default async function ComparePage({ params }: PageProps) {
  const loaded = await loadContest((await params).raceId);
  if (!loaded.race) notFound();
  const race = loaded.race;
  const place = race.state ? stateName(race.state) : "States";
  const stateHref = race.state ? `/states/${race.state.toLowerCase()}` : "/states";

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: stateHref, label: place },
          { href: `/races/${race.raceId}`, label: shortRace(race) },
          { label: "Compare" },
        ]}
      />
      <h1>Compare</h1>
      <p className="lede">{race.title}</p>
      {loaded.filingsLoaded ? null : (
        <p className="notice notice-error" role="status">
          Names could not be loaded. <Link href="/sources">About this data</Link>
        </p>
      )}
      <CompareBoard
        raceHref={`/races/${race.raceId}`}
        candidates={loaded.candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          displayName: candidate.displayName,
          partyLabel: candidate.partyLabel,
        }))}
      />
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
