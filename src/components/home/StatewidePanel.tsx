import { PersonMark } from "@/components/site/PersonMark";
import { partyBadge } from "@/components/site/PersonFace";
import { type StatewideOfficial } from "@/lib/site/ky-statewide";

export function OfficialCard({ person }: { person: StatewideOfficial }) {
  const badge = partyBadge(person.party);
  return (
    <li className="official-card">
      <PersonMark name={person.name} photo={person.photo?.src ?? null} party={person.party} size="sm" />
      <div className="official-copy">
        <p className="official-office">{person.office}</p>
        <h4 className="official-name">
          <a href={person.officialSite}>{person.name}</a>
        </h4>
        <p className="official-meta">
          <span className={`party-badge ${badge.tone}`}>{badge.label}</span>
        </p>
        <details className="official-sources">
          <summary>Sources</summary>
          {person.sources.map((source, i) => (
            <span key={source.url}>
              {i ? " · " : ""}<a href={source.url}>{source.name} ↗</a>
            </span>
          ))}
        </details>
      </div>
    </li>
  );
}

export function StatewidePanel({
  senators,
  officers,
}: {
  senators: readonly StatewideOfficial[];
  officers: readonly StatewideOfficial[];
}) {
  return (
    <div className="statewide" data-testid="statewide-panel">
      <h3>U.S. senators for Kentucky</h3>
      <ul className="official-grid">
        {senators.map((person) => (
          <OfficialCard key={person.id} person={person} />
        ))}
      </ul>
      <h3>Kentucky statewide officers</h3>
      <ul className="official-grid">
        {officers.map((person) => (
          <OfficialCard key={person.id} person={person} />
        ))}
      </ul>
    </div>
  );
}
