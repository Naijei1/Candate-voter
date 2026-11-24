import { ShortList } from "@/components/site/ShortList";
import Link from "next/link";
import { DistrictMap } from "@/components/DistrictMap";
import { CompareSection } from "@/components/home/CompareSection";
import { RacesInFocus } from "@/components/home/RacesInFocus";
import "@/components/home/homepage.css";
import { GuideHandoff } from "@/components/home/GuideHandoff";
import { Hero } from "@/components/home/Hero";
import { HomeMap } from "@/components/home/HomeMap";
import { HomeNewsFeed, loadHomeNewsFeed } from "@/components/home/HomeNewsFeed";
import { ResultsBar } from "@/components/home/ResultsBar";
import { StatewidePanel } from "@/components/home/StatewidePanel";
import { CandidateCard } from "@/components/site/CandidateCard";
import { DatedFacts } from "@/components/site/DatedFacts";
import { StateHeader } from "@/components/site/StateHeader";
import { candidateCards } from "@/lib/site/candidate-cards";
import { MoneyCharts } from "@/components/site/MoneyCharts";
import { DistrictRoster } from "@/components/site/DistrictRoster";
import { COMPARE_RACE_IDS, compareBasis, compareOption } from "@/lib/compare/evidence";
import { kyBallotSeed } from "@/lib/site/ky-ballot";
import { kyStatewide } from "@/lib/site/ky-statewide";
import { loadMoneyCharts } from "@/lib/site/money-charts";

export const revalidate = 3600;

/** Home order: film, map, compare, news feed, money charts. */
export default async function HomePage() {
  const house = kyBallotSeed().races.filter((race) => race.office === "house");
  const statewide = kyStatewide();
  /** Titles and ballot facts for each comparison. */
  const compareOptions = COMPARE_RACE_IDS.flatMap((id) => {
    const basis = compareBasis(id);
    return basis ? [compareOption(basis)] : [];
  });
  const [money, newsFeed] = await Promise.all([loadMoneyCharts(), loadHomeNewsFeed()]);
  return (
    <>
      <GuideHandoff />
      <Hero />
      <ResultsBar />
      <section className="wrap home-section home-map" id="map" aria-labelledby="map-heading">
        <StateHeader headingId="map-heading" />
        <DatedFacts />
        <HomeMap
          congressional={
            <div className="map-frame">
              <DistrictMap postal="KY" races={house} year={2026} instruction="Choose a district to see its race." />
            </div>
          }
          statewide={<StatewidePanel senators={statewide.senators} officers={statewide.officers} />}
        />
        <p className="zip-link">
          <a href="/ballot">Or enter a ZIP code</a>
        </p>
      </section>
      <section className="wrap home-section">
        <DistrictRoster />
      </section>
      <RacesInFocus />
      <section className="wrap home-section mobile-candidates" aria-labelledby="senate-candidates">
        <div className="section-head">
          <h2 id="senate-candidates">U.S. Senate candidates</h2>
          <Link className="section-more" href="/candidates">All candidates <span aria-hidden="true">→</span></Link>
        </div>
        <ShortList
          className="cand-grid"
          items={candidateCards("2026-senate-KY").map((person) => <CandidateCard key={person.id} person={person} />)}
        />
      </section>
      <section className="wrap home-section" id="compare" aria-labelledby="compare-heading">
        <div className="section-head">
          <h2 id="compare-heading">Compare the candidates</h2>
        </div>
        <CompareSection options={compareOptions} />
      </section>
      <div className="wrap">
        <HomeNewsFeed data={newsFeed} />
      </div>
      <section className="wrap home-section" id="money" aria-labelledby="money-heading">
        <div className="section-head">
          <h2 id="money-heading">Follow the money</h2>
          <a className="section-more" href="/finance">
            Candidates&apos; Political Finances <span aria-hidden="true">→</span>
          </a>
        </div>
        <MoneyCharts data={money} />
      </section>
    </>
  );
}
