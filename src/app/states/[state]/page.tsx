import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DistrictMap } from "@/components/DistrictMap";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
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
      <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
      {loaded.filingsLoaded || (postal === "KY" && year === PILOT_YEAR) ? null : (
        <p className="notice notice-error" role="status">
          Filings could not be loaded. <Link href="/sources">About this data</Link>
        </p>
      )}

      <nav className="filters" aria-label="Race category">
        {CATEGORIES.map((item) => (
          <Link
            key={item.id}
            href={`/states/${postal.toLowerCase()}?year=${year}&category=${item.id}`}
            aria-current={category === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

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
      ) : category === "judicial" || category === "school" ? (
        <LocalTemplate postal={postal} kind={category} />
      ) : (
        <p className="notice" role="status">
          {labelFor(category)} races are not loaded yet. Federal races are ready.
        </p>
      )}

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

      <p>
        <Link href={`/measures/${postal.toLowerCase()}`}>Ballot measures</Link>
        {" · "}
        <Link href={`/states/${postal.toLowerCase()}/issues`}>Issues</Link>
      </p>
    </article>
  );
}

function filingLine(raceId: string, loaded: boolean, empty: boolean): string {
  if (kyBallot(raceId)) return "November ballot";
  if (!loaded) return "Open to see who filed";
  return empty ? "No one has filed yet" : "People have filed";
}

function parseYear(value: string | undefined): number {
  const year = Number(value);
  if (Number.isInteger(year) && year >= 2020 && year <= 2036) return year;
  return PILOT_YEAR;
}

function parseCategory(value: string | undefined): Category {
  return CATEGORIES.find((item) => item.id === value)?.id ?? "federal";
}

function LocalTemplate({ postal, kind }: { postal: string; kind: "judicial" | "school" }) {
  const title = kind === "judicial" ? "Judges" : "School board";
  return (
    <section className="card" aria-labelledby={`${kind}-template`}>
      <h2 id={`${kind}-template`}>{title}</h2>
      <p>These races are not loaded yet. No names were copied from the state election office.</p>
      <p>
        <Link className="btn btn-navy" href={`/states/${postal.toLowerCase()}`}>
          See federal races
        </Link>
      </p>
    </section>
  );
}

function labelFor(category: Category): string {
  return CATEGORIES.find((item) => item.id === category)?.label ?? "Those";
}
