import Link from "next/link";
import { PartyTag } from "./bits";
import { Icon } from "./Icon";
import { WonTag } from "./Won";
import { initials } from "@/lib/tv/party";
import type { PersonView, RaceView } from "@/lib/tv/people";
import { isWinner } from "@/lib/tv/results-gate";

export function RaceCard({ person, race, level = 3 }: { person: PersonView; race: Pick<RaceView, "raceId">; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <article className={`ccard ${person.party.key}`}>
      <div className="ph">
        {person.photo ? (
          <img src={person.photo.src} alt={`Portrait of ${person.name}`} loading="eager" width={400} height={400} />
        ) : (
          <div className="ph-empty">
            <span className="ini-big" aria-hidden="true">
              {initials(person.name)}
            </span>
            <span>No photo</span>
          </div>
        )}
        <PartyTag party={person.party} corner />
      </div>
      <div className="cb">
        <Heading className="cname">{person.name}</Heading>
        <p className={`role ${person.party.key}`}>
          {person.role}
          {isWinner(race.raceId, person.name) ? <WonTag /> : null}
        </p>
        {person.oneLine ? <p className="one">{person.oneLine}</p> : <p className="one none">No background in our records.</p>}
        <Link className={`btn vp ${person.party.key}`} href={`/candidates/${person.id}`} aria-label={`Profile: ${person.name}`}>
          Profile
        </Link>
        <p className="cacts">
          <Link href={`/candidates/${person.id}#money`} aria-label={`Campaign money: ${person.name}`}>
            <Icon name="money" size="sm" />
            Campaign money
          </Link>
        </p>
      </div>
    </article>
  );
}

export function RaceCards({ race, className }: { race: RaceView; className?: string }) {
  return (
    <div className={`cards${className ? ` ${className}` : race.people.length === 3 ? " c3" : ""}`}>
      {race.people.map((person) => (
        <RaceCard key={person.id} person={person} race={race} />
      ))}
    </div>
  );
}

function count(n: number): string {
  return n === 1 ? "1 candidate" : `${n} candidates`;
}

/** One race as a list row: number, title, candidate count and faces. */
export function RaceRow({ race, yours }: { race: RaceView; yours?: boolean }) {
  return (
    <Link className="rrow" href={`/races/${race.raceId}`}>
      <span className="num" aria-hidden="true">
        {race.office === "senate" ? "S" : race.district === "00" ? "AL" : Number(race.district)}
      </span>
      <span className="rt">
        <b>{race.title}</b>
        <span>{count(race.people.length)}</span>
      </span>
      <span className="faces" aria-hidden="true">
        {race.people.map((person) => (
          <span className={`face${person.photo ? "" : " noimg"}`} key={person.id}>
            <span className="ini">{initials(person.name)}</span>
            {person.photo ? <img src={person.photo.small ?? person.photo.src} alt="" loading="lazy" width={48} height={48} /> : null}
          </span>
        ))}
      </span>
      {yours ? <span className="yours-tag">Your district</span> : <span className="rr-gap" />}
      <Icon name="right" size="sm" />
    </Link>
  );
}

export { count as candidateCount };
