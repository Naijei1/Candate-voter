import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DistrictMap } from "@/components/DistrictMap";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";
import { isPostalState, stateName } from "@/lib/data/states";
import { generalElectionLabel } from "@/lib/copy";
import { leadSentences } from "@/lib/data/calendar";
import { senateSeatUp } from "@/lib/data/senate-classes";
import { PILOT_YEAR, contestsForState, loadPilotIndex } from "@/lib/site/contest";
import { SAMPLE_MEASURE } from "@/content/pilot";

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
      <p>
        <Link href="/states">All states</Link>
      </p>
      <h1>{name}</h1>
      <p>{leadSentences(year)[0]}</p>
      <p>
        Selected election: {year}. Federal general election day: {generalElectionLabel(year)}. This
        page lists the general-election federal contests
        {senateSeatUp(postal, year) ? ", including the U.S. Senate seat that is up," : ""} and every
        U.S. House district. Primary dates are not loaded. A special or runoff appears only when a
        stored filing uses this year.
      </p>
      <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
      {loaded.filingsLoaded ? (
        <p>Last checked is the Form 2 ingest time above, when a run has stored one. A Form 2 is not the printed ballot.</p>
      ) : (
        <p className="notice notice-error" role="status">
          Stored filings could not be loaded. The contests below are the regular federal ballot
          structure, not a live roster. Candidate names are hidden so an outage is not shown as an
          empty field.
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
        <>
          <h2>Federal contests</h2>
          {contests.length === 0 ? (
            <p>No regular federal House or Senate contest is on the ballot in {name} for {year}.</p>
          ) : (
            <ul className="card-grid">
              {contests.map((race) => (
                <li className="card" key={race.raceId}>
                  <h3>
                    <Link href={`/races/${race.raceId}`}>{race.title}</Link>
                  </h3>
                  <p>{race.jurisdiction}</p>
                  <p>
                    {loaded.filingsLoaded
                      ? race.empty || race.hasCandidates === false
                        ? "No Form 2 filing is stored yet."
                        : "At least one Form 2 filing is stored."
                      : "Filing status was not loaded."}
                  </p>
                  <p>Stage: general election. Ballot qualification: not verified.</p>
                </li>
              ))}
            </ul>
          )}
          {loaded.filingsLoaded && contests.some((race) => race.office === "house") ? (
            <section className="section" aria-labelledby="districts">
              <h2 id="districts">House districts</h2>
              <DistrictVintageNote />
              <DistrictMap
                postal={postal}
                races={contests}
                year={year}
                context={{ year, state: postal, zip: null }}
              />
            </section>
          ) : (
            <DistrictVintageNote />
          )}
        </>
      ) : (
        <div className="notice" role="status">
          <h2>{labelFor(category)} contests</h2>
          <p>
            {name} {category} contests are not covered. No source for this category is connected, so
            this page does not list any. Federal contests remain available from the Federal filter.
          </p>
        </div>
      )}

      <p>
        <Link href={SAMPLE_MEASURE.path}>{SAMPLE_MEASURE.title}</Link>
        {" — "}
        {SAMPLE_MEASURE.eyebrow}
      </p>
      <p>
        <Link href="/officeholders">Current officeholders</Link> are a separate directory and are not
        loaded.
      </p>
    </article>
  );
}

function parseYear(value: string | undefined): number {
  const year = Number(value);
  if (Number.isInteger(year) && year >= 2020 && year <= 2036) return year;
  return PILOT_YEAR;
}

function parseCategory(value: string | undefined): Category {
  const found = CATEGORIES.find((item) => item.id === value);
  return found?.id ?? "federal";
}

function labelFor(category: Category): string {
  return CATEGORIES.find((item) => item.id === category)?.label ?? "Those";
}
