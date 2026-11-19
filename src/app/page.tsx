import { redirect } from "next/navigation";
import { DistrictMap } from "@/components/DistrictMap";
import { CompareSection } from "@/components/home/CompareSection";
import { Hero } from "@/components/home/Hero";
import { HomeMap } from "@/components/home/HomeMap";
import { HomeNewsFeed } from "@/components/home/HomeNewsFeed";
import { ResultsBar } from "@/components/home/ResultsBar";
import { StatewidePanel } from "@/components/home/StatewidePanel";
import { MoneyCharts } from "@/components/site/MoneyCharts";
import { COMPARE_RACE_IDS, compareBasis, compareOption } from "@/lib/compare/evidence";
import { kyBallotSeed, KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { kyStatewide } from "@/lib/site/ky-statewide";
import { parseMapView } from "@/lib/site/map-view";
import { loadMoneyCharts } from "@/lib/site/money-charts";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ step?: string; zip?: string; district?: string; race?: string; map?: string }>;
};

/** Home order: film, map, compare, news feed, money charts. */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const forward = new URLSearchParams();
  for (const key of ["step", "zip", "district", "race"] as const) {
    const value = params[key];
    if (value) forward.set(key, value);
  }
  if ([...forward.keys()].length > 0) redirect(`/ballot?${forward.toString()}`);

  const house = kyBallotSeed().races.filter((race) => race.office === "house");
  const statewide = kyStatewide();
  /** Titles and ballot facts only. Each race's candidate records load when it is picked. */
  const compareOptions = COMPARE_RACE_IDS.flatMap((id) => {
    const basis = compareBasis(id);
    return basis ? [compareOption(basis)] : [];
  });
  const money = await loadMoneyCharts();
  return (
    <>
      <Hero />
      <ResultsBar />
      <section className="wrap home-section home-map" id="map" aria-labelledby="map-heading">
        <div className="section-head">
          <h2 id="map-heading">Kentucky map</h2>
        </div>
        <HomeMap
          initial={parseMapView(params.map)}
          congressional={
            <>
              <p className="lede">Tap a numbered district to open that U.S. House race. No ZIP required.</p>
              <div className="map-frame">
                <DistrictMap postal="KY" races={house} year={2026} />
              </div>
            </>
          }
          statewide={<StatewidePanel senators={statewide.senators} officers={statewide.officers} />}
        />
        <p className="zip-link">
          <a href="/ballot">Or enter a ZIP code</a>
        </p>
      </section>
      <section className="wrap home-section" id="compare" aria-labelledby="compare-heading">
        <div className="section-head">
          <h2 id="compare-heading">Compare the candidates</h2>
        </div>
        <p className="lede">Pick a race. See what to know, where the candidates differ, and where they agree, with a source on every point.</p>
        <CompareSection options={compareOptions} />
      </section>
      <div className="wrap">
        <HomeNewsFeed />
      </div>
      <section className="wrap home-section" id="money" aria-labelledby="money-heading">
        <div className="section-head">
          <h2 id="money-heading">Follow the money</h2>
          <a className="section-more" href="/finance">
            Candidates&apos; Political Finances <span aria-hidden="true">→</span>
          </a>
        </div>
        <MoneyCharts data={money} />
        <p className="hint">
          Ballot names: <a href={KY_BALLOT_SOURCES[0].url}>{KY_BALLOT_SOURCES[0].name}</a>, checked 2026-11-03.
        </p>
      </section>
    </>
  );
}
