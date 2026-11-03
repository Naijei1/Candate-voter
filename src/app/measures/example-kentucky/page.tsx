import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Example ballot question" };

export default function SampleMeasurePage() {
  return (
    <article className="wrap">
      <p className="notice">Example only. This is not a Kentucky ballot question and not official text.</p>
      <h1>Example question</h1>
      <p className="lede">A layout for a future certified question. No Kentucky measure text is stored.</p>
      <h2>Plain-language summary</h2>
      <p>This sample asks whether a made-up city fund would pay for park repairs. It is not on any ballot.</p>
      <h2>A yes vote</h2>
      <p>In this example, yes would create the sample fund. That is not a real effect.</p>
      <h2>A no vote</h2>
      <p>In this example, no would leave the sample fund uncreated. That is not a real effect.</p>
      <h2>Arguments</h2>
      <p>No supporter or opponent statement is stored, because this question is not real.</p>
      <h2>Money</h2>
      <p>No fiscal estimate is stored.</p>
      <p>
        <Link className="btn btn-navy" href="/measures">
          Back to ballot questions
        </Link>
      </p>
    </article>
  );
}
