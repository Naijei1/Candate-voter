import { DatasetUpdated } from "@/components/site/DatasetUpdated";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BallotBar } from "@/components/site/BallotBar";
import { AskPanel } from "@/components/site/AskPanel";
import { CompareBoard } from "@/components/site/CompareBoard";
import { Crumbs } from "@/components/site/Crumbs";
import { loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { formatMoney } from "@/lib/finance/model";
import { KY_BALLOT_CHECKED, kyBallot, rosterMoney } from "@/lib/site/ky-ballot";
import { newsForNames } from "@/lib/site/ky-news";
import { linkLabel, profileFor } from "@/lib/site/profiles";
import { photoAttribution, portraitFor, stanceIssues, stancesFor } from "@/lib/site/stances";
import { cardsForRace } from "@/lib/site/showcase";
import { loadContest } from "@/lib/site/contest";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ raceId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).raceId;
  const alternates = { canonical: `/races/${encodeURIComponent(id)}/compare` };
  const loaded = await loadContest(id);
  return { alternates, title: loaded.race ? `Compare · ${loaded.race.title}` : "Compare" };
}

export default async function ComparePage({ params }: PageProps) {
  const loaded = await loadContest((await params).raceId);
  if (!loaded.race) notFound();
  const race = loaded.race;
  const ballot = kyBallot(race.raceId);
  const roster = cardsForRace(race.raceId, loaded.candidates, loaded.filingsLoaded);
  const [finance, news] = await Promise.all([
    loadFinance(race.cycle ?? 2026),
    ballot ? newsForNames(ballot.people.map((person) => person.name)) : [],
  ]);
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
  const stories = news.filter(
    (story) => !/\b(wins|won|elected|victory)\b/i.test(story.title),
  );
  const stateHref = "/";

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
      <DatasetUpdated date={[ballot ? KY_BALLOT_CHECKED : "", loaded.refreshedAt ?? ""].sort().at(-1)} />
      <p className="lede">{race.title}</p>
      {ballot || loaded.filingsLoaded ? null : roster.fecList ? (
        <p className="notice" role="status">
          Names from the FEC candidate list.
        </p>
      ) : (
        <p className="notice notice-error" role="status">
          Candidates unavailable. <Link href="/sources">Sources</Link>
        </p>
      )}
      <div className="race-layout compare-layout">
        <CompareBoard
          raceHref={`/races/${race.raceId}`}
          filingsLoaded={!ballot && loaded.filingsLoaded && !roster.fecList}
          summary={ballot ? null : roster.summary}
          finance={{ notice: ballot ? null : finance.notice, direct, outside }}
          issues={stanceIssues()}
          updates={stories}
          candidates={
            ballot
              ? [...ballot.people].sort((a, b) => a.name.localeCompare(b.name)).map((person) => {
                  const profile = profileFor(person.id);
                  const photo = portraitFor(person.id);
                  return {
                    candidateId: person.id,
                    displayName: person.name,
                    partyLabel: person.party,
                    note: person.role === "write-in" ? "Write-in" : person.holdsOffice ? "Current officeholder" : null,
                    photo: photo?.src ?? null,
                    photoCredit: photoAttribution(photo),
                    website: profile.website ? { url: profile.website.url, label: linkLabel(profile.website) } : null,
                    stances: stancesFor(person.id).map((stance) => ({
                      issueId: stance.issueId,
                      issue: stanceIssues().find((issue) => issue.id === stance.issueId)?.label ?? stance.issueId,
                      text: stance.text,
                      sourceName: stance.sourceName,
                      sourceUrl: stance.sourceUrl,
                      sourceDate: stance.sourceDate,
                    })),
                    votes: profile.votes,
                    raised: person.finance ? formatMoney(person.finance.receipts) : null,
                    raisedSource: person.finance?.sourceUrl,
                    moneyIds: [person.id, person.fecCandidateId, ...person.alsoFecIds].filter((id): id is string => Boolean(id)),
                  };
                })
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
      {ballot ? <ElectionDayBanner compact /> : null}
      <BallotBar place="candidate" backHref={`/races/${race.raceId}`} nextHref="/ballot" nextLabel="Your ballot" />
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
