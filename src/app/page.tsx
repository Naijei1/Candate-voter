import { redirect } from "next/navigation";
import { DistrictMap } from "@/components/DistrictMap";
import { Hero } from "@/components/home/Hero";
import { ResultsBar } from "@/components/home/ResultsBar";
import { TodayOnCandate } from "@/components/home/TodayOnCandate";
import { kyBallotSeed } from "@/lib/site/ky-ballot";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ step?: string; zip?: string; district?: string; race?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const forward = new URLSearchParams();
  for (const key of ["step", "zip", "district", "race"] as const) {
    const value = params[key];
    if (value) forward.set(key, value);
  }
  if ([...forward.keys()].length > 0) redirect(`/ballot?${forward.toString()}`);

  const house = kyBallotSeed().races.filter((race) => race.office === "house");
  return (
    <>
      <Hero />
      <ResultsBar />
      <section className="wrap home-map" id="map" aria-labelledby="map-heading">
        <h2 id="map-heading">Kentucky districts</h2>
        <p className="lede">Tap a numbered district to open that U.S. House race. No ZIP required.</p>
        <div className="map-frame">
          <DistrictMap postal="KY" races={house} year={2026} />
        </div>
        <p className="zip-link">
          <a href="/ballot">Or enter a ZIP code</a>
        </p>
      </section>
      <div className="wrap">
        <TodayOnCandate />
        <p className="hint">
          Ballot names: <a href={KY_BALLOT_SOURCES[0].url}>{KY_BALLOT_SOURCES[0].name}</a>, checked 2026-11-03.
        </p>
      </div>
    </>
  );
}
