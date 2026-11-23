import Link from "next/link";
import { partyBadge } from "@/components/site/PersonFace";
import { ballotCards } from "@/lib/site/ky-ballot";
import styles from "./reading.module.css";

export function DistrictRoster() {
  const races = ballotCards();
  return (
    <section aria-labelledby="roster-heading">
      <h2 id="roster-heading">Every race</h2>
      <ul className={styles.rosterCards}>
        {races.map((race) => (
          <li key={race.raceId}>
            <Link href={`/races/${race.raceId}`}>{race.title}</Link>
            <p>{names(race.people)}</p>
          </li>
        ))}
      </ul>
      <table className={styles.rosterTable}>
        <caption className="sr-only">Kentucky federal races and the candidates on the ballot</caption>
        <thead>
          <tr>
            <th scope="col">Race</th>
            <th scope="col">Candidates</th>
          </tr>
        </thead>
        <tbody>
          {races.map((race) => (
            <tr key={race.raceId}>
              <th scope="row"><Link href={`/races/${race.raceId}`}>{race.title}</Link></th>
              <td>{names(race.people)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">* Current officeholder</p>
    </section>
  );
}

function names(people: readonly { name: string; party: string; line: string }[]): string {
  return people.map((person) => {
    const star = person.line === "Holds this office now" ? "*" : "";
    return `${person.name}${star} (${partyBadge(person.party).label})`;
  }).join(", ");
}
