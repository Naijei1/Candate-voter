import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPanel } from "@/components/site/AskPanel";
import { CompareBoard } from "@/components/site/CompareBoard";
import { Crumbs } from "@/components/site/Crumbs";
import { loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { ResultsNote } from "@/components/site/ResultsNote";
import { kyBallot, rosterMoney } from "@/lib/site/ky-ballot";
import { cardsForRace } from "@/lib/site/showcase";
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
  const ballot = kyBallot(race.raceId);
  const roster = cardsForRace(race.raceId, loaded.candidates, loaded.filingsLoaded);
  const finance = await loadFinance(race.cycle ?? 2026);
  const ids = new Set(
    ballot
      ? ballot.people.flatMap((person) => [person.id, person.fecCandidateId, ...person.alsoFecIds].filter((id): id is string => Boolean(id)))
      : roster.cards.map((candidate) => candidate.id),
  );
  const liveDirect = selectDirect(finance.direct, null).filter((row) => ids.has(row.candidateId));
  const rosterDirect = ballot
    ? ballot.people.flatMap((person) => {
        const covered = liveDirect.some((row) => row.candidateId === person.fecCandidateId || person.alsoFecIds.includes(row.candidateId));
        if (covered) return [];
        const row = rosterMoney(race.raceId, person);
        return row ? [row] : [];
      })
    : [];
  const direct = [...liveDirect, ...rosterDirect];
  const outside = selectOutside(finance.outside, null).filter((row) => ids.has(row.candidateId));
  const stateHref = race.state ? `/states/${race.state.toLowerCase()}` : "/states";

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: stateHref, label: "My races" },
          { href: `/races/${race.raceId}`, label: shortRace(race) },
          { label: "Compare" },
        ]}
      />
      <h1>Compare</h1>
      {ballot ? <ElectionDayBanner /> : null}
      <p className="lede">{race.title}</p>
      {ballot ? <ResultsNote /> : null}
      {ballot || loaded.filingsLoaded ? null : roster.fecList ? (
        <p className="notice" role="status">
          Live filings could not be loaded. Names below are from the election commission candidate list.
        </p>
      ) : (
        <p className="notice notice-error" role="status">
          Names could not be loaded. <Link href="/sources">About this data</Link>
        </p>
      )}
      <div className="race-layout">
        <CompareBoard
          raceHref={`/races/${race.raceId}`}
          filingsLoaded={ballot ? true : loaded.filingsLoaded && !roster.fecList}
          summary={ballot ? "On the November 3, 2026 ballot." : roster.summary}
          statusLine={ballot ? "A to Z. On the November ballot." : undefined}
          finance={{ notice: ballot ? null : finance.notice, direct, outside }}
          candidates={
            ballot
              ? [...ballot.people].sort((a, b) => a.name.localeCompare(b.name)).map((person) => ({
                  candidateId: person.id,
                  displayName: person.name,
                  partyLabel: person.party,
                  note: person.role === "write-in" ? "Write-in" : person.holdsOffice ? "Holds this office now" : null,
                }))
              : roster.cards.map((candidate) => ({
                  candidateId: candidate.id,
                  displayName: candidate.name,
                  partyLabel: candidate.party,
                  note: compareNote(candidate.line),
                }))
          }
        />
        <AskPanel raceId={race.raceId} cycle={race.cycle} state={race.state} />
      </div>
    </article>
  );
}

function compareNote(line: string): string | null {
  if (line.includes("Currently holds this office")) return "Holds this office now";
  if (line.includes("Running against the current officeholder")) return "Running against the officeholder";
  return null;
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
