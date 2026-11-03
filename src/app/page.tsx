import { GuideFlow, type GuideRace } from "@/components/guide/GuideFlow";
import { formatMoney } from "@/lib/finance/model";
import { currentUser } from "@/lib/auth/session";
import { kyBallot, kyBallotSeed } from "@/lib/site/ky-ballot";
import { portraitFor } from "@/lib/site/stances";

export const dynamic = "force-dynamic";

const JOB = {
  senate: "Writes and votes on federal laws. Kentucky has two senators. The term is six years.",
  house: "Writes and votes on federal laws for this district. The term is two years.",
};

export default async function HomePage() {
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
    card.people = (ballot?.people ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      party: person.party,
      holds: person.holdsOffice,
      writeIn: person.role === "write-in",
      raised: person.finance ? formatMoney(person.finance.receipts) : null,
      photo: portraitFor(person.id)?.src ?? null,
      photoCredit: portraitFor(person.id)?.credit ?? null,
    }));
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <GuideFlow races={races} signedIn={user != null} />
    </div>
  );
}
