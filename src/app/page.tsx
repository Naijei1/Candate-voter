import { Landing } from "@/components/Landing";
import { StorageNotice } from "@/components/StorageNotice";
import { formatCycleList, resolveCycle } from "@/lib/data/cycles";
import { logReadError, readRaceIndex } from "@/lib/data/read";
import { isPostalState } from "@/lib/data/states";
import { stateRaces } from "@/lib/landing";
import { loadCandidatesForRaces } from "@/lib/landing/candidates";
import { normalizeZip } from "@/lib/lookup/zip-view";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HomePageProps = {
  searchParams: Promise<{ year?: string; state?: string; zip?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const loaded = await loadIndex();

  if (!loaded.ok) {
    return (
      <StorageNotice tone="error">
        Races could not be loaded from the table.
      </StorageNotice>
    );
  }

  const year = resolveCycle(loaded.cycles, params.year);
  if (year == null) {
    return <StorageNotice>No election years are selected to query.</StorageNotice>;
  }

  const races = loaded.groups.find((group) => group.cycle === year)?.races ?? [];
  const requestedState = params.state?.trim().toUpperCase() ?? "";
  const initialState = isPostalState(requestedState) ? requestedState : null;
  const initialZip = initialState ? normalizeZip(params.zip ?? "") : null;
  const seededCandidates = await seedState(races, initialState);

  return (
    <Landing
      key={String(year)}
      year={year}
      races={races}
      initialState={initialState}
      initialZip={initialZip}
      hasAnyRaces={loaded.groups.length > 0}
      cycleLabel={formatCycleList(loaded.cycles)}
      seededCandidates={seededCandidates}
      refreshedAt={loaded.refreshedAt}
    />
  );
}

async function seedState(races: Race[], state: string | null) {
  if (!state) return null;
  const ids = stateRaces(races, state).map((race) => race.raceId);
  if (ids.length === 0) return null;
  return loadCandidatesForRaces(ids);
}

async function loadIndex() {
  try {
    return { ok: true as const, ...(await readRaceIndex()) };
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return { ok: false as const };
  }
}
