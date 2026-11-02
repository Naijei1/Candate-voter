import Link from "next/link";
import { DataRefreshedBanner } from "@/components/DataRefreshedBanner";
import { StateExplore } from "@/components/site/StateExplore";
import { StatusMark } from "@/components/site/StatusMark";
import { ZipSearch } from "@/components/site/ZipSearch";
import { CopyText } from "@/components/site/CopyText";
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
          <figure>
            {copy.heroKey ? (
              <img src="/media/hero" alt={brand.heroImageAlt} />
            ) : (
              <div className="photo-slot" role="img" aria-label={brand.heroImageAlt}>
                <StatusMark kind="awaiting" /> Photo placeholder
              </div>
            )}
          </figure>
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
          <div className="compare-grid">
            {["Sample candidate A", "Sample candidate B"].map((name) => (
              <article className="person-card" key={name}>
                <p>
                  <StatusMark kind="sample" /> Not a real race.
                </p>
                <h3>{name}</h3>
                <p className="party">Party label</p>
              </article>
            ))}
          </div>
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
                      <span className="hint"> {formatInstant(race.updatedAt)} · FEC Form 2</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint">Source: FEC Form 2.</p>
            </li>
            <li className="card">
              <h3>Ballot measure</h3>
              <p>
                <StatusMark kind="sample" /> October 30, 2026
              </p>
              <p className="hint">Source: sample layout.</p>
              <Link href="/measures/example-kentucky">Open sample</Link>
            </li>
          </ul>
        </section>

        <section className="section" aria-labelledby="explore">
          <h2 id="explore">Explore by state</h2>
          <StateExplore statesWithRaces={statesWithRaces(loaded.races)} />
        </section>

        <section className="section" aria-labelledby="trust">
          <h2 id="trust">Who runs this</h2>
          <p>
            {brand.founderName}, {brand.founderRole}.
          </p>
          <CopyText text={copy.mission} />
          <p>
            <Link href="/about">About Us</Link>
            {" · "}
            <Link href="/sources">About this data</Link>
          </p>
        </section>
      </div>
    </>
  );
}
