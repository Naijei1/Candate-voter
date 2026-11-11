import Link from "next/link";
import { PersonMark } from "@/components/site/PersonMark";
import { seatStatus } from "@/lib/site/seat";

export function partyBadge(party: string): { label: string; tone: "rep" | "dem" | "oth" } {
  if (/republican/i.test(party)) return { label: "Republican", tone: "rep" };
  if (/democrat/i.test(party)) return { label: "Democratic", tone: "dem" };
  if (/libertarian/i.test(party)) return { label: "Libertarian", tone: "oth" };
  if (/kentucky/i.test(party)) return { label: "Kentucky Party", tone: "oth" };
  if (/independent/i.test(party)) return { label: "Independent", tone: "oth" };
  if (/write-in/i.test(party)) return { label: "Write-in", tone: "oth" };
  const trimmed = party.replace(/\s+party$/i, "").trim();
  return { label: trimmed || "Party not listed", tone: "oth" };
}

export function PersonFace({
  name,
  party,
  photo,
  holds,
  writeIn,
  href,
}: {
  name: string;
  party: string;
  photo: string | null;
  holds: boolean;
  writeIn: boolean;
  href?: string;
}) {
  const badge = partyBadge(party);
  const status = seatStatus({ holds, writeIn, openSeat: !holds });
  const body = (
    <>
      <PersonMark name={name} photo={photo} party={party} size="sm" />
      <span className="person-face-copy">
        <span className="person-face-name">{name}</span>
        <span className="person-face-meta">
          <span className={`party-badge ${badge.tone}`}>{badge.label}</span>
          {status ? <span className="status-chip">{status}</span> : null}
        </span>
      </span>
      {href ? <span className="view-label" aria-hidden="true">›</span> : null}
    </>
  );
  if (!href) return <div className="person-face">{body}</div>;
  return (
    <Link className="person-face" href={href}>
      {body}
    </Link>
  );
}
