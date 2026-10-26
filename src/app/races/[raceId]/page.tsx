import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPageContext } from "@/components/chat/AskProvider";
import { CoverageNote } from "@/components/CoverageNote";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { FORM2_SCOPE_NOTE } from "@/lib/data/coverage";
import {
  logReadError,
  readCandidatesForRace,
  readRace,
  readRacesForCycle,
  readWatermark,
} from "@/lib/data/read";
import { displayedPartyLabels, type PublicCandidate } from "@/lib/data/view";
import { httpsUrl } from "@/lib/format";
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
    <article className="space-y-8">
      <AskPageContext raceId={race.raceId} cycle={race.cycle ?? undefined} />
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
          {race.cycle != null ? (
            <>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              {race.cycle}
            </>
          ) : null}
        </p>
        <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
        <CoverageNote
          lines={coverage.lines}
          scopeNote={FORM2_SCOPE_NOTE}
          refreshedAt={coverage.refreshedAt}
        />
      </header>
      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" className="text-lg font-semibold">
          Candidates
        </h2>
        {candidates.ok === false ? (
          <div className="mt-3">
            <StorageNotice tone="error">
              Candidates could not be loaded from the table.
            </StorageNotice>
          </div>
        ) : candidates.list.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            No candidates are stored for this race.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
            {candidates.list.map((candidate) => (
              <CandidateRow key={candidate.candidateId} candidate={candidate} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="sources-heading" className="space-y-2">
        <h2 id="sources-heading" className="text-lg font-semibold">
          Sources
        </h2>
        <RecordMeta sourceUrl={race.sourceUrl} updatedAt={race.updatedAt} />
        <p className="text-sm leading-6 text-muted">
          Each candidate page lists stored Form 2 filings with a source link,
          the time the filing was retrieved, and the time the row was written.
        </p>
      </section>
    </article>
  );
}

function CandidateRow({ candidate }: { candidate: PublicCandidate }) {
  const parties = displayedPartyLabels(candidate);
  return (
    <li className="px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <Link
          href={`/candidates/${candidate.candidateId}`}
          className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {candidate.displayName}
        </Link>
        <span className="text-sm text-muted">{parties.join(" · ")}</span>
      </div>
      {candidate.multiFilingNote ? (
        <p className="mt-1 text-sm leading-6 text-muted">{candidate.multiFilingNote}</p>
      ) : null}
      {candidate.alternateFilings.map((alternate) => {
        const href = httpsUrl(alternate.sourceUrl);
        const label = `${alternate.partyLabel} ${alternate.fecCandidateId ?? alternate.candidateId}`;
        if (!href) return null;
        return (
          <p key={alternate.candidateId} className="text-sm leading-6 text-muted">
            <a
              href={href}
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {label}
            </a>
          </p>
        );
      })}
      <RecordMeta sourceUrl={candidate.sourceUrl} updatedAt={candidate.updatedAt} />
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
