import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/site/Crumbs";
import { StatusMark } from "@/components/site/StatusMark";
import { SAMPLE_MEASURE } from "@/content/pilot";

export const metadata: Metadata = { title: SAMPLE_MEASURE.title };

export default function SampleMeasurePage() {
  const measure = SAMPLE_MEASURE;
  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/states/ky", label: "Kentucky" },
          { label: "Measure" },
        ]}
      />
      <p>
        <StatusMark kind="sample" /> {measure.eyebrow}
      </p>
      <h1>{measure.title}</h1>
      <p className="lede">{measure.officialTitle}</p>
      <p>{measure.plain}</p>
      <div className="card-grid">
        <section className="card">
          <h2>Yes</h2>
          <p>{measure.yes}</p>
        </section>
        <section className="card">
          <h2>No</h2>
          <p>{measure.no}</p>
        </section>
      </div>
      <ul className="plain-list">
        <li>Supporters: {measure.support}</li>
        <li>Opponents: {measure.oppose}</li>
        <li>Fiscal: {measure.fiscal}</li>
      </ul>
      <p>
        <Link href="/states/ky">Back to Kentucky</Link>
      </p>
    </article>
  );
}
