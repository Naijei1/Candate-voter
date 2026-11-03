import type { Metadata } from "next";
import Link from "next/link";
import { stateOptions } from "@/lib/data/states";
import { MEASURE_KINDS } from "@/lib/site/measure-kinds";

export const metadata: Metadata = { title: "Ballot measures" };

export default function MeasuresIndexPage() {
  const states = stateOptions().filter((state) => state.postal !== "KY");
  return (
    <article className="wrap">
      <h1>Ballot questions</h1>
      <p className="lede">No certified question is loaded yet. Kentucky is the only state with a page ready.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
      <h2>Kentucky</h2>
      <p>Proposition, referendum, and retention pages are ready. No question text is loaded.</p>
      <ul className="plain-list">
        {MEASURE_KINDS.map((kind) => (
          <li key={kind.id}>
            <Link href={`/measures/ky/${kind.id}`}>{kind.label}</Link>
          </li>
        ))}
      </ul>
      <details>
        <summary>Other states are not covered yet</summary>
        <ul className="state-list">
          {states.map((state) => (
            <li key={state.postal}>
              <Link href={`/measures/${state.postal.toLowerCase()}`}>{state.name}</Link>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
