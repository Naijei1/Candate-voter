import { dayLabel } from "@/lib/format";
import { KY_ELECTION_CALENDAR } from "@/lib/site/certified-results";
import { stateConfig } from "@/lib/states";

const FACTS = [
  { test: (label: string) => label === "General election", short: "General election" },
  { test: (label: string) => /certification deadline/i.test(label), short: "Certification deadline" },
  { test: (label: string) => /terms begin/i.test(label), short: "Terms begin" },
] as const;

function factWhen(iso: string, cycle: number): string {
  const label = dayLabel(iso);
  return iso.startsWith(`${cycle}-`) ? label.replace(/, \d{4}$/, "") : label;
}

/** Three dated facts from the state's calendar. Not a results or margin strip. */
export function DatedFacts() {
  const state = stateConfig();
  const facts = FACTS.flatMap((fact) => {
    const event = KY_ELECTION_CALENDAR.find((item) => fact.test(item.label));
    return event ? [{ ...event, short: fact.short }] : [];
  });
  if (facts.length === 0) return null;
  return (
    <ul className="fact-strip" aria-label="Election dates">
      {facts.map((fact) => (
        <li key={fact.date}>
          <a className="fact-link" href={fact.sourceUrl}>
            <time dateTime={fact.date}>{factWhen(fact.date, state.cycle)}</time>
            <span>{fact.short}</span>
            <span className="fact-source">{fact.sourceName}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
