import Link from "next/link";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { StateExplore } from "@/components/site/StateExplore";
import { StatusMark } from "@/components/site/StatusMark";
import { ZipSearch } from "@/components/site/ZipSearch";
import { brand } from "@/content/brand";
import { SAMPLE_MEASURE } from "@/content/pilot";
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
        <div className="wrap hero-grid">
          <div>
            <h1>{brand.headline}</h1>
            <p className="lede">{brand.lede}</p>
            <ZipSearch />
            <p>
              Or open a state, starting with the Kentucky example:{" "}
              <Link href="/states/ky">Kentucky {PILOT_YEAR}</Link>.
            </p>
          </div>
          <figure>
            <div className="photo-slot" role="img" aria-label={brand.heroImageAlt}>
              <StatusMark kind="awaiting" />
              Approved photograph
            </div>
          </figure>
        </div>
      </section>

      <div className="wrap">
        <DataRefreshedBanner refreshedAt={loaded.refreshedAt} />
        {loaded.filingsLoaded ? null : (
          <p className="notice notice-error" role="status">
            Stored filings could not be loaded. Contest links below still open the federal ballot
            structure. Candidate names appear only after a successful read.
          </p>
        )}

        <section className="section" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol className="steps">
            <li className="card">
              <span className="step-no">1</span>
              <h3>Find your election</h3>
              <p>Start with a ZIP code or pick a state. A ZIP is only a congressional hint.</p>
            </li>
            <li className="card">
              <span className="step-no">2</span>
              <h3>Compare your options</h3>
              <p>Every candidate in a contest uses the same fields. Missing facts stay missing.</p>
            </li>
            <li className="card">
              <span className="step-no">3</span>
              <h3>Follow updates</h3>
              <p>Follow controls are a preview. They do not send email yet.</p>
            </li>
          </ol>
          <div className="section">
            <h3>What a comparison looks like</h3>
            <p>
              <StatusMark kind="sample" />
              Sample candidate A and Sample candidate B, side by side, with the same fields. These
              are not real filers.
            </p>
            <p>
              <Link className="btn btn-navy" href="/states/ky">
                Open the Kentucky example
              </Link>
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="featured">
          <h2 id="featured">Featured</h2>
          <ul className="card-grid">
            <li className="card">
              <h3>Upcoming election</h3>
              <p>Federal general election, {generalElectionLabel(PILOT_YEAR)}.</p>
              <p>Source: the federal election calendar. Primary dates vary by state and are not loaded.</p>
              <Link href="/states/ky">Kentucky federal contests</Link>
            </li>
            <li className="card">
              <h3>Recently updated races</h3>
              {recent.length === 0 ? (
                <p>No Kentucky filing timestamp is stored for this view.</p>
              ) : (
                <ul>
                  {recent.map((race) => (
                    <li key={race.raceId}>
                      <Link href={`/races/${race.raceId}`}>{race.title}</Link>
                      <span> · {race.updatedAt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li className="card">
              <h3>Selected analysis</h3>
              <p>
                <StatusMark kind="sample" />
                Polls and theme summaries are not connected.
              </p>
              <Link href="/polls">Polls and analysis</Link>
            </li>
          </ul>
          <p>
            <Link href={SAMPLE_MEASURE.path}>Sample ballot-measure layout</Link>
          </p>
        </section>

        <section className="section" aria-labelledby="explore">
          <h2 id="explore">Explore by state</h2>
          <p>The list works without the map. States with a stored filing are shaded.</p>
          <StateExplore statesWithRaces={statesWithRaces(loaded.races)} />
        </section>

        <section className="section" aria-labelledby="trust">
          <h2 id="trust">Who runs this</h2>
          <p>
            {brand.founderName}, {brand.founderRole}. An approved photograph and biography have not
            been added.
          </p>
          <p>
            <StatusMark kind="awaiting" />
            Mission statement and any quote: awaiting approved copy. This page will not invent one.
          </p>
          <p>
            <Link href="/about">About Us</Link>
            {" · "}
            <Link href="/sources">Sources and methodology</Link>
          </p>
        </section>
      </div>
    </>
  );
}
