"use client";

import Link from "next/link";
import { useState } from "react";
import { CandidateCard, type CardPerson } from "@/components/site/CandidateCard";
import { partyBadge } from "@/components/site/PersonFace";
import styles from "./candidate-directory.module.css";

export type DirectoryRace = {
  id: string;
  title: string;
  note?: string | null;
  groups: { party?: string; people: CardPerson[] }[];
};

type Election = "general" | "primary";

function matchesSeat(person: CardPerson, seat: string) {
  switch (seat) {
    case "incumbent": return person.holdsOffice;
    case "challenger": return !person.holdsOffice && !person.openSeat && !person.writeIn;
    case "open": return person.openSeat;
    case "write-in": return person.writeIn;
    case "uncontested": return person.uncontested;
    default: return true;
  }
}

export function CandidateDirectory({ general, primary, generalSources, primarySources }: {
  general: DirectoryRace[];
  primary: DirectoryRace[];
  generalSources: { url: string; name: string }[];
  primarySources: string[];
}) {
  const [election, setElection] = useState<Election>("general");
  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [seat, setSeat] = useState("");
  const races = election === "general" ? general : primary;
  const people = races.flatMap((race) => race.groups.flatMap((group) => group.people));
  const parties = Array.from(new Set(people.map((person) => partyBadge(person.party).label))).sort();
  const query = name.trim().toLowerCase();
  const matches = races.map((race) => ({
    ...race,
    groups: race.groups.map((group) => ({
      ...group,
      people: group.people.filter((person) =>
        person.name.toLowerCase().includes(query) &&
        (!party || partyBadge(person.party).label === party) && matchesSeat(person, seat),
      ),
    })).filter((group) => group.people.length > 0),
  })).filter((race) => race.groups.length > 0);
  const count = matches.reduce((sum, race) => sum + race.groups.reduce((total, group) => total + group.people.length, 0), 0);

  return (
    <>
      {primary.length > 0 ? (
        <fieldset className={styles.election}>
          <legend className="sr-only">Election</legend>
          {([ ["primary", "Primary · May 19"], ["general", "General · Nov 3"] ] as const).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="election" value={value} checked={election === value} onChange={() => {
                setElection(value);
                setParty("");
                setSeat("");
              }} />
              {label}
            </label>
          ))}
        </fieldset>
      ) : null}
      <search className={styles.filters} aria-label="Filter candidates">
        <div>
          <label htmlFor="candidate-name">Name</label>
          <input type="search" id="candidate-name" name="name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="candidate-party">Party</label>
          <select id="candidate-party" name="party" value={party} onChange={(event) => setParty(event.target.value)}>
            <option value="">All parties</option>
            {parties.map((label) => <option key={label}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="candidate-seat">Seat status</label>
          <select id="candidate-seat" name="seat" value={seat} onChange={(event) => setSeat(event.target.value)}>
            <option value="">All statuses</option>
            <option value="incumbent">Current officeholder</option>
            <option value="challenger">Challenger</option>
            <option value="open">Open seat</option>
            {people.some((person) => person.writeIn) ? <option value="write-in">Write-in</option> : null}
            {people.some((person) => person.uncontested) ? <option value="uncontested">Uncontested</option> : null}
          </select>
        </div>
      </search>
      <p className="sr-only" role="status">{count} {count === 1 ? "candidate" : "candidates"}</p>
      {count === 0 ? <p>No candidates match.</p> : null}
      {matches.length > 0 ? (
        <nav className="chip-row" aria-label="Jump to a race">
          {matches.map((race) => (
            <a key={race.id} className="chip" aria-label={race.title} href={`#${race.id}`}>{race.title.replace("U.S. House ", "")}</a>
          ))}
        </nav>
      ) : null}
      {matches.map((race) => (
        <section key={race.id} id={race.id} className="race-cards" aria-labelledby={`${race.id}-heading`}>
          <div className="section-head">
            <h2 id={`${race.id}-heading`}>{race.title}</h2>
            <Link className="section-more" href={`/races/${race.id}`}>Race details <span aria-hidden="true">→</span></Link>
          </div>
          {race.note ? <p className="hint">{race.note}</p> : null}
          {race.groups.map((group) => (
            <div key={group.party ?? "general"}>
              {group.party ? <h3>{group.party}</h3> : null}
              <ul className="cand-grid">
                {group.people.map((person) => <CandidateCard key={person.id} person={person} />)}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <p className="hint">
        {(election === "general" ? generalSources : primarySources.map((url, index) => ({
          url,
          name: `KY State Board of Elections${primarySources.length > 1 ? ` (${index + 1})` : ""}`,
        }))).map(({ url, name }, index) => (
          <span key={url}>{index > 0 ? " · " : null}<a href={url}>{name}</a></span>
        ))}
      </p>
    </>
  );
}
