import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DistrictMap } from "@/components/DistrictMap";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { isPostalState, stateName } from "@/lib/data/states";
import { generalElectionLabel } from "@/lib/copy";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { PILOT_YEAR, contestsForState, loadPilotIndex } from "@/lib/site/contest";
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
  params: Promise<{ state: string }>;
  searchParams: Promise<{ category?: string; year?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const postal = (await params).state.trim().toUpperCase();
  return { title: isPostalState(postal) ? stateName(postal) : "State" };
}

export default async function StatePage({ params, searchParams }: PageProps) {
  const postal = (await params).state.trim().toUpperCase();
  if (!isPostalState(postal)) notFound();
  const query = await searchParams;
  const year = parseYear(query.year);
  const category = parseCategory(query.category);
  const loaded = await loadPilotIndex(year);
  const contests = contestsForState(loaded.races, postal);
  const name = stateName(postal);

  return (
    <article className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: name }]} />
      <h1>{name}</h1>
      {postal === "KY" && year === PILOT_YEAR ? <ElectionDayBanner /> : null}
      <p className="lede">
        {year} general · {generalElectionLabel(year)}
      </p>
      <FollowControl what="jurisdiction" targetId={postal} />
      {loaded.filingsLoaded || (postal === "KY" && year === PILOT_YEAR) ? null : (
        <p className="notice notice-error" role="status">
          Filings unavailable. <Link href="/sources">Sources</Link>
        </p>
      )}

      {category === "federal" ? (
        contests.length === 0 ? (
          <p>No federal contest for {year}.</p>
        ) : (
          <ul className="card-grid">
            {contests.map((race) => (
              <li key={race.raceId}>
                <Link className="card contest-link" href={`/races/${race.raceId}`}>
                  <h2>{race.title}</h2>
                  <p>{filingLine(race.raceId, loaded.filingsLoaded, race.empty === true || race.hasCandidates === false)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {(loaded.filingsLoaded || (postal === "KY" && year === PILOT_YEAR)) &&
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

function filingLine(raceId: string, loaded: boolean, empty: boolean): string {
  if (kyBallot(raceId)) return "November ballot";
  if (!loaded) return "";
  return empty ? "" : "Candidates filed";
}

function parseYear(value: string | undefined): number {
  const year = Number(value);
  if (Number.isInteger(year) && year >= 2020 && year <= 2036) return year;
  return PILOT_YEAR;
}

function parseCategory(value: string | undefined): Category {
  return CATEGORIES.find((item) => item.id === value)?.id ?? "federal";
}
