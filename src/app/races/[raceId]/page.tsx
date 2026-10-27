import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackChrome } from "@/components/BackChrome";
import { AskPageContext } from "@/components/chat/AskProvider";
import { CandidateDisclosure } from "@/components/CandidateDisclosure";
import { CoverageNote } from "@/components/CoverageNote";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { emptyRaceSentence, FILING_MEANS, jurisdictionRepeatsTitle, officeOneLiner, runningForLine } from "@/lib/copy";
import { isPresidentialElectionYear } from "@/lib/data/calendar";
import {
  logReadError,
  readCandidatesForRace,
  readRace,
  readRacesForCycle,
  readWatermark,
} from "@/lib/data/read";
import { displayedPartyLabels, type PublicCandidate } from "@/lib/data/view";
import { partyCue } from "@/lib/format";
import { houseCoverageLine } from "@/lib/landing";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RacePageProps = {
  params: Promise<{ raceId: string }>;
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

export default async function RacePage({ params }: RacePageProps) {
  const { raceId } = await params;
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
  const candidates = await loadCandidates(race.raceId);
  const coverage = await loadCoverage(race);

  return (
    <article className="race-page">
      <AskPageContext
        raceId={race.raceId}
        cycle={race.cycle ?? undefined}
        label={race.cycle != null ? `${race.title} · ${race.cycle}` : race.title}
      />
      <BackChrome state={race.state} year={race.cycle} district={race.office === "house"} />
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
          <p className="mt-3 text-base leading-6 text-ink">{emptyRaceSentence(race)}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {candidates.list.map((candidate) => (
              <CandidateRow key={candidate.candidateId} candidate={candidate} race={race} />
            ))}
          </ul>
        )}
      </section>
      <details className="page-details">
        <summary>Details</summary>
        <div className="page-details-body">
          <p>{FILING_MEANS}</p>
          <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
          <CoverageNote
            lines={coverage.lines}
            scopeNote="Counts are statements of candidacy (Form 2) stored so far, not the final ballot or a certified candidate list."
          />
          <h2 id="sources-heading" className="details-subhead">
            Sources
          </h2>
          <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
          <p>
            Each candidate page lists stored statements of candidacy (Form 2) with a
            source link, the time the filing was retrieved, and the time the row was written.
          </p>
        </div>
      </details>
      <div className="page-refresh">
        <DataRefreshedBanner refreshedAt={coverage.refreshedAt} compact />
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
}: {
  candidate: PublicCandidate;
  race: Race;
}) {
  const parties = displayedPartyLabels(candidate);
  return (
    <li className="px-4 py-3">
      <CandidateDisclosure
        name={candidate.displayName}
        cue={partyCue(parties)}
        partyAffiliation={candidate.partyAffiliation}
        href={`/candidates/${candidate.candidateId}`}
        filingCount={candidate.alternateFilings.length + 1}
        updatedAt={candidate.updatedAt}
        runningFor={runningForLine(race)}
      />
    </li>
  );
}

async function loadCoverage(race: Race): Promise<{ lines: string[]; refreshedAt: string | null }> {
  let refreshedAt: string | null = null;
  try {
    refreshedAt = (await readWatermark())?.updatedAt ?? null;
  } catch (error) {
    logReadError("getWatermark", error);
  }
  if (race.cycle == null) return { lines: [], refreshedAt };
  try {
    const races = await readRacesForCycle(race.cycle);
    const line = houseCoverageLine(races, race.cycle, race.state);
    return { lines: line ? [line] : [], refreshedAt };
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return { lines: [], refreshedAt };
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
  raceId: string,
): Promise<{ ok: true; list: PublicCandidate[] } | { ok: false }> {
  try {
    const list = await readCandidatesForRace(raceId);
    return { ok: true, list };
  } catch (error) {
    logReadError("listCandidatesForRace", error);
    return { ok: false };
  }
}
