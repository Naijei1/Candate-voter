import Link from "next/link";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { StateExplore } from "@/components/site/StateExplore";
import { ZipSearch } from "@/components/site/ZipSearch";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { brand } from "@/content/brand";
import { loadSiteCopy } from "@/lib/content/store";
import { generalElectionLabel } from "@/lib/copy";
import { formatInstant } from "@/lib/format";
import { statesWithRaces } from "@/lib/landing";
import { PILOT_YEAR, loadPilotIndex } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const loaded = await loadPilotIndex();
  const copy = await loadSiteCopy();
  const recent = loaded.races
    .filter((race) => race.state === "KY" && race.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>{brand.headline}</h1>
            <p className="lede">{brand.lede}</p>
            <ZipSearch />
          </div>
          {copy.heroKey ? (
            <figure>
              <img src="/media/hero" alt={brand.heroImageAlt} />
            </figure>
          ) : null}
        </div>
      </section>
      <div className="wrap">
        <ElectionDayBanner />
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
              <p>Save a race after you sign in. Email alerts are not on yet.</p>
            </li>
          </ol>
          <p>
            <Link className="btn btn-navy" href="/races/2026-senate-KY/compare">
              See a real comparison
            </Link>
          </p>
          <p className="hint">Kentucky Senate, 2026. People who have filed to run. Not a ranking.</p>
        </section>

        <section className="section" aria-labelledby="featured">
          <h2 id="featured">Featured</h2>
          <ul className="card-grid">
            <li className="card">
              <h3>Kentucky {PILOT_YEAR}</h3>
              <p>Federal general, {generalElectionLabel(PILOT_YEAR)}.</p>
              <p className="hint">Source: federal election calendar.</p>
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
                      <span className="hint"> {formatInstant(race.updatedAt)} · official filing</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint">Source: federal candidacy filings.</p>
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
