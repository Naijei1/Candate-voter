import type { CardPerson } from "@/components/site/CandidateCard";
import { kyBallot } from "@/lib/site/ky-ballot";
import { portraitFor } from "@/lib/site/stances";

export function raceCardTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}

export function candidateCards(raceId: string): CardPerson[] {
  const race = kyBallot(raceId);
  if (!race) return [];
  const openSeat = !race.people.some((person) => person.holdsOffice);
  return race.people.map((person) => ({
    id: person.id,
    name: person.name,
    party: person.party,
    office: raceCardTitle(raceId),
    holdsOffice: person.holdsOffice,
    openSeat,
    writeIn: person.role === "write-in",
    photo: portraitFor(person.id)?.src ?? null,
  }));
}

