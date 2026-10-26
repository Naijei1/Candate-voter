import Link from "next/link";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import { formatCycleList } from "@/lib/data/cycles";
import { logReadError, racesByOffice, readRaceIndex } from "@/lib/data/read";
import { officeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const cycles = await loadIndex();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Federal races</h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          President, Senate, and House contests stored from FEC Form 2 filings.
          Party on a candidate page is the code the filing reported.
        </p>
      </div>
      {cycles.ok === false ? (
        <StorageNotice tone="error">
          Races could not be loaded from the table.
        </StorageNotice>
      ) : cycles.groups.length === 0 ? (
        <StorageNotice>
          {cycles.cycles.length === 0
            ? "No election years are selected to query."
            : `No races are stored for election years ${formatCycleList(cycles.cycles)}.`}
        </StorageNotice>
      ) : (
        <div className="space-y-10">
          {cycles.groups.map((group) => (
            <section key={group.cycle} aria-labelledby={`cycle-${group.cycle}`}>
              <h2
                id={`cycle-${group.cycle}`}
                className="text-xl font-semibold tracking-tight"
              >
                {group.cycle}
              </h2>
              <p className="mt-1 text-sm text-muted">Election year on the filing</p>
              <div className="mt-4 space-y-8">
                {racesByOffice(group.races).map((officeGroup) => (
                  <section
                    key={officeGroup.office}
                    aria-labelledby={`${group.cycle}-${officeGroup.office}-heading`}
                  >
                    <h3
                      id={`${group.cycle}-${officeGroup.office}-heading`}
                      className="text-sm font-semibold tracking-wide text-muted uppercase"
                    >
                      {officeLabel(officeGroup.office)}
                    </h3>
                    <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
                      {officeGroup.races.map((race) => (
                        <li key={race.raceId} className="px-4 py-3">
                          <Link
                            href={`/races/${race.raceId}`}
                            className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                          >
                            {race.title}
                          </Link>
                          <p className="text-sm text-muted">{race.jurisdiction}</p>
                          <RecordMeta
                            sourceUrl={race.sourceUrl}
                            updatedAt={race.updatedAt}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

async function loadIndex() {
  try {
    const index = await readRaceIndex();
    return { ok: true as const, ...index };
  } catch (error) {
    logReadError("listRacesByCycle", error);
    return { ok: false as const };
  }
}
