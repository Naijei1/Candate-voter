import type { Metadata } from "next";
import { SAMPLE_MEASURE } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: SAMPLE_MEASURE.title };

export default function SampleMeasurePage() {
  const measure = SAMPLE_MEASURE;
  return (
    <article className="wrap">
      <p>
        <StatusMark kind="sample" />
        {measure.eyebrow}
      </p>
      <h1>{measure.title}</h1>
      <section>
        <h2>Official title</h2>
        <p>{measure.officialTitle}</p>
      </section>
      <section>
        <h2>Plain English</h2>
        <p>{measure.plain}</p>
      </section>
      <section>
        <h2>What a yes vote means</h2>
        <p>{measure.yes}</p>
      </section>
      <section>
        <h2>What a no vote means</h2>
        <p>{measure.no}</p>
      </section>
      <section>
        <h2>Arguments</h2>
        <h3>Supporters</h3>
        <p>
          <StatusMark kind="sample" />
          {measure.support}
        </p>
        <h3>Opponents</h3>
        <p>
          <StatusMark kind="sample" />
          {measure.oppose}
        </p>
      </section>
      <section>
        <h2>Fiscal estimate</h2>
        <p>{measure.fiscal}</p>
      </section>
    </article>
  );
}
