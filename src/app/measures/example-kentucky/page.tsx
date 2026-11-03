import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Ballot question" };

export default function SampleMeasurePage() {
  return (
    <article className="wrap">
      <h1>Ballot question</h1>
      <p className="lede">No certified question is loaded yet. This page does not show a sample question.</p>
      <p>
        <Link className="btn btn-navy" href="/measures">
          Back to ballot questions
        </Link>
      </p>
    </article>
  );
}
