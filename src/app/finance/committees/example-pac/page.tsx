import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLE_PAC } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: SAMPLE_PAC.name };

export default function ExamplePacPage() {
  const pac = SAMPLE_PAC;
  return (
    <article className="wrap">
      <p>
        <Link href="/finance">Campaign finance</Link>
      </p>
      <p>
        <StatusMark kind="sample" />
        Demonstration committee. Not a registered PAC and not linked to a real candidate.
      </p>
      <h1>{pac.name}</h1>
      <p>Committee type: {pac.type}</p>
      <h2>Disclosed funding</h2>
      <p>{pac.funding}</p>
      <h2>Direct contributions</h2>
      <p>{pac.direct}</p>
      <h2>Spending about candidates</h2>
      <p>{pac.outside}</p>
      <h2>Who it supports or opposes</h2>
      <p>{pac.relationship}</p>
      <h2>What it is saying</h2>
      <p>
        Advertisements, endorsements, and posts would be quoted with a date and a source. None are
        on file for this sample.
      </p>
    </article>
  );
}
