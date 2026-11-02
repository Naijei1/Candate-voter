import type { Metadata } from "next";
import Link from "next/link";
import { StatusMark } from "@/components/site/StatusMark";
import { stateOptions } from "@/lib/data/states";
import { MEASURE_KINDS } from "@/lib/site/measure-kinds";

export const metadata: Metadata = { title: "Ballot measures" };

export default function MeasuresIndexPage() {
  const states = stateOptions();
  return (
    <article className="wrap">
      <h1>Ballot measures</h1>
      <p className="lede">
        <StatusMark kind="awaiting" /> No certified question is loaded. Kentucky is the pilot template.
      </p>
      <h2>Kinds</h2>
      <ul className="plain-list">
        {MEASURE_KINDS.map((kind) => (
          <li key={kind.id}>
            <Link href={`/measures/ky/${kind.id}`}>{kind.label}</Link>
          </li>
        ))}
      </ul>
      <h2>States</h2>
      <ul className="state-list">
        {states.map((state) => (
          <li key={state.postal}>
            <Link href={`/measures/${state.postal.toLowerCase()}`}>{state.name}</Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
