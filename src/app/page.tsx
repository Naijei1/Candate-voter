import { Suspense } from "react";
import { DistrictMap } from "@/components/DistrictMap";
import { GuideFlow, type GuideRace } from "@/components/guide/GuideFlow";
import { Hero } from "@/components/home/Hero";
import { TodayOnCandate } from "@/components/home/TodayOnCandate";
import { ElectionStatus } from "@/components/site/ElectionStatus";
import { formatMoney } from "@/lib/finance/model";
import { currentUser } from "@/lib/auth/session";
import { kyBallot, kyBallotSeed } from "@/lib/site/ky-ballot";
import { jobLine, linkLabel, profileFor } from "@/lib/site/profiles";
import { portraitFor } from "@/lib/site/stances";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";

export const dynamic = "force-dynamic";

const JOB = {
  senate: "Writes and votes on federal laws. Kentucky has two senators. The term is six years.",
  house: "Writes and votes on federal laws for this district. The term is two years.",
};

type HomePageProps = { searchParams: Promise<{ step?: string }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const step = (await searchParams).step ?? "zip";
  const user = await currentUser();
  const races: GuideRace[] = kyBallotSeed().races.map((race) => {
    const ballot = race.office === "senate" ? "senate" : "house";
    return {
      id: race.raceId,
      title: race.office === "senate" ? "U.S. Senate" : `U.S. House District ${Number(race.district)}`,
      office: ballot,
      district: race.district,
      job: JOB[ballot],
      people: [],
    };
  });
  for (const card of races) {
    const ballot = kyBallot(card.id);
    card.people = (ballot?.people ?? []).map((person) => {
      const link = profileFor(person.id).website;
      const photo = portraitFor(person.id);
      return {
        id: person.id,
        name: person.name,
        party: person.party,
        holds: person.holdsOffice,
        writeIn: person.role === "write-in",
        raised: person.finance ? formatMoney(person.finance.receipts) : null,
        photo: photo?.src ?? null,
        photoCredit: photo?.credit ?? null,
        website: link ? { href: link.url, label: linkLabel(link) } : null,
        job: jobLine(person.id),
      };
    });
  }
  const house = kyBallotSeed().races.filter((race) => race.office === "house");
  if (step !== "zip") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Suspense fallback={<p>Loading your ballot…</p>}>
          <GuideFlow races={races} signedIn={user != null} />
        </Suspense>
      </div>
    );
  }
  return (
    <>
      <Hero />
      <div className="wrap home-election">
        <ElectionStatus />
      </div>
      <section className="wrap home-map" aria-labelledby="map-heading">
        <h2 id="map-heading">Kentucky districts</h2>
        <p>Tap a numbered district. The colored shape opens that U.S. House race. No ZIP required.</p>
        <DistrictMap postal="KY" races={house} year={2026} />
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
