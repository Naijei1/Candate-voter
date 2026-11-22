import { currentUser } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { DistrictMap } from "@/components/DistrictMap";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { generalElectionLabel } from "@/lib/copy";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { PILOT_YEAR, contestsForState, loadPilotIndex } from "@/lib/site/contest";
import { dayLabel } from "@/lib/format";
import { KY_ELECTION_CALENDAR } from "@/lib/site/certified-results";
import { kyBallot } from "@/lib/site/ky-ballot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORIES = [
  { id: "federal", label: "Federal" },
  { id: "state", label: "State" },
  { id: "county", label: "County" },
  { id: "city", label: "City" },
  { id: "judicial", label: "Judicial" },
  { id: "school", label: "School board" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

type PageProps = {
  searchParams: Promise<{ category?: string; year?: string }>;
};

export const metadata: Metadata = { alternates: { canonical: "/states/ky" }, title: "Kentucky" };

export default async function StatePage({ searchParams }: PageProps) {
  const postal = "KY";
  const query = await searchParams;
  const year = parseYear(query.year);
  const category = parseCategory(query.category);
  const loaded = await loadPilotIndex(year);
  const contests = contestsForState(loaded.races, postal);
  const name = "Kentucky";

  return (
    <article className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: name }]} />
      <h1>{name}</h1>
      {year === PILOT_YEAR ? <ElectionDayBanner compact /> : null}
      <p className="lede">
        {year} general · {generalElectionLabel(year)}
      </p>
      <FollowControl signedIn={Boolean(await currentUser())} what="jurisdiction" targetId={postal} />
      {loaded.filingsLoaded || (year === PILOT_YEAR) ? null : (
        <p className="notice notice-error" role="status">
          Filings unavailable. <Link href="/sources">Sources</Link>
        </p>
      )}

      {year === PILOT_YEAR ? (
        <section className="section" aria-labelledby="election-calendar">
          <h2 id="election-calendar">Election calendar</h2>
          <ul className="plain-list">
            {KY_ELECTION_CALENDAR.map((event) => (
              <li key={event.date}>
                <time dateTime={event.date}>{dayLabel(event.date)}</time> · {event.label} · <a href={event.sourceUrl}>{event.sourceName}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {category === "federal" ? (
        contests.length === 0 ? (
          <p>No federal contest for {year}.</p>
        ) : (
          <ul className="card-grid">
            {contests.map((race) => (
              <li key={race.raceId}>
                <Link className="card contest-link" href={`/races/${race.raceId}`}>
                  <h2>{race.title}</h2>
                  {!kyBallot(race.raceId) && loaded.filingsLoaded && !race.empty && race.hasCandidates !== false ? <p>Candidates filed</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {(loaded.filingsLoaded || (year === PILOT_YEAR)) &&
      category === "federal" &&
      contests.some((race) => race.office === "house") ? (
        <section className="section" aria-labelledby="districts">
          <h2 id="districts">Districts</h2>
          <DistrictMap
            postal={postal}
            races={contests.map((race) =>
              kyBallot(race.raceId) ? { ...race, empty: false, hasCandidates: true } : race,
            )}
            year={year}
            context={{ year, state: postal, zip: null }}
          />
        </section>
      ) : null}

    </article>
  );
}

function parseYear(value: string | undefined): number {
  const year = Number(value);
  if (Number.isInteger(year) && year >= 2020 && year <= 2036) return year;
  return PILOT_YEAR;
}

function parseCategory(value: string | undefined): Category {
  return CATEGORIES.find((item) => item.id === value)?.id ?? "federal";
}
