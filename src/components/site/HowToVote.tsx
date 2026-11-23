import { dayLabel } from "@/lib/format";
import { KY_POLLS } from "@/lib/site/ky-ballot";
import { stateConfig } from "@/lib/states";
import styles from "./reading.module.css";

/** Election Day and the official registration lookup. Other methods stay off until a sourced deadline is stored. */
export function HowToVote() {
  const state = stateConfig();
  return (
    <section aria-labelledby="how-to-vote">
      <h2 id="how-to-vote">How to vote</h2>
      <ul className={styles.voteCards}>
        <li>
          <h3>Election Day</h3>
          <p><strong>{KY_POLLS.hours}</strong></p>
          <p>General election <time dateTime={state.generalElection}>{dayLabel(state.generalElection)}</time>.</p>
          <a href={KY_POLLS.hoursUrl}>KY State Board of Elections ↗</a>
        </li>
        <li>
          <h3>Check your registration</h3>
          <p>Look up your registration on the official site.</p>
          <a href={KY_POLLS.lookupUrl}>{KY_POLLS.lookupLabel}</a>
        </li>
      </ul>
    </section>
  );
}
