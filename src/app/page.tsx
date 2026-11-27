import Link from "next/link";
import { ExtLink } from "@/components/tv/ExtLink";
import { Face, PartyTag, SectionHead } from "@/components/tv/bits";
import { Hero } from "@/components/tv/Hero";
import { Icon } from "@/components/tv/Icon";
import { StateExplorer } from "@/components/tv/StateExplorer";
import { profileFor } from "@/lib/site/profiles";
import { stateConfig } from "@/lib/states";
import { featured } from "@/lib/tv/featured";
import { allRaces, defaultPair, isOfficialSource, type PersonView } from "@/lib/tv/people";

export const revalidate = 3600;

const SOURCES = [
  "Kentucky State Board of Elections",
  "Kentucky Secretary of State",
  "Federal Election Commission",
  "Clerk of the U.S. House",
  "U.S. Census Bureau",
];

/** Most recent checked public office, e.g. "U.S. representative, District 6, since 2013". */
function experience(person: PersonView, stateName: string, year: number): string | null {
  const entry = profileFor(person.id)
    .career.filter((row) => !/^candidate for\b/i.test(row.text) && row.endYear && isOfficialSource(row.sourceName, row.sourceUrl))
    .sort((a, b) => b.startYear - a.startYear)[0];
  if (!entry) return null;
  const text = entry.text.replace(` · ${stateName} `, ", ");
  const years = entry.endYear && entry.endYear <= year ? `${entry.startYear}–${entry.endYear}` : `since ${entry.startYear}`;
  return `${text}, ${years}`;
}

export default function HomePage() {
  const state = stateConfig();
  const senate = allRaces(state).find((race) => race.office === "senate");
  const pair = senate ? defaultPair(senate) : null;
  const year = new Date().getFullYear();
  return (
    <>
      <Hero />

      <section className="band" aria-labelledby="h-how">
        <div className="wrap how-g">
          <div>
            <h2 id="h-how" className="sec-t">
              How it works
            </h2>
            <ol className="steps">
              <li>
                <span className="sn" aria-hidden="true">
                  1
                </span>
                <div>
                  <h3>Find your election</h3>
                  <p>Pick your county.</p>
                </div>
              </li>
              <li>
                <span className="sn" aria-hidden="true">
                  2
                </span>
                <div>
                  <h3>Compare your options</h3>
                  <p>Side by side.</p>
                </div>
              </li>
              <li>
                <span className="sn" aria-hidden="true">
                  3
                </span>
                <div>
                  <h3>Follow updates</h3>
                  <p>Saved on this device.</p>
                </div>
              </li>
            </ol>
          </div>
          {senate && pair ? (
            <figure className="mc" aria-labelledby="mc-cap">
              <figcaption id="mc-cap" className="mc-cap">
                Preview: {senate.title}
              </figcaption>
              <div className="mc-r mc-head">
                <span className="mc-k" />
                {pair.map((person) => (
                  <div className="mc-p" key={person.id}>
                    <Face person={person} size="lg" eager />
                    <span>
                      <b>{person.name}</b>
                      <PartyTag party={person.party} size="sm" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mc-r">
                <span className="mc-k">Role</span>
                {pair.map((person) => (
                  <span key={person.id}>{person.role}</span>
                ))}
              </div>
              <div className="mc-r">
                <span className="mc-k">Experience</span>
                {pair.map((person) => (
                  <span key={person.id}>{experience(person, state.name, year) ?? <span className="none">Not in our records</span>}</span>
                ))}
              </div>
              <Link className="mc-go" href={`/races/${senate.raceId}/compare?a=${pair[0].id}&b=${pair[1].id}`}>
                Full comparison
                <Icon name="right" size="sm" />
              </Link>
            </figure>
          ) : null}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="h-feat">
        <SectionHead id="h-feat" title="Featured" more={{ href: "/news", label: "News" }} />
        <ul className="frow">
          {featured().map((item) => (
            <li key={item.label}>
              <b>{item.label}</b>
              <Link href={item.href}>{item.text}</Link>
              <span className="fs">
                <ExtLink className="xl" href={item.source.url} icon>
                  {item.source.label}
                </ExtLink>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap section" aria-labelledby="h-map">
        <SectionHead id="h-map" title="Explore by state" />
        <details className="allstates">
          <summary className="btn outline">See all states</summary>
          <StateExplorer id="homelist" />
        </details>
      </section>

      <section className="band trust" aria-labelledby="h-trust">
        <div className="wrap trust-g">
          <div>
            <h2 id="h-trust" className="sec-t sm">
              Where our facts come from
            </h2>
          </div>
          <ul className="srcs">
            {SOURCES.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="trust-l">
            <Link href="/sources">All sources</Link>
          </p>
        </div>
      </section>
    </>
  );
}
