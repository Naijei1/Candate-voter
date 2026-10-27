import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackChrome } from "@/components/BackChrome";
import { AskPageContext } from "@/components/chat/AskProvider";
import { CandidateDisclosure } from "@/components/CandidateDisclosure";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { ballotVersusFilingLine, emptyHouseNext, emptyRaceSentence, federalScopeLine, jurisdictionRepeatsTitle, officeOneLiner, runningForLine } from "@/lib/copy";
import { withCrossContestFilings } from "@/lib/data/cross-filings";
import { personFilingNote } from "@/lib/data/filing-note";
import { createDynamoRepository } from "@/lib/data/repository";
import { isPresidentialElectionYear } from "@/lib/data/calendar";
import {
  logReadError,
  readCandidatesForRace,
  readRace,
  readRacesForCycle,
  readWatermark,
} from "@/lib/data/read";
import { displayedPartyLabels, type PublicCandidate } from "@/lib/data/view";
import { httpsUrl, partyCue } from "@/lib/format";
import { withPreservedQuery, type MapContext } from "@/lib/landing/state-query";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RacePageProps = {
  params: Promise<{ raceId: string }>;
  searchParams: Promise<{ year?: string; state?: string; zip?: string }>;
};

export async function generateMetadata({
  params,
}: RacePageProps): Promise<Metadata> {
  const { raceId } = await params;
  try {
    const race = await readRace(raceId);
    if (!race) return { title: "Race" };
    return { title: race.title };
  } catch (error) {
    logReadError("getRace", error);
    return { title: "Race" };
  }
}

export default async function RacePage({ params, searchParams }: RacePageProps) {
  const { raceId } = await params;
  const query = await searchParams;
  const loaded = await loadRace(raceId);
  if (loaded.ok === false) {
    return (
      <StorageNotice tone="error">
        This race could not be loaded from the table.
      </StorageNotice>
    );
  }
  if (!loaded.race) notFound();

  const race = loaded.race;
  const context: MapContext = {
    year: race.cycle,
    state: race.state,
    zip: query.zip ?? null,
  };
  const [candidates, refreshedAt, cycleRaces] = await Promise.all([
    loadCandidates(race),
    loadRefreshedAt(),
    race.empty === true && race.office === "house" ? loadCycleRaces(race.cycle) : Promise.resolve([]),
  ]);
  const next = emptyHouseNext(race, cycleRaces);
  const sourceHref = httpsUrl(race.sourceUrl);

  return (
    <article className="race-page">
      <AskPageContext
        raceId={race.raceId}
        cycle={race.cycle ?? undefined}
        label={race.cycle != null ? `${race.title} · ${race.cycle}` : race.title}
      />
      <BackChrome state={race.state} year={race.cycle} zip={context.zip} district={race.office === "house"} />
      <header className="race-heading">
        <h1 className="page-title">{race.title}</h1>
        <RacePlace race={race} />
        {race.office === "president" &&
        race.cycle != null &&
        !isPresidentialElectionYear(race.cycle) ? (
          <p className="mt-2 max-w-2xl text-base leading-6 text-ink">
            There is no presidential race on the {race.cycle} ballot. This page lists
            national statements of candidacy (Form 2) only.
          </p>
        ) : null}
        {race.cycle != null ? (
          <p className="mt-2 max-w-2xl text-base leading-6 text-ink">{ballotVersusFilingLine(race.cycle)}</p>
        ) : null}
      </header>
      <section aria-labelledby="candidates-heading" className="race-candidates">
        <h2 id="candidates-heading" className="text-lg font-semibold text-ink">
          Candidates
        </h2>
        {candidates.ok === false && race.empty !== true ? (
          <div className="mt-3">
            <StorageNotice tone="error">
              Candidates could not be loaded from the table.
            </StorageNotice>
          </div>
        ) : !candidates.ok || candidates.list.length === 0 ? (
          <>
            <p className="mt-3 text-base leading-6 text-ink">{emptyRaceSentence(race)}</p>
            {race.empty === true && race.office === "house" ? (
              <p className="mt-3">
                <Link
                  href={
                    next
                      ? withPreservedQuery(`/races/${next.raceId}`, context)
                      : withPreservedQuery("/#your-races", context)
                  }
                  className="text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  {next ? next.label : "Back to Your races"}
                </Link>
              </p>
            ) : null}
          </>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {candidates.list.map((candidate) => (
              <CandidateRow
                key={candidate.candidateId}
                candidate={candidate}
                race={race}
                context={context}
                filingNote={personFilingNote(candidate.filings)}
              />
            ))}
          </ul>
        )}
      </section>
      <details className="page-details">
        <summary>Details</summary>
        <div className="page-details-body">
          <p>{federalScopeLine()}</p>
          {race.cycle != null ? <p>{ballotVersusFilingLine(race.cycle)}</p> : null}
          {sourceHref ? <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} /> : null}
        </div>
      </details>
      <div className="page-refresh">
        <DataRefreshedBanner refreshedAt={refreshedAt} compact />
      </div>
    </article>
  );
}

function RacePlace({ race }: { race: Race }) {
  const line = officeOneLiner(race);
  const place = jurisdictionRepeatsTitle(race.title, race.jurisdiction) ? "" : race.jurisdiction;
  return (
    <>
      {line ? <p className="text-base text-ink">{line}</p> : null}
      {place || race.cycle != null ? (
        <p className="text-base text-ink">
          {place}
          {place && race.cycle != null ? (
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
          ) : null}
          {race.cycle}
        </p>
      ) : null}
    </>
  );
}

function CandidateRow({
  candidate,
  race,
  context,
  filingNote,
}: {
  candidate: PublicCandidate;
  race: Race;
  context: MapContext;
  filingNote: string | null;
}) {
  const parties = displayedPartyLabels(candidate);
  return (
    <li className="px-4 py-3">
      <CandidateDisclosure
        name={candidate.displayName}
        cue={partyCue(parties)}
        partyAffiliation={candidate.partyAffiliation}
        href={withPreservedQuery(`/candidates/${candidate.candidateId}`, context)}
        filingCount={candidate.alternateFilings.length + 1}
        updatedAt={candidate.updatedAt}
        runningFor={runningForLine(race)}
        filingNote={filingNote}
      />
    </li>
  );
}

async function loadRefreshedAt(): Promise<string | null> {
  try {
    return (await readWatermark())?.updatedAt ?? null;
  } catch (error) {
    logReadError("getWatermark", error);
    return null;
  }
}

async function loadCycleRaces(cycle: number | null): Promise<Race[]> {
  if (cycle == null) return [];
  try {
    return await readRacesForCycle(cycle);
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return [];
  }
}

async function loadRace(
  raceId: string,
): Promise<{ ok: true; race: Race | null } | { ok: false }> {
  try {
    const race = await readRace(raceId);
    return { ok: true, race };
  } catch (error) {
    logReadError("getRace", error);
    return { ok: false };
  }
}

async function loadCandidates(
  race: Race,
): Promise<{ ok: true; list: PublicCandidate[] } | { ok: false }> {
  try {
    const list = await readCandidatesForRace(race.raceId);
    return { ok: true, list: await withCrossContestFilings(createDynamoRepository(), list, race) };
  } catch (error) {
    logReadError("listCandidatesForRace", error);
    return { ok: false };
  }
}
