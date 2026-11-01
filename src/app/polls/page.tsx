import type { Metadata } from "next";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Polls and Analysis" };

export default function PollsPage() {
  return (
    <article className="wrap">
      <h1>Polls and analysis</h1>
      <p>No qualifying polls available for the Kentucky pilot contests.</p>
      <p>
        When a poll is shown it will name the pollster, sponsor, field dates, population, sample
        size, methodology, and margin of error where the source reports them. An average would
        publish its rules. A single poll, an average, and a forecast will not be drawn as the same
        thing.
      </p>
      <section className="card">
        <h2>
          <StatusMark kind="sample" />
          How an analysis card will look
        </h2>
        <p>
          A theme summary would name the date range, the source set, and how many speeches were
          included. This card does not analyze any speeches. It is not a claim about a party.
        </p>
      </section>
    </article>
  );
}
