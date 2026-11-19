import { PersonMark } from "@/components/site/PersonMark";
import { partyBadge } from "@/components/site/PersonFace";
import { calendarDay } from "@/lib/site/ky-ballot";
import { KY_STATEWIDE_CHECKED, type StatewideOfficial } from "@/lib/site/ky-statewide";

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
        <p className="official-term">{person.term}</p>
        {person.note ? <p className="official-term">{person.note}</p> : null}
        <details className="official-sources">
          <summary>Sources</summary>
          <ul>
            {person.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url}>{source.name}</a>
              </li>
            ))}
            {person.photo ? (
              <li>
                Photo: <a href={person.photo.sourceUrl}>{person.photo.credit}</a> ({person.photo.license})
              </li>
            ) : null}
          </ul>
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
      <p className="hint">Elected statewide. These offices were not on the 2026 ballot.</p>
      <ul className="official-grid">
        {officers.map((person) => (
          <OfficialCard key={person.id} person={person} />
        ))}
      </ul>
      <p className="hint">
        Checked {calendarDay(KY_STATEWIDE_CHECKED)} on each office&apos;s official site. Photos appear only when the license is clear;
        other cards show initials.
      </p>
    </div>
  );
}
