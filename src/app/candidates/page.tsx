import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { RaceCards } from "@/components/tv/RaceCard";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { stateConfig } from "@/lib/states";
import { allRaces } from "@/lib/tv/people";

export const metadata: Metadata = { alternates: { canonical: "/candidates" }, title: "Candidates" };
export const revalidate = 3600;

export default function CandidatesPage() {
  const state = stateConfig();
  const races = allRaces(state);
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Candidates" }]} />
      <h1 className="t-h1 pt">Candidates</h1>
      <p className="lede">
        Everyone on {state.name}’s {state.cycle} U.S. Senate and House ballots.
      </p>
      {races.map((race) => (
        <section className="sec" key={race.raceId} aria-labelledby={`h-${race.raceId}`}>
          <div className="sec-head">
            <div>
              <h2 id={`h-${race.raceId}`} className="sec-t">
                {race.title}
              </h2>
              {race.subtitle ? <p className="sec-sub">{race.subtitle}</p> : null}
            </div>
            <Link className="viewall" href={`/races/${race.raceId}`}>
              View race
              <Icon name="right" size="sm" />
            </Link>
          </div>
          <RaceCards race={race} />
        </section>
      ))}
      <p className="src">
        Source:{" "}
        {KY_BALLOT_SOURCES.slice(0, 2).map((source, index) => (
          <span key={source.url}>
            {index ? "; " : ""}
            <ExtLink className="xl" href={source.url} icon>
              {source.name}
            </ExtLink>
          </span>
        ))}
      </p>
    </div>
  );
}
