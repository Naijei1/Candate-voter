import { stateConfig } from "@/lib/states";
import type { IndexEntry } from "./index-search";
import { allRaces } from "./people";

const PAGES: IndexEntry[] = [
  { g: "Pages", t: "Find my races", s: "Pick your county", h: "/ballot", i: "ballot" },
  { g: "Pages", t: "Kentucky", s: "1 Senate race, 6 House races", h: "/states/ky", i: "pin" },
  { g: "Pages", t: "News and Updates", s: "Statements and reporting", h: "/news", i: "news" },
  { g: "Pages", t: "Campaign Finance", s: "Raised, spent and cash on hand", h: "/finance", i: "money" },
  { g: "Pages", t: "Ask", s: "Answers from our records", h: "/ask", i: "ask" },
  { g: "Pages", t: "Officeholders", s: "Who holds office now", h: "/officeholders", i: "building" },
  { g: "Pages", t: "Explore by state", s: "All 50 states and D.C.", h: "/states", i: "pin" },
  { g: "Pages", t: "Polls", s: "No qualifying polls yet", h: "/polls", i: "info" },
  { g: "Pages", t: "Ballot measures", s: "Example layout", h: "/measures", i: "info" },
  { g: "Pages", t: "Sources and methodology", s: "How we check", h: "/sources", i: "info" },
  { g: "Pages", t: "Home", s: "THE VOTE", h: "/", i: "home" },
];

export function siteIndex(): IndexEntry[] {
  const state = stateConfig();
  const races = allRaces(state);
  const raceRows: IndexEntry[] = races.map((race) => ({
    g: "Races",
    t: race.title,
    s: `${state.name}, ${race.people.length} candidates`,
    h: `/races/${race.raceId}`,
    i: "ballot",
  }));
  const people: IndexEntry[] = races.flatMap((race) =>
    race.people.map((person) => ({
      g: "Candidates" as const,
      t: person.name,
      s: `${person.role}, ${race.title}`,
      h: `/candidates/${person.id}`,
      img: person.photo?.small ?? null,
    })),
  );
  return [...PAGES, ...raceRows, ...people];
}
