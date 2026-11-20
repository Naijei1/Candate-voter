import Link from "next/link";
import { PersonMark } from "@/components/site/PersonMark";
import { partyBadge } from "@/components/site/PersonFace";

export type CardPerson = {
  id: string;
  name: string;
  party: string;
  office: string;
  holdsOffice: boolean;
  openSeat: boolean;
  writeIn: boolean;
  photo: string | null;
};

/**
 * One label per card, in plain words. Open seats never use "Challenger".
 * Write-ins get no second label when the party badge already says "Write-in".
 */
export function seatLabel(person: Pick<CardPerson, "holdsOffice" | "openSeat" | "writeIn"> & { party?: string }): string | null {
  if (person.holdsOffice) return "Current officeholder";
  if (person.writeIn) return person.party && partyBadge(person.party).label === "Write-in" ? null : "Write-in";
  if (person.openSeat) return "Open seat";
  return null;
}

export function CandidateCard({ person }: { person: CardPerson }) {
  const badge = partyBadge(person.party);
  const label = seatLabel(person);
  return (
    <li className="cand-card">
      <Link className="cand-link" href={`/candidates/${person.id}`}>
        <span className="cand-photo">
          {person.photo ? (
            <img src={person.photo} alt="" width={320} height={240} loading="lazy" />
          ) : (
            <PersonMark name={person.name} photo={null} party={person.party} size="lg" />
          )}
          <span className={`cand-party ${badge.tone}`}>{badge.label}</span>
        </span>
        <span className="cand-body">
          <span className="cand-name">{person.name}</span>
          <span className="cand-office">{person.office}</span>
          {label ? <span className={`cand-status${person.holdsOffice ? " is-incumbent" : ""}`}>{label}</span> : null}
          <span className="cand-cta">
            View profile <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
