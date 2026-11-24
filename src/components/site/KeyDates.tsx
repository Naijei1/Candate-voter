import { KY_ELECTION_CALENDAR } from "@/lib/site/certified-results";
import { KY_POLLS } from "@/lib/site/ky-ballot";
import { calendarDay, dayLabel } from "@/lib/format";
import { stateConfig } from "@/lib/states";
import styles from "./reading.module.css";

export function KeyDates({ now = new Date() }: { now?: Date }) {
  const today = calendarDay(now);
  const upcoming = KY_ELECTION_CALENDAR.find((item) => item.date >= today)?.date;
  const official = stateConfig().results.official;
  return (
    <section aria-labelledby="key-dates">
      <h2 id="key-dates">Key dates</h2>
      <ol className={styles.dates}>
        {KY_ELECTION_CALENDAR.map((item) => {
          const past = item.date < today;
          const next = item.date === upcoming;
          return (
            <li key={item.date} className={past ? styles.past : next ? styles.next : undefined}>
              <span className={styles.mark} aria-hidden="true" />
              <span>
                <time className={styles.dateLabel} dateTime={item.date}>{dayLabel(item.date)}</time>
                {" "}
                {item.label}
                {next ? " · Next" : null}
                {item.label.toLowerCase().includes("certification") ? <> · <a href={official.href}>See official results</a></> : null}
                {" · "}
                <a href={item.sourceUrl}>{item.sourceName}</a>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="hint">Polls: {KY_POLLS.hours}. <a href={KY_POLLS.hoursUrl}>KY State Board of Elections ↗</a></p>
    </section>
  );
}
