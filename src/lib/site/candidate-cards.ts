import type { CardPerson } from "@/components/site/CandidateCard";
import { kyBallot } from "@/lib/site/ky-ballot";
import { portraitFor } from "@/lib/site/stances";
import { candidateElectionStatus, primaryProfileId, primaryResults, resultCandidateMatches } from "@/lib/site/certified-results";
import { congressionalOfficeLabel, currentOfficeFor } from "@/lib/site/ky-officeholders";

export function raceCardTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}

export function primaryCandidateCards(raceId: string) {
  const ballot = kyBallot(raceId);
  const primary = primaryResults(raceId);
  const office = raceCardTitle(raceId);
  const district = raceId.includes("house") ? Number(raceId.slice(-2)) : null;
  const openSeat = !ballot?.people.some((person) => person.holdsOffice) && !primary.some((result) =>
    result.candidates.some((person) => currentOfficeFor(person.candidateId ?? "", person.name)?.district === district),
  );
  return primary.map((result) => ({
    party: result.party,
    people: result.candidates.map((candidate): CardPerson => {
      const nominee = ballot?.people.find((person) => resultCandidateMatches(candidate, person));
      const id = nominee?.id ?? candidate.candidateId ?? primaryProfileId(result, candidate);
      const member = currentOfficeFor(id, candidate.name);
      return {
        id,
        name: candidate.name,
        party: result.party,
        photo: portraitFor(id)?.src ?? null,
        office,
        holdsOffice: member?.district === district || Boolean(nominee?.holdsOffice),
        openSeat,
        writeIn: false,
        summary: congressionalOfficeLabel(member),
        electionStatus: {
          ...candidateElectionStatus(raceId, { id, name: candidate.name, party: result.party }),
          primary: candidate.winner ? "won" : "lost",
          primaryVotes: candidate.votes,
        },
      };
    }),
  }));
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
    summary: congressionalOfficeLabel(currentOfficeFor(person.id)),
    uncontested: race.people.length === 1,
    electionStatus: candidateElectionStatus(raceId, person),
  }));
}

