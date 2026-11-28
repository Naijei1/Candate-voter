import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/tv/bits";
import { stateConfig } from "@/lib/states";
import { allRaces } from "@/lib/tv/people";

export const metadata: Metadata = { alternates: { canonical: "/polls" }, title: "Polls and Analysis" };

export default function PollsPage() {
  const state = stateConfig();
  const races = allRaces(state);
  return (
    <div className="wrap polls-pg">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Polls and Analysis" }]} />
      <h1 className="t-h1 pt">Polls and Analysis</h1>
      <p className="lede">
        No qualifying polls for {state.name}’s {state.cycle} races.
      </p>
      <section className="sec" aria-labelledby="h-pr">
        <div className="empty-block">
          <h2 id="h-pr" className="empty-h">
            No qualifying polls yet
          </h2>
          <p>We list a poll only when its method is published.</p>
          <p className="eb-l" id="eb-l">
            Races
          </p>
          <div className="chips" role="group" aria-labelledby="eb-l">
            {races.map((race) => (
              <Link key={race.raceId} className="chip" href={`/races/${race.raceId}`}>
                {race.title.replace(/^U\.S\. House/, "House")}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
