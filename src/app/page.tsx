import { GuideFlow, type GuideRace } from "@/components/guide/GuideFlow";
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
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="mb-4 text-3xl font-semibold tracking-tight text-slate-950">Your elections. All in one place.</p>
      <GuideFlow races={races} signedIn={user != null} />
      <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-800">
          <li>Find your election. A ZIP or the map picks a Kentucky U.S. House district. It is not a full local ballot.</li>
          <li>Compare your options. The same topics are listed for each person, and only when a source is stored.</li>
          <li>Follow updates. News and money totals stay on their own pages.</li>
        </ol>
      </section>
      <section className="mt-8" aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="text-2xl font-semibold">November 3, 2026</h2>
        <p className="mt-2 text-slate-700">Kentucky federal races on the general-election filing list.</p>
        <ul className="mt-3 space-y-2">
          {races.map((race) => (
            <li key={race.id}>
              <a className="font-semibold text-[#1e3a8a]" href={`/races/${race.id}`}>{race.title}</a>
              <span className="text-slate-600"> · Nov 3, 2026 · {race.people.length} on the November list</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          Source: <a href={KY_BALLOT_SOURCES[0].url}>{KY_BALLOT_SOURCES[0].name}</a>, checked 2026-11-03.
        </p>
      </section>
    </div>
  );
}
