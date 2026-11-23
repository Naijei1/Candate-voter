import { dayLabel } from "@/lib/format";
import type { RaceChange } from "@/lib/site/race-changes";

const VISIBLE = 6;

export function RaceChanges({ events }: { events: readonly RaceChange[] }) {
  if (events.length === 0) return null;
  const head = events.slice(0, VISIBLE);
  const rest = events.slice(VISIBLE);
  return (
    <section className="race-changes" aria-labelledby="what-changed">
      <h2 id="what-changed">What changed</h2>
      <ol className="change-list">
        {head.map((event) => <Change key={event.id} event={event} />)}
      </ol>
      {rest.length > 0 ? (
        <details className="more">
          <summary>Earlier ({rest.length})</summary>
          <ol className="change-list">
            {rest.map((event) => <Change key={event.id} event={event} />)}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

function Change({ event }: { event: RaceChange }) {
  return (
    <li>
      <time dateTime={event.date}>{dayLabel(event.date)}</time>
      <p>{event.text} <a href={event.sourceUrl}>{event.sourceName}</a></p>
    </li>
  );
}
