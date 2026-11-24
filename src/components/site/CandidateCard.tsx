import { thumbnail } from "@/lib/site/thumbnail";
import Link from "next/link";
import { PersonMark } from "@/components/site/PersonMark";
import { partyBadge, partyTag } from "@/components/site/PersonFace";
import type { ElectionStatus } from "@/lib/site/certified-results";

export type CardPerson = {
  id: string;
  name: string;
  party: string;
  office: string;
  holdsOffice: boolean;
  openSeat: boolean;
  writeIn: boolean;
  photo: string | null;
  summary?: string | null;
  credit?: string | null;
  uncontested?: boolean;
  electionStatus?: ElectionStatus;
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

/** The one status line on a broadcast card. Primary losses stay on the profile. */
export function cardStatus(person: Pick<CardPerson, "holdsOffice" | "writeIn" | "electionStatus">): string | null {
  if (person.electionStatus?.elected) return "Elected";
  if (person.holdsOffice) return "Incumbent";
  if (person.writeIn) return null;
  if (person.electionStatus?.primary === "lost") return null;
  return "Nominee";
}

export function CandidateCard({ person }: { person: CardPerson }) {
  const badge = partyTag(person.party);
  const status = cardStatus(person);
  const line = person.summary || person.office;
  return (
    <li className="cand-card">
      <Link className="cand-link" href={`/candidates/${person.id}`}>
        <span className="cand-photo">
          {person.photo ? (
            <img src={thumbnail(person.photo)} alt="" width={360} height={270} loading="lazy" decoding="async" />
          ) : (
            <PersonMark name={person.name} photo={null} party={person.party} size="lg" />
          )}
          <span className={`cand-party ${badge.tone}`}>{badge.label}</span>
        </span>
        <span className="cand-body">
          <span className="cand-name">{person.name}</span>
          {status ? <span className="cand-status">{status}</span> : null}
          <span className="cand-rule" />
          <span className="cand-line">{line}</span>
          {person.credit ? <span className="cand-credit">Photo: {person.credit}</span> : null}
          <span className="cand-cta">View profile</span>
        </span>
      </Link>
    </li>
  );
}
