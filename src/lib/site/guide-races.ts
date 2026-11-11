import { formatMoney } from "@/lib/finance/model";
import { kyBallot, kyBallotSeed } from "@/lib/site/ky-ballot";
import { jobLine, linkLabel, profileFor } from "@/lib/site/profiles";
import { portraitFor } from "@/lib/site/stances";
import type { GuideRace } from "@/components/guide/GuideFlow";

const JOB = {
  senate: "Writes and votes on federal laws. Kentucky has two senators. The term is six years.",
  house: "Writes and votes on federal laws for this district. The term is two years.",
};

export function guideRaces(): GuideRace[] {
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
  return races;
}
