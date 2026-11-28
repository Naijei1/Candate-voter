import type { Metadata } from "next";
import Link from "next/link";
import { CountyGuide } from "@/components/tv/client/Guide";
import { FollowButton } from "@/components/tv/client/Follow";
import { Crumbs } from "@/components/tv/bits";
import { Icon } from "@/components/tv/Icon";
import { RaceCards } from "@/components/tv/RaceCard";
import { ElectionStatus, WhereToVote } from "@/components/tv/Status";
import { stateMap } from "@/lib/geo/state-maps";
import { stateConfig } from "@/lib/states";
import { lastName } from "@/lib/tv/party";
import { allRaces, defaultPair, type RaceView } from "@/lib/tv/people";

export const metadata: Metadata = { alternates: { canonical: "/ballot" }, title: "My races" };

function RaceSet({ race }: { race: RaceView }) {
  const pair = defaultPair(race);
  const id = `g-${race.raceId}`;
  return (
    <section className="gset" aria-labelledby={id}>
      <div className="sec-head">
        <div>
          <h2 id={id} className="sec-t">
            {race.title}
          </h2>
          {race.subtitle ? <p className="sec-sub">{race.subtitle}</p> : null}
        </div>
        <Link className="viewall" href={`/races/${race.raceId}`}>
          Race page
          <Icon name="right" size="sm" />
        </Link>
      </div>
      <RaceCards race={race} />
      <p className="gset-a">
        {pair ? (
          <Link className="btn outline" href={`/races/${race.raceId}/compare?a=${pair[0].id}&b=${pair[1].id}`}>
            <Icon name="swap" size="sm" />
            Compare {lastName(pair[0].name)} and {lastName(pair[1].name)}
          </Link>
        ) : null}
        <FollowButton id={race.raceId} name={race.title} label="Follow race" />
      </p>
    </section>
  );
}

export default function BallotPage() {
  const state = stateConfig();
  const map = stateMap(state.code);
  const races = allRaces(state);
  const sets = Object.fromEntries(races.map((race) => [race.office === "senate" ? "senate" : String(Number(race.district)), <RaceSet key={race.raceId} race={race} />]));
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "My races" }]} />
      <h1 className="t-h1 pt">My races</h1>
      <p className="sec-sub pt-sub">
        U.S. Senate and House races only. <WhereToVote />
      </p>
      <CountyGuide viewBox={map.viewBox} stateName={state.name} quick={state.quickCounties} summary={<ElectionStatus />} counties={map.counties.map(({ fips, name, d, districts, clerkUrl }) => ({ fips, name, d, districts, clerkUrl }))} sets={sets} />
    </div>
  );
}
