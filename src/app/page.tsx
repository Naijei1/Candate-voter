import Link from "next/link";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { StateExplore } from "@/components/site/StateExplore";
import { StatusMark } from "@/components/site/StatusMark";
import { ZipSearch } from "@/components/site/ZipSearch";
import { brand } from "@/content/brand";
import { generalElectionLabel } from "@/lib/copy";
import { statesWithRaces } from "@/lib/landing";
import { PILOT_YEAR, loadPilotIndex } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const loaded = await loadPilotIndex();
  const recent = loaded.races
    .filter((race) => race.state === "KY" && race.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>{brand.headline}</h1>
          <p className="lede">{brand.lede}</p>
          <ZipSearch />
        </div>
      </section>
      <div className="wrap">
        <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
        {loaded.filingsLoaded ? null : (
          <p className="notice notice-error" role="status">
            Filings could not be loaded. <Link href="/sources">About this data</Link>
          </p>
        )}

        <section className="section" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol className="steps">
            <li className="card">
              <span className="step-no">1</span>
              <h3>Find</h3>
              <p>ZIP or state.</p>
            </li>
            <li className="card">
              <span className="step-no">2</span>
              <h3>Compare</h3>
              <p>Same fields for each candidate.</p>
            </li>
            <li className="card">
              <span className="step-no">3</span>
              <h3>Follow</h3>
              <p>
                <StatusMark kind="preview" /> Not sent yet.
              </p>
            </li>
          </ol>
        </section>

        <section className="section" aria-labelledby="featured">
          <h2 id="featured">Featured</h2>
          <ul className="card-grid">
            <li className="card">
              <h3>Kentucky {PILOT_YEAR}</h3>
              <p>Federal general, {generalElectionLabel(PILOT_YEAR)}.</p>
              <Link className="btn btn-navy" href="/states/ky">
                Open Kentucky
              </Link>
            </li>
            <li className="card">
              <h3>Updated races</h3>
              {recent.length === 0 ? (
                <p>None stored yet.</p>
              ) : (
                <ul className="plain-list">
                  {recent.map((race) => (
                    <li key={race.raceId}>
                      <Link href={`/races/${race.raceId}`}>{race.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li className="card">
              <h3>Ballot measure</h3>
              <p>
                <StatusMark kind="sample" /> Layout only.
              </p>
              <Link href="/measures/example-kentucky">Open sample</Link>
            </li>
          </ul>
        </section>

        <section className="section" aria-labelledby="explore">
          <h2 id="explore">Explore by state</h2>
          <StateExplore statesWithRaces={statesWithRaces(loaded.races)} />
        </section>
      </div>
    </>
  );
}
